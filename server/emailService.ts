import nodemailer from 'nodemailer';

export interface EmailPayload {
  to: string;
  recipientName: string;
  type: 'APPROVED' | 'REJECTED';
  paymentReference: string;
  candidateName: string;
  candidateState: string;
  voteQuantity: number;
  expectedAmount: number;
  rejectionReason?: string;
  approvedAt?: string;
  rejectedAt?: string;
  appUrl?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  deliveredVia: 'SMTP' | 'SYSTEM_LOG';
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
  }
  return null;
}

export async function sendVoteStatusEmail(payload: EmailPayload): Promise<EmailSendResult> {
  const appUrl = payload.appUrl || process.env.APP_URL || 'https://chc-benin-voting.org';
  const fromEmail = process.env.SMTP_FROM || '"Christ Holy Church Int\'l" <notifications@chcbenin.org>';

  if (payload.type === 'APPROVED') {
    const subject = `✅ Vote Approved (${payload.voteQuantity} Votes) — Christ Holy Church Int'l [Ref: ${payload.paymentReference}]`;
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vote Approved</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <!-- Header -->
    <tr>
      <td style="background-color: #1e3a8a; padding: 28px 24px; text-align: center;">
        <h1 style="color: #ffffff; font-size: 20px; font-weight: 800; margin: 0; letter-spacing: 0.5px;">
          CHRIST HOLY CHURCH INT'L
        </h1>
        <p style="color: #93c5fd; font-size: 12px; margin: 6px 0 0 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
          No. 2 Benin Ambassadorship Contest
        </p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 32px 24px;">
        <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: center;">
          <h2 style="color: #065f46; font-size: 18px; margin: 0 0 6px 0; font-weight: 700;">
            🎉 Your Vote Has Been Approved!
          </h2>
          <p style="color: #047857; font-size: 13px; margin: 0;">
            Your bank transfer was verified and your votes have been credited to the official live leaderboard.
          </p>
        </div>

        <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
          Dear <strong>${payload.recipientName || 'Supporter'}</strong>,
        </p>
        <p style="font-size: 14px; line-height: 1.6; margin: 0 0 20px 0; color: #475569;">
          Thank you for participating in the Ambassadorship Crown Contest. We have confirmed your payment and successfully allocated your votes:
        </p>

        <!-- Details Card -->
        <table width="100%" cellpadding="10" cellspacing="0" style="background-color: #f1f5f9; border-radius: 12px; margin-bottom: 24px; font-size: 13px;">
          <tr>
            <td style="color: #64748b; width: 40%; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Contestant:</td>
            <td style="color: #0f172a; font-weight: 800; border-bottom: 1px solid #e2e8f0;">${payload.candidateName} (${payload.candidateState})</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Votes Allocated:</td>
            <td style="color: #047857; font-weight: 800; font-size: 15px; border-bottom: 1px solid #e2e8f0;">${payload.voteQuantity} Votes</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Amount Paid:</td>
            <td style="color: #0f172a; font-weight: 700; border-bottom: 1px solid #e2e8f0;">₦${payload.expectedAmount.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Reference Code:</td>
            <td style="color: #1e3a8a; font-weight: 700; font-family: monospace; font-size: 14px; border-bottom: 1px solid #e2e8f0;">${payload.paymentReference}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600;">Approved Date:</td>
            <td style="color: #0f172a; font-weight: 600;">${payload.approvedAt ? new Date(payload.approvedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : new Date().toLocaleString()}</td>
          </tr>
        </table>

        <!-- CTA Button -->
        <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 28px auto;">
          <tr>
            <td align="center" style="border-radius: 10px; background-color: #1e3a8a;">
              <a href="${appUrl}" target="_blank" style="font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none; padding: 12px 28px; display: inline-block;">
                View Live Leaderboard & Results
              </a>
            </td>
          </tr>
        </table>

        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 24px 0 0 0; line-height: 1.5;">
          May God bless your generous support towards the youth ministry and youth development of Christ Holy Church International.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 18px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
        <p style="margin: 0 0 4px 0;"><strong>Christ Holy Church International (No. 2 Benin Region)</strong></p>
        <p style="margin: 0;">For inquiries or support: Contact 09017311644 or medicreceptor@gmail.com</p>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    const text = `CHRIST HOLY CHURCH INTERNATIONAL - VOTE APPROVED\n\nDear ${payload.recipientName || 'Supporter'},\n\nYour vote submission has been APPROVED!\n\nDetails:\n- Candidate: ${payload.candidateName} (${payload.candidateState})\n- Votes Added: ${payload.voteQuantity}\n- Amount: ₦${payload.expectedAmount.toLocaleString()}\n- Reference: ${payload.paymentReference}\n- Status: APPROVED\n\nThank you for supporting Christ Holy Church International No. 2 Benin Youth Ambassadorship!\nView results: ${appUrl}\n`;

    return deliverEmail(payload.to, subject, html, text);
  } else {
    // REJECTED email
    const subject = `⚠️ Update on your vote submission — Christ Holy Church Int'l [Ref: ${payload.paymentReference}]`;
    const reasonText = payload.rejectionReason || 'Payment could not be verified in the bank records.';
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vote Submission Update</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <!-- Header -->
    <tr>
      <td style="background-color: #1e3a8a; padding: 28px 24px; text-align: center;">
        <h1 style="color: #ffffff; font-size: 20px; font-weight: 800; margin: 0; letter-spacing: 0.5px;">
          CHRIST HOLY CHURCH INT'L
        </h1>
        <p style="color: #93c5fd; font-size: 12px; margin: 6px 0 0 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
          No. 2 Benin Ambassadorship Contest
        </p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 32px 24px;">
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
          <h2 style="color: #991b1b; font-size: 17px; margin: 0 0 8px 0; font-weight: 700;">
            ⚠️ Notice Regarding Your Vote Submission
          </h2>
          <p style="color: #b91c1c; font-size: 13px; margin: 0; line-height: 1.5;">
            Our audit administrators were unable to verify the bank transfer for your vote submission.
          </p>
        </div>

        <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
          Dear <strong>${payload.recipientName || 'Supporter'}</strong>,
        </p>
        <p style="font-size: 14px; line-height: 1.6; margin: 0 0 20px 0; color: #475569;">
          We reviewed your recent vote request for <strong>${payload.candidateName}</strong> (${payload.candidateState}). Unfortunately, this transaction was <strong>not approved</strong> for the following reason:
        </p>

        <!-- Rejection Reason Box -->
        <div style="background-color: #fff1f2; border-left: 4px solid #e11d48; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #9f1239; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">
            Reason for Non-Verification:
          </span>
          <p style="font-size: 14px; font-weight: 700; color: #881337; margin: 0; line-height: 1.5;">
            "${reasonText}"
          </p>
        </div>

        <!-- Transaction Details -->
        <table width="100%" cellpadding="10" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px; margin-bottom: 24px; font-size: 13px; border: 1px solid #e2e8f0;">
          <tr>
            <td style="color: #64748b; width: 40%; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Reference Code:</td>
            <td style="color: #1e3a8a; font-weight: 700; font-family: monospace; font-size: 14px; border-bottom: 1px solid #e2e8f0;">${payload.paymentReference}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Target Candidate:</td>
            <td style="color: #0f172a; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${payload.candidateName}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Attempted Votes:</td>
            <td style="color: #0f172a; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${payload.voteQuantity} Votes (₦${payload.expectedAmount.toLocaleString()})</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600;">Reviewed On:</td>
            <td style="color: #0f172a; font-weight: 600;">${payload.rejectedAt ? new Date(payload.rejectedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : new Date().toLocaleString()}</td>
          </tr>
        </table>

        <!-- What to do next -->
        <div style="background-color: #f1f5f9; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
          <h3 style="font-size: 13px; font-weight: 700; color: #1e293b; margin: 0 0 8px 0;">
            What should you do next?
          </h3>
          <ul style="font-size: 12px; color: #475569; margin: 0; padding-left: 18px; line-height: 1.6;">
            <li>If you have already debited your account, please check if your bank reversed the transaction.</li>
            <li>You may re-initiate a new vote with the correct payment receipt on the portal.</li>
            <li>If you believe this rejection was an error, please reach out directly to the electoral committee with your payment receipt.</li>
          </ul>
        </div>

        <!-- CTA Button -->
        <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 28px auto;">
          <tr>
            <td align="center" style="border-radius: 10px; background-color: #1e3a8a;">
              <a href="${appUrl}" target="_blank" style="font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none; padding: 12px 28px; display: inline-block;">
                Visit Voting Portal
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 18px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
        <p style="margin: 0 0 4px 0;"><strong>Christ Holy Church International (No. 2 Benin Region)</strong></p>
        <p style="margin: 0;">Support Hotline: 09017311644 | Email: medicreceptor@gmail.com</p>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    const text = `CHRIST HOLY CHURCH INTERNATIONAL - VOTE REJECTED\n\nDear ${payload.recipientName || 'Supporter'},\n\nYour vote submission for ${payload.candidateName} (Ref: ${payload.paymentReference}) could not be verified.\n\nREASON FOR REJECTION:\n"${reasonText}"\n\nAttempted Votes: ${payload.voteQuantity}\nExpected Amount: ₦${payload.expectedAmount.toLocaleString()}\n\nIf you have already made the transfer, please contact support at 09017311644 or medicreceptor@gmail.com.\nVoting portal: ${appUrl}\n`;

    return deliverEmail(payload.to, subject, html, text);
  }
}

/**
 * Convenience helper to send an approval transactional email
 */
export async function sendApprovalEmail(params: Omit<EmailPayload, 'type'>): Promise<EmailSendResult> {
  return sendVoteStatusEmail({
    ...params,
    type: 'APPROVED',
  });
}

/**
 * Convenience helper to send a rejection transactional email with the specific reason
 */
export async function sendRejectionEmail(
  params: Omit<EmailPayload, 'type'> & { rejectionReason: string }
): Promise<EmailSendResult> {
  return sendVoteStatusEmail({
    ...params,
    type: 'REJECTED',
  });
}

/**
 * Verifies SMTP connection configuration
 */
export async function verifySmtpConnection(): Promise<{ configured: boolean; connected: boolean; error?: string }> {
  const transporter = getTransporter();
  if (!transporter) {
    return {
      configured: false,
      connected: false,
    };
  }

  try {
    await transporter.verify();
    return {
      configured: true,
      connected: true,
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      error: err.message || 'Failed to verify SMTP connection',
    };
  }
}

async function deliverEmail(to: string, subject: string, html: string, text: string): Promise<EmailSendResult> {
  const transporter = getTransporter();
  const fromEmail = process.env.SMTP_FROM || '"Christ Holy Church Int\'l" <notifications@chcbenin.org>';

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: fromEmail,
        to,
        subject,
        text,
        html,
      });
      console.log(`[Email Service] SMTP email sent to ${to}: ${info.messageId}`);
      return {
        success: true,
        messageId: info.messageId,
        deliveredVia: 'SMTP',
      };
    } catch (err: any) {
      console.error(`[Email Service] SMTP error sending to ${to}:`, err.message);
      return {
        success: false,
        error: err.message,
        deliveredVia: 'SMTP',
      };
    }
  }

  // If no SMTP configured, log with rich information for system record
  console.log(`[Email Service] [SIMULATED/RECORDED] Email to: ${to} | Subject: "${subject}"`);
  return {
    success: true,
    messageId: `sim-${Date.now()}`,
    deliveredVia: 'SYSTEM_LOG',
  };
}
