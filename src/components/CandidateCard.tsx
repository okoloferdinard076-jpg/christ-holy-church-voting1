import React, { useState } from 'react';
import { Candidate } from '../types';
import { getResolvedCandidatePhoto } from '../services/firebase';
import { Vote, MapPin, CheckCircle2, Info, User, MessageCircle, Twitter, Share2, Copy, Check, TrendingUp, Trophy } from 'lucide-react';

interface CandidateCardProps {
  candidate: Candidate;
  onVote: (candidate: Candidate) => void;
  onViewProfile: (candidate: Candidate) => void;
  votePrice?: number;
  rank?: number;
  leaderVotes?: number;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  onVote,
  onViewProfile,
  rank,
  leaderVotes = 0,
}) => {
  const [copied, setCopied] = useState(false);
  const votes = candidate.approvedVotes || 0;
  const candidatePhoto = getResolvedCandidatePhoto(candidate.photoUrl, candidate.image, candidate.id, candidate.name);

  // Percentage relative to competition leader
  const isLeader = leaderVotes > 0 && votes >= leaderVotes;
  const percentage = leaderVotes > 0 ? Math.min(100, Math.round((votes / leaderVotes) * 100)) : 0;

  // Extract initials for blank candidate avatar
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
        // Fallback to copy link if user cancels or browser fails
      }
    }
    handleCopyLink(e);
  };

  return (
    <div
      id={`candidate-card-${candidate.slug}`}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-xl dark:hover:border-slate-700 transition-all duration-300 overflow-hidden flex flex-col group relative"
    >
      {/* State Badge */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-950/85 dark:bg-slate-950/90 backdrop-blur-md text-white text-xs font-bold tracking-wide shadow-sm border border-white/10">
          <MapPin className="w-3 h-3 text-red-400" />
          {candidate.state}
        </span>
      </div>

      {/* Real Rank (ONLY if candidate has actual approved votes) */}
      {votes > 0 && typeof rank === 'number' && rank <= 3 && (
        <div className="absolute top-3 right-3 z-10">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold shadow-sm ${
              rank === 1
                ? 'bg-amber-400 text-slate-950 ring-1 ring-amber-500'
                : rank === 2
                ? 'bg-slate-200 text-slate-800 ring-1 ring-slate-300'
                : 'bg-amber-700/80 text-white'
            }`}
          >
            Rank #{rank}
          </span>
        </div>
      )}

      {/* Candidate Portrait Container */}
      <div
        className="relative aspect-4/3 sm:aspect-square bg-slate-900 border-b border-slate-100 dark:border-slate-800 overflow-hidden cursor-pointer flex items-center justify-center select-none"
        onClick={() => onViewProfile(candidate)}
      >
        <img
          src={candidatePhoto}
          onError={(e) => {
            (e.target as HTMLImageElement).src = getResolvedCandidatePhoto('', '', candidate.id, candidate.name);
          }}
          alt={candidate.name}
          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90 pointer-events-none" />

        {/* Name overlay at base */}
        <div className="absolute bottom-3 left-3 right-3 text-white pointer-events-none">
          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white drop-shadow-sm">
            {candidate.name}
          </h3>
          <p className="text-xs text-slate-200 font-medium">{candidate.state}</p>
        </div>
      </div>

      {/* Card Content & Approved Votes */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3.5 sm:space-y-4">
        {/* Authoritative Approved Votes Display */}
        <div className="bg-blue-50/60 dark:bg-slate-800/80 rounded-xl p-3 sm:p-3.5 border border-blue-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex flex-col min-w-0 pr-2">
            <span className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider truncate">
              Approved Votes
            </span>
            <span className="text-xl sm:text-2xl font-black text-blue-950 dark:text-amber-400 tracking-tight">
              {votes.toLocaleString()}{' '}
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">votes</span>
            </span>
          </div>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Visual Progress Bar Relative to Leader */}
        <div className="space-y-1.5 px-0.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
              {isLeader ? (
                <>
                  <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="font-bold text-amber-600 dark:text-amber-400">Current Leader</span>
                </>
              ) : (
                <>
                  <TrendingUp className="w-3.5 h-3.5 text-blue-900 dark:text-amber-400 shrink-0" />
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
            className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200/60 dark:border-slate-700/60"
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

        {/* Short Biography excerpt */}
        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
          {candidate.biography}
        </p>

        {/* Social Media Sharing Section */}
        <div className="pt-2.5 sm:pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <Share2 className="w-3 h-3 text-blue-900 dark:text-amber-400" />
              Share to Support
            </span>
            {copied && (
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-fade-in">
                <Check className="w-3 h-3" />
                Link copied!
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
            {/* WhatsApp Share */}
            <button
              onClick={handleWhatsAppShare}
              id={`share-wa-${candidate.slug}`}
              title={`Share ${candidate.name} on WhatsApp`}
              className="py-2 px-1 sm:px-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 font-bold text-[10px] sm:text-[11px] transition-colors flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer min-h-[36px]"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate">WhatsApp</span>
            </button>

            {/* Twitter / X Share */}
            <button
              onClick={handleTwitterShare}
              id={`share-tw-${candidate.slug}`}
              title={`Share ${candidate.name} on X (Twitter)`}
              className="py-2 px-1 sm:px-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-[10px] sm:text-[11px] transition-colors flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer min-h-[36px]"
            >
              <Twitter className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300 shrink-0" />
              <span className="truncate">X / Post</span>
            </button>

            {/* Copy Link / Native Share */}
            <button
              onClick={handleNativeShare}
              id={`share-copy-${candidate.slug}`}
              title="Copy share link"
              className={`py-2 px-1 sm:px-2 rounded-lg border font-bold text-[10px] sm:text-[11px] transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer min-h-[36px] ${
                copied
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-900 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-blue-800 dark:text-blue-300 shrink-0" />
                  <span className="truncate">Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={() => onVote(candidate)}
            id={`vote-btn-${candidate.slug}`}
            className="w-full py-2.5 px-3 rounded-xl bg-blue-900 hover:bg-blue-950 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-bold text-xs tracking-wide shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 min-h-[42px]"
          >
            <Vote className="w-4 h-4 text-amber-400 dark:text-slate-950 shrink-0" />
            <span className="truncate">Vote for {candidate.name.split(' ')[0]}</span>
          </button>

          <button
            onClick={() => onViewProfile(candidate)}
            id={`view-profile-${candidate.slug}`}
            className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer min-h-[42px]"
          >
            <Info className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
            <span>Profile & Bio</span>
          </button>
        </div>
      </div>
    </div>
  );
};

