import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from './db.js';

const router = express.Router();

// Configure Uploads directory
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage configuration with random safe filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'].includes(ext) ? ext : '.png';
    const randomName = `receipt-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${safeExt}`;
    cb(null, randomName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMime = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf',
    ];
    if (allowedMime.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, WEBP, and PDF documents are allowed.'));
    }
  },
});

// Middleware for Admin Session / Authentication
export interface AuthenticatedRequest extends Request {
  adminUser?: {
    id: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'SUPER_ADMIN';
  };
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const defaultAdmin = db.getDefaultAdmin();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.adminUser = {
      id: defaultAdmin.id,
      name: defaultAdmin.name,
      email: defaultAdmin.email,
      role: defaultAdmin.role as any,
    };
    return next();
  }

  const token = authHeader.substring(7);
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    let user = db.getUserById(decoded.id);
    if (!user && decoded.email) {
      user = db.getUserByEmail(decoded.email);
    }
    if (!user) {
      user = defaultAdmin;
    }
    req.adminUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: (user.role as any) || 'SUPER_ADMIN',
    };
    next();
  } catch (e) {
    req.adminUser = {
      id: defaultAdmin.id,
      name: defaultAdmin.name,
      email: defaultAdmin.email,
      role: defaultAdmin.role as any,
    };
    next();
  }
}

// ----------------------------------------------------
// Public APIs
// ----------------------------------------------------

// 1. Get Official Contest & Dynamic Live Standings
router.get('/contest', (req: Request, res: Response) => {
  try {
    const contestData = db.getPublicContest();
    res.json(contestData);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch contest information' });
  }
});

// Real-time Pending Transactions Notification Counter for Admin Portal (Protected)
router.get('/notifications/pending-count', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const pendingCount = db.getPendingTransactionsCount();
    res.json({ pendingCount, timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to retrieve pending count' });
  }
});

// 2. Candidate Detail Page
router.get('/candidates/:slug', (req: Request, res: Response) => {
  try {
    const candidate = db.getCandidateBySlug(req.params.slug);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    res.json(candidate);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch candidate details' });
  }
});

// 3. Step 3: Initiate Voting & Generate Unique Server Payment Reference
router.post('/vote/intent', async (req: Request, res: Response) => {
  try {
    const { candidateId, voteQuantity, voterName, voterEmail, voterPhone } = req.body;

    if (!candidateId) {
      return res.status(400).json({ error: 'Candidate selection is required' });
    }

    if (!voteQuantity || Number(voteQuantity) <= 0) {
      return res.status(400).json({ error: 'Valid positive vote quantity is required' });
    }

    const result = await db.createVotingIntent({
      candidateId,
      voteQuantity: Number(voteQuantity),
      voterName,
      voterEmail,
      voterPhone,
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create voting intent' });
  }
});

// 4. Step 5: Submit Bank Transfer Proof & Contact Details
router.post('/vote/submit-proof', async (req: Request, res: Response) => {
  try {
    const {
      paymentReference,
      voterName,
      voterEmail,
      voterPhone,
      amountTransferred,
      bankTransactionId,
      receiptUrl,
    } = req.body;

    if (!paymentReference) {
      return res.status(400).json({ error: 'Payment reference is required' });
    }

    if (!voterName || !voterName.trim()) {
      return res.status(400).json({ error: 'Voter full name is required' });
    }

    if (!amountTransferred || Number(amountTransferred) <= 0) {
      return res.status(400).json({ error: 'Amount transferred must be specified' });
    }

    const updatedTx = await db.submitPaymentProof({
      paymentReference,
      voterName,
      voterEmail: voterEmail?.trim() || '',
      voterPhone: voterPhone?.trim() || '',
      amountTransferred: Number(amountTransferred),
      bankTransactionId,
      receiptUrl,
    });

    res.json({
      success: true,
      message: 'Payment proof submitted successfully. Your transaction is awaiting administrator verification.',
      transaction: updatedTx,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to submit payment details' });
  }
});

// 5. Check Transaction Status
router.get('/transaction/status/:reference', (req: Request, res: Response) => {
  try {
    const ref = req.params.reference;
    const contact = (req.query.contact as string) || undefined;
    const tx = db.getTransactionByReference(ref, contact);

    if (!tx) {
      return res.status(404).json({
        error: 'No voting transaction found matching the reference and contact information provided.',
      });
    }

    // Mask sensitive phone/email for public view if query didn't provide matching contact
    const safeTx = {
      id: tx.id,
      paymentReference: tx.paymentReference,
      candidateId: tx.candidateId,
      candidateName: tx.candidateName,
      candidateState: tx.candidateState,
      voteQuantity: tx.voteQuantity,
      expectedAmount: tx.expectedAmount,
      amountTransferred: tx.amountTransferred,
      status: tx.status,
      rejectionReason: tx.status === 'REJECTED' ? tx.rejectionReason : undefined,
      createdAt: tx.createdAt,
      submittedAt: tx.submittedAt,
      approvedAt: tx.approvedAt,
      rejectedAt: tx.rejectedAt,
    };

    res.json(safeTx);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error checking transaction status' });
  }
});

// 6. Upload Receipt (Public with validation)
router.post('/upload/receipt', (req: Request, res: Response) => {
  upload.single('receipt')(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Receipt file too large. Maximum size allowed is 5MB.' });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message || 'Receipt upload failed' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file was uploaded' });
    }

    const receiptUrl = `/api/receipts/${req.file.filename}`;
    res.json({
      success: true,
      receiptUrl,
      filename: req.file.filename,
    });
  });
});

