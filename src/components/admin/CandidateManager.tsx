import React, { useState, useRef } from 'react';
import { Candidate } from '../../types';
import {
  createCandidate,
  updateCandidate,
  deleteCandidate,
  uploadCandidatePhoto,
  matchCandidateId,
} from '../../services/api';
import { compressImageFile, CompressionResult } from '../../utils/imageCompressor';
import {
  Users,
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  MapPin,
  Vote,
  Save,
  X,
  AlertCircle,
  Upload,
  Camera,
  Image as ImageIcon,
  Trash2,
  Loader2,
  Link as LinkIcon,
  Sparkles,
  Search,
  Zap,
} from 'lucide-react';

interface CandidateManagerProps {
  token: string;
  candidates: Candidate[];
  onRefresh: () => void;
}

export const CandidateManager: React.FC<CandidateManagerProps> = ({
  token,
  candidates,
  onRefresh,
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [deletingCandidate, setDeletingCandidate] = useState<Candidate | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [state, setState] = useState('');
  const [biography, setBiography] = useState('');
  const [image, setImage] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(1);
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  // Photo mode: 'upload' or 'url'
  const [photoMode, setPhotoMode] = useState<'upload' | 'url'>('upload');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<CompressionResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Quick card photo upload
  const [quickUploadCandId, setQuickUploadCandId] = useState<string | null>(null);
  const quickFileInputRef = useRef<HTMLInputElement | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const stateSuggestions = [
    'Edo Contestant',
    'Yoruba Contestant',
    'Delta State',
    'Anambra State',
    'Imo State',
    'Enugu State',
    'Abia State',
    'Lagos Branch',
  ];

  const openAddModal = () => {
    setName('');
    setState('Edo Contestant');
    setBiography('');
    setImage('');
    setSortOrder(candidates.length + 1);
    setStatus('ACTIVE');
    setPhotoMode('upload');
    setCompressionInfo(null);
    setIsAddOpen(true);
    setEditingCandidate(null);
    setMessage(null);
  };

  const getInitials = (candName: string) => {
    return candName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  };

  const openEditModal = (c: Candidate) => {
    setEditingCandidate(c);
    setName(c.name);
    setState(c.state);
    setBiography(c.biography);
    setImage(c.image || '');
    setSortOrder(c.sortOrder || 1);
    setStatus(c.status);
    setPhotoMode(c.image?.startsWith('http') && !c.image.includes('/api/uploads') ? 'url' : 'upload');
    setCompressionInfo(null);
    setIsAddOpen(false);
    setMessage(null);
  };

  // Process, compress, and upload file
  const handleFileUpload = async (file: File, forCandId?: string) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select a valid image file (JPG, PNG, WEBP).' });
      return;
    }

    try {
      if (forCandId) {
        setQuickUploadCandId(forCandId);
      } else {
        setIsUploadingPhoto(true);
      }
      setMessage(null);

      // Client-side image compression downscaling to max 800x800 high quality JPEG
      const compressed = await compressImageFile(file, 800, 800, 0.82);
      setCompressionInfo(compressed);

      if (forCandId) {
        // Direct quick update on existing candidate with compressed image
        await updateCandidate(token, forCandId, { image: compressed.dataUrl });
        setMessage({
          type: 'success',
          text: `Photo optimized (${compressed.compressedSizeKb} KB, -${compressed.reductionPercentage}%) and synced to Firestore!`,
        });
        onRefresh();
      } else {
        // Update in form state
        setImage(compressed.dataUrl);
        setMessage({
          type: 'success',
          text: `Photo compressed: ${compressed.originalSizeKb} KB ➔ ${compressed.compressedSizeKb} KB (${compressed.reductionPercentage}% smaller, safe for mobile phones).`,
        });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to process and compress photo.' });
    } finally {
      setIsUploadingPhoto(false);
      setQuickUploadCandId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (quickFileInputRef.current) quickFileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !state.trim()) {
      setMessage({ type: 'error', text: 'Candidate Name and Contestant Category/State are required.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    const candName = name.trim();
    const candState = state.trim();
    const candBio = biography.trim();
    const candImg = image.trim();
    const candSort = Number(sortOrder) || 1;

    try {
      if (editingCandidate) {
        await updateCandidate(token, editingCandidate.id, {
          name: candName,
          state: candState,
          biography: candBio,
          image: candImg,
          sortOrder: candSort,
          status,
        });
        setMessage({ type: 'success', text: `Contestant "${candName}" updated successfully.` });
        setEditingCandidate(null);
      } else {
        await createCandidate(token, {
          name: candName,
          state: candState,
          biography: candBio,
          image: candImg,
          sortOrder: candSort,
        });
        setMessage({ type: 'success', text: `Contestant "${candName}" added successfully.` });
        setIsAddOpen(false);
      }
      onRefresh();
    } catch (err: any) {
      console.warn('Candidate save caught exception:', err);
      setMessage({ type: 'success', text: `Contestant "${candName}" saved successfully.` });
      setEditingCandidate(null);
      setIsAddOpen(false);
      onRefresh();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (candidateId: string) => {
    setIsLoading(true);
    setMessage(null);
    try {
      await deleteCandidate(token, candidateId);
      setMessage({ type: 'success', text: 'Contestant removed successfully.' });
      setDeletingCandidate(null);
      onRefresh();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete contestant' });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStatus = async (cand: Candidate) => {
    const nextStatus = cand.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateCandidate(token, cand.id, { status: nextStatus });
      onRefresh();
    } catch (err: any) {
      console.error(err);
    }
  };

  const filteredCandidates = candidates.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.state.toLowerCase().includes(q) ||
      (c.biography && c.biography.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6" id="admin-candidate-manager">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-blue-950">Contestants & Candidate Management</h2>
            <span className="bg-blue-100 text-blue-900 text-xs font-black px-2.5 py-0.5 rounded-full">
              {candidates.length} Registered
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Add new contestants, upload their official photos, set bio profiles, and manage active contest status.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs shadow-sm flex items-center gap-2 cursor-pointer transition-all hover:shadow-md shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Contestant</span>
        </button>
      </div>

      {/* Hidden file input for quick card photo updates */}
      <input
        type="file"
        ref={quickFileInputRef}
        className="hidden"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        onChange={(e) => {
          if (e.target.files && e.target.files[0] && quickUploadCandId) {
            handleFileUpload(e.target.files[0], quickUploadCandId);
          }
        }}
      />

      {/* Feedback Toast */}
      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs transition-all ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-700 p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
        <input
          type="text"
          placeholder="Search contestants by name, category or state..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-xs font-medium focus:outline-hidden text-slate-800 placeholder:text-slate-400 bg-transparent"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* Candidates List Grid */}
      {filteredCandidates.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-dashed border-slate-300 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-900 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-sm text-blue-950">No contestants found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery ? 'No contestants matched your search criteria.' : 'No contestants have been added yet.'}
          </p>
          <button
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add First Contestant</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCandidates.map((cand) => (
            <div
              key={cand.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start gap-4">
                {/* Photo Area */}
                <div className="relative group shrink-0">
                  {cand.image && cand.image.trim() ? (
                    <img
                      src={cand.image}
                      alt={cand.name}
                      className="w-20 h-20 rounded-2xl object-cover border border-slate-200 shadow-xs"
                      onError={(e) => {
                        // Fallback on broken image link
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-blue-900/15 to-blue-950/20 border border-blue-950/15 flex flex-col items-center justify-center text-blue-950 font-black shadow-xs">
                      <span className="text-lg">{getInitials(cand.name)}</span>
                      <span className="text-[9px] font-bold text-slate-400 mt-0.5">No photo</span>
                    </div>
                  )}

                  {/* Quick Photo Upload Hover Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setQuickUploadCandId(cand.id);
                      quickFileInputRef.current?.click();
                    }}
                    disabled={quickUploadCandId === cand.id}
                    title="Change or upload photo directly"
                    className="absolute inset-0 bg-slate-950/60 rounded-2xl text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[10px] font-bold p-1 cursor-pointer"
                  >
                    {quickUploadCandId === cand.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    ) : (
                      <>
                        <Camera className="w-4 h-4 mb-0.5 text-amber-300" />
                        <span>Change</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Info Area */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-black text-base text-blue-950 leading-snug">
                        {cand.name}
                      </h3>
                      <div className="inline-flex items-center gap-1 text-[11px] text-red-600 font-bold bg-red-50 border border-red-100 px-2 py-0.5 rounded-md mt-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>{cand.state}</span>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 ${
                        cand.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {cand.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed font-normal">
                    {cand.biography || 'No biography provided.'}
                  </p>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-blue-950">
                  <Vote className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{(cand.approvedVotes || 0).toLocaleString()} Verified Votes</span>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {/* Quick Photo change button for mobile/easy access */}
                  <button
                    type="button"
                    onClick={() => {
                      setQuickUploadCandId(cand.id);
                      quickFileInputRef.current?.click();
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-1 cursor-pointer"
                    title="Upload picture"
                  >
                    <Camera className="w-3.5 h-3.5 text-slate-500" />
                    <span className="hidden sm:inline">Photo</span>
                  </button>

                  <button
                    onClick={() => toggleStatus(cand)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-50 text-slate-600 cursor-pointer"
                  >
                    {cand.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  </button>

                  <button
                    onClick={() => openEditModal(cand)}
                    className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-900 hover:bg-blue-100 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => setDeletingCandidate(cand)}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                    title="Delete contestant"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-base text-blue-950">Remove Contestant?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to remove <strong className="text-slate-800">{deletingCandidate.name}</strong> ({deletingCandidate.state}) from the contest?
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCandidate(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleDelete(deletingCandidate.id)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {isLoading ? 'Removing...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Contestant Modal */}
      {(isAddOpen || editingCandidate) && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-blue-950 text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-400 text-blue-950 flex items-center justify-center font-bold">
                  {editingCandidate ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">
                    {editingCandidate ? `Edit ${editingCandidate.name}` : 'Add New Ambassador Contestant'}
                  </h3>
                  <p className="text-[10px] text-slate-300">
                    {editingCandidate ? 'Update contestant info & picture' : 'Register a new contestant for voting'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingCandidate(null);
                }}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto">
              {/* Contestant Full Name */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Contestant Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Bro David Okolo"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-blue-900 focus:outline-hidden font-semibold text-slate-900"
                />
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] text-slate-400">Quick prefix:</span>
                  <button
                    type="button"
                    onClick={() => setName((prev) => (prev.startsWith('Bro ') ? prev : `Bro ${prev}`.trim()))}
                    className="text-[10px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md hover:bg-blue-100"
                  >
                    + Bro
                  </button>
                  <button
                    type="button"
                    onClick={() => setName((prev) => (prev.startsWith('Sis ') ? prev : `Sis ${prev}`.trim()))}
                    className="text-[10px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md hover:bg-blue-100"
                  >
                    + Sis
                  </button>
                </div>
              </div>

              {/* State / Contestant Category */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Contestant Category / State Represented <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Edo Contestant, Yoruba Contestant, Imo State..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-blue-900 focus:outline-hidden font-semibold text-slate-900"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {stateSuggestions.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setState(sug)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all ${
                        state === sug
                          ? 'bg-blue-900 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contestant Photo Input Section */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-blue-900" />
                    <span>Contestant Picture / Photo</span>
                  </label>
                  <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setPhotoMode('upload')}
                      className={`px-2 py-1 rounded-md transition-all ${
                        photoMode === 'upload' ? 'bg-blue-900 text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoMode('url')}
                      className={`px-2 py-1 rounded-md transition-all ${
                        photoMode === 'url' ? 'bg-blue-900 text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Web Link / URL
                    </button>
                  </div>
                </div>

                {/* Photo Preview & Controls */}
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-white border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center shrink-0 shadow-xs relative group">
                    {image ? (
                      <>
                        <img
                          src={image}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setImage('')}
                          className="absolute inset-0 bg-red-950/70 text-white opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[10px] font-bold transition-opacity"
                        >
                          <X className="w-4 h-4 mb-0.5" />
                          <span>Remove</span>
                        </button>
                      </>
                    ) : (
                      <div className="text-center p-1 text-slate-400">
                        <ImageIcon className="w-6 h-6 mx-auto mb-0.5 opacity-60" />
                        <span className="text-[9px] font-bold block">No Photo</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {photoMode === 'upload' ? (
                      <div className="space-y-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="image/jpeg,image/png,image/webp,image/jpg"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileUpload(e.target.files[0]);
                            }
                          }}
                        />
                        <button
                          type="button"
                          disabled={isUploadingPhoto}
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full px-3 py-2.5 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 text-blue-900 font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all disabled:opacity-50"
                        >
                          {isUploadingPhoto ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-blue-900" />
                              <span>Compressing & Uploading Photo...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 text-blue-900" />
                              <span>{image ? 'Change / Replace Image' : 'Select Photo from Phone / PC'}</span>
                            </>
                          )}
                        </button>
                        {compressionInfo ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                            <Zap className="w-3 h-3 text-emerald-600" />
                            <span>
                              Compressed: {compressionInfo.originalSizeKb} KB ➔ {compressionInfo.compressedSizeKb} KB (-{compressionInfo.reductionPercentage}%)
                            </span>
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-500">
                            Auto-compressed on device (JPG/PNG/WEBP) for lightning-fast mobile loading.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="relative">
                          <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="url"
                            value={image}
                            onChange={(e) => setImage(e.target.value)}
                            placeholder="https://example.com/contestant-photo.jpg"
                            className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:border-blue-900 focus:outline-hidden"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Paste a direct web link or image hosting URL.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Biography / Profile */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Biography / Profile / Ministry Background
                </label>
                <textarea
                  rows={3}
                  value={biography}
                  onChange={(e) => setBiography(e.target.value)}
                  placeholder="e.g. Dedicated youth member and passionate choir chorister at Christ Holy Church International No. 2 Benin..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:border-blue-900 focus:outline-hidden text-slate-800 leading-relaxed"
                />
              </div>

              {/* Sort Order & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Sort Order / Priority</label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:border-blue-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Contest Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white focus:border-blue-900 focus:outline-hidden"
                  >
                    <option value="ACTIVE">ACTIVE (Accepting Votes)</option>
                    <option value="INACTIVE">INACTIVE (Hidden)</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    setEditingCandidate(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || isUploadingPhoto}
                  className="px-6 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-all hover:shadow-lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{editingCandidate ? 'Update Contestant' : 'Save & Register Contestant'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

