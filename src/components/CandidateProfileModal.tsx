import React, { useState } from 'react';
import { Candidate } from '../types';
import { X, Vote, MapPin, CheckCircle2, User, MessageCircle, Twitter, Share2, Copy, Check, TrendingUp, Trophy } from 'lucide-react';

interface CandidateProfileModalProps {
  candidate: Candidate | null;
  onClose: () => void;
  onVote: (candidate: Candidate) => void;
  rank?: number;
  leaderVotes?: number;
}

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';

export const CandidateProfileModal: React.FC<CandidateProfileModalProps> = ({
  candidate,
  onClose,
  onVote,
  rank,
  leaderVotes = 0,
}) => {
  const [copied, setCopied] = useState(false);
  if (!candidate) return null;
  const votes = candidate.approvedVotes || 0;
  const candidatePhoto = candidate.photoUrl || candidate.image || DEFAULT_AVATAR;

  const isLeader = leaderVotes > 0 && votes >= leaderVotes;
  const percentage = leaderVotes > 0 ? Math.min(100, Math.round((votes / leaderVotes) * 100)) : 0;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  };

  const getShareUrl = () => {
    if (typeof window !== 'undefined') {
      const base = window.location.href.split('#')[0];
      return `${base}#candidate-card-${candidate.slug}`;
    }
    return '';
  };

  const shareText = `👑 Vote for ${candidate.name} (${candidate.state}) in the Christ Holy Church International No. 2 Benin Ambassadorship Contest! Support with verified votes:`;

  const handleWhatsAppShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getShareUrl();
    const fullText = `${shareText}\n${url}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleTwitterShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getShareUrl();
    const tweetText = `👑 Vote for ${candidate.name} (${candidate.state}) in the CHC Int'l No. 2 Benin Ambassadorship Crown Contest! #CHC2Benin #Ambassadorship`;
    const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(url)}`;
    window.open(twUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getShareUrl();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleNativeShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getShareUrl();
    if (navigator?.share) {
      try {
        await navigator.share({
          title: `Vote for ${candidate.name} - CHC No. 2 Benin`,
          text: shareText,
          url,
        });
        return;
      } catch {
        // Fallback to copy link
      }
    }
    handleCopyLink(e);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      id="candidate-profile-backdrop"
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col relative"
        id="candidate-profile-modal"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Portrait Container */}
        <div className="relative aspect-16/10 bg-slate-900 overflow-hidden flex items-center justify-center select-none">
          <img
            src={candidate.photoUrl || candidate.image || DEFAULT_AVATAR}
            onError={(e) => {
              (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
            }}
            alt={candidate.name}
            className="w-full h-full object-cover object-top"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
          <div className="absolute bottom-4 left-5 right-5 text-white pointer-events-none">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-3 py-0.5 rounded-full bg-red-600 text-white text-xs font-bold flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {candidate.state}
              </span>
              {votes > 0 && typeof rank === 'number' && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-xs font-extrabold">
                  Rank #{rank}
                </span>
              )}
            </div>
            <h3 className="text-2xl font-black tracking-tight">{candidate.name}</h3>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5">
          {/* Approved Votes Banner */}
          <div className="bg-blue-50 dark:bg-blue-950/40 rounded-xl p-4 border border-blue-100 dark:border-blue-800/60 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Official Approved Votes
              </span>
              <div className="text-2xl font-black text-blue-950 dark:text-amber-400">
                {votes.toLocaleString()}{' '}
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">votes counted</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          {/* Visual Progress Bar Relative to Leader */}
          <div className="space-y-1.5 px-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                {isLeader ? (
                  <>
                    <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="font-bold text-amber-600 dark:text-amber-400">Current Leader</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 text-blue-900 dark:text-amber-400 shrink-0" />
                    <span>Progress vs Leader</span>
                  </>
                )}
              </span>
              <span
                className={`font-black tracking-tight ${
                  isLeader
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-blue-950 dark:text-slate-200'
                }`}
              >
                {leaderVotes > 0 ? `${percentage}%` : '0%'}
              </span>
            </div>

            {/* Progress track */}
            <div
              className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200/60 dark:border-slate-700/60"
              role="progressbar"
              aria-valuenow={percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${candidate.name}'s progress relative to the contest leader`}
            >
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  isLeader
                    ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300'
                    : 'bg-gradient-to-r from-blue-900 via-blue-800 to-amber-500 dark:from-blue-600 dark:via-blue-500 dark:to-amber-400'
                }`}
                style={{
                  width: `${leaderVotes > 0 && votes > 0 ? Math.max(percentage, 4) : 0}%`,
                }}
              />
            </div>
          </div>

          {/* Biography */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Contestant Bio & Ministry Profile
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {candidate.biography}
            </p>
          </div>

          {/* Social Share in Profile */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-blue-900 dark:text-amber-400" />
                Share Candidate Profile
              </span>
              {copied && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Link copied!
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              <button
                onClick={handleWhatsAppShare}
                id={`modal-share-wa-${candidate.slug}`}
                className="min-w-0 py-2 px-1.5 sm:px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-[10px] sm:text-xs flex items-center justify-center gap-1 sm:gap-2 cursor-pointer transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">WhatsApp</span>
              </button>

              <button
                onClick={handleTwitterShare}
                id={`modal-share-tw-${candidate.slug}`}
                className="min-w-0 py-2 px-1.5 sm:px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-[10px] sm:text-xs flex items-center justify-center gap-1 sm:gap-2 cursor-pointer transition-colors"
              >
                <Twitter className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700 dark:text-slate-300 shrink-0" />
                <span className="truncate">X / Post</span>
              </button>

              <button
                onClick={handleNativeShare}
                id={`modal-share-copy-${candidate.slug}`}
                className={`min-w-0 py-2 px-1.5 sm:px-3 rounded-xl border font-bold text-[10px] sm:text-xs flex items-center justify-center gap-1 sm:gap-2 cursor-pointer transition-all ${
                  copied
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-blue-50 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-900 dark:text-blue-300 border-blue-200 dark:border-slate-700'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span className="truncate">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-800 dark:text-amber-400 shrink-0" />
                    <span className="truncate">Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Action */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-center"
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                onVote(candidate);
              }}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-bold text-xs tracking-wide shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Vote className="w-4 h-4 text-amber-400 dark:text-slate-950 shrink-0" />
              <span>Vote for {candidate.name.split(' ')[0]}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