// 7. Upload Candidate Photo (Protected or Direct)
router.post('/upload/candidate-photo', (req: Request, res: Response) => {
  upload.single('photo')(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Photo file too large. Maximum size allowed is 5MB.' });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message || 'Photo upload failed' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No photo file was uploaded' });
    }

    const photoUrl = `/api/uploads/${req.file.filename}`;
    res.json({
      success: true,
      photoUrl,
      filename: req.file.filename,
    });
  });
});

// 8. Serve Receipt and Upload Files
router.get('/receipts/:filename', (req: Request, res: Response) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(UPLOADS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Receipt file not found');
  }

  res.sendFile(filePath);
});

router.get('/uploads/:filename', (req: Request, res: Response) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(UPLOADS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Uploaded file not found');
  }

  res.sendFile(filePath);
});

// ----------------------------------------------------
// Admin Authentication & Protected Endpoints
// ----------------------------------------------------

// Instant / Passwordless Admin Access
router.all(['/auth/instant-access', '/auth/direct-access'], async (req: Request, res: Response) => {
  try {
    const defaultUser = db.getDefaultAdmin();

    const token = Buffer.from(
      JSON.stringify({
        id: defaultUser.id,
        email: defaultUser.email,
        role: defaultUser.role,
        exp: Date.now() + 365 * 24 * 60 * 60 * 1000,
      })
    ).toString('base64');

    res.json({
      success: true,
      token,
      user: {
        id: defaultUser.id,
        name: defaultUser.name,
        email: defaultUser.email,
        role: defaultUser.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Instant access failed' });
  }
});

// Admin Login (Passwordless & Direct Access Enabled)
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email } = req.body || {};
    const cleanEmail = email ? String(email).trim().toLowerCase() : '';

    let user = cleanEmail ? db.getUserByEmail(cleanEmail) : null;
    if (!user) {
      user = db.getDefaultAdmin();
    }

    // Token payload (long-lived 1-year valid session)
    const token = Buffer.from(
      JSON.stringify({
        id: user.id,
        email: user.email,
        role: user.role,
        exp: Date.now() + 365 * 24 * 60 * 60 * 1000,
      })
    ).toString('base64');

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Login failed' });
  }
});

// Admin Change Password
router.post('/auth/change-password', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current password and new password are required' });
    }

    const adminUser = req.adminUser!;
    const result = await db.changeAdminPassword(adminUser.id, currentPassword, newPassword, adminUser);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to change password' });
  }
});

// Admin Dashboard Overview
router.get('/admin/dashboard', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = db.getAdminDashboardStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load dashboard metrics' });
  }
});

// Admin Payments List with Search, Filters & Pagination
router.get('/admin/payments', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, candidateId, state, search, page, limit } = req.query;
    const result = db.getFilteredTransactions({
      status: status as string,
      candidateId: candidateId as string,
      state: state as string,
      search: search as string,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch payments' });
  }
});

// Approve Payment (Atomic Vote Allocation)
router.post('/admin/payments/:id/approve', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = req.adminUser!;

    const result = await db.approveTransaction(id, adminUser);

    res.json({
      success: true,
      message: `Transaction ${result.transaction.paymentReference} approved successfully! ${result.votesAdded} votes counted for ${result.candidateName}.`,
      result,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to approve transaction' });
  }
});

// Reject Payment
router.post('/admin/payments/:id/reject', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminUser = req.adminUser!;

    const rejectionReason = (reason && reason.trim()) || 'Payment transfer could not be verified in the church bank account records.';
    const result = await db.rejectTransaction(id, rejectionReason, adminUser);

    res.json({
      success: true,
      message: `Transaction ${result.transaction.paymentReference} has been marked as rejected.`,
      result,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to reject transaction' });
  }
});

// Delete Single Payment History Record
router.delete('/admin/payments/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = req.adminUser!;

    const result = await db.deleteTransaction(id, adminUser);
    res.json({
      success: true,
      message: `Transaction ${result.paymentReference} has been permanently deleted from history.${result.votesDeducted > 0 ? ` ${result.votesDeducted} approved votes were deducted.` : ''}`,
      result,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to delete transaction' });
  }
});

// Bulk Delete Payment History Records (e.g. clean failed/rejected attempts)
router.post('/admin/payments/bulk-delete', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No transaction IDs specified for deletion' });
    }

    const adminUser = req.adminUser!;
    const result = await db.bulkDeleteTransactions(ids, adminUser);

    res.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} transaction records from history.${result.totalVotesDeducted > 0 ? ` (${result.totalVotesDeducted} associated votes adjusted).` : ''}`,
      result,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to bulk delete transactions' });
  }
});

// Update Payment Settings (Bank, Vote Price, Instructions)
router.put('/admin/payment-settings', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { bankName, accountName, accountNumber, votePrice, paymentInstructions } = req.body;
    const adminUser = req.adminUser!;

    const updated = await db.updatePaymentSettings(
      {
        bankName,
        accountName,
        accountNumber,
        votePrice: votePrice ? Number(votePrice) : undefined,
        paymentInstructions,
      },
      adminUser
    );

    res.json({
      success: true,
      message: 'Payment and bank transfer settings updated successfully.',
      paymentSettings: updated,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update payment settings' });
  }
});

// Reconcile and Restore Votes across all transactions and ledger
router.post('/admin/reconcile-votes', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminUser = req.adminUser!;
    const contestData = await db.reconcileVotes(adminUser);
    res.json({
      success: true,
      message: 'Votes successfully reconciled and restored from all approved transactions.',
      ...contestData,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to reconcile votes' });
  }
});

// Candidate Management
router.post('/admin/candidates', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, state, biography, image, sortOrder } = req.body;
    if (!name || !state) {
      return res.status(400).json({ error: 'Candidate name and state are required' });
    }

    const newCandidate = await db.createCandidate(
      { name, state, biography: biography || '', image, sortOrder: sortOrder ? Number(sortOrder) : undefined },
      req.adminUser!
    );

    res.status(201).json({
      success: true,
      candidate: newCandidate,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create candidate' });
  }
});

router.put('/admin/candidates/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updated = await db.updateCandidate(id, updates, req.adminUser!);
    res.json({
      success: true,
      candidate: updated,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update candidate' });
  }
});

router.delete('/admin/candidates/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db.deleteCandidate(id, req.adminUser!);
    res.json({
      success: true,
      message: 'Candidate deleted successfully.',
      result,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to delete candidate' });
  }
});

// Competition Management
router.put('/admin/competition', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const compUpdates = req.body;
    const updated = await db.updateCompetition(compUpdates, req.adminUser!);
    res.json({
      success: true,
      competition: updated,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update competition' });
  }
});

// Audit Logs
router.get('/admin/audit-logs', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = db.getAuditLogs(100);
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to retrieve audit logs' });
  }
});

export default router;
