import React from 'react';
import { ChcLogo } from './ChcLogo';
import { ShieldCheck, ChevronRight } from 'lucide-react';
import { PaymentSettings, Competition } from '../types';

interface HeroProps {
  onVoteClick?: () => void;
  onExploreCandidates?: () => void;
  onStartVoting?: () => void;
  competition?: Competition | null;
  paymentSettings?: PaymentSettings;
  totalVotes?: number;
  totalVotesCounted?: number;
  candidatesCount?: number;
}

export const Hero: React.FC<HeroProps> = ({
  onVoteClick,
  onExploreCandidates,
  onStartVoting,
  paymentSettings,
  totalVotes,
  totalVotesCounted,
}) => {
  const price = paymentSettings?.votePrice || 50;
  const votesCount = typeof totalVotes === 'number' ? totalVotes : (totalVotesCounted || 0);

  const handleVote = () => {
    if (onStartVoting) {
      onStartVoting();
    } else if (onVoteClick) {
      onVoteClick();
    }
  };

  const handleExplore = () => {
    if (onExploreCandidates) {
      onExploreCandidates();
    } else {
      const el = document.getElementById('candidates');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blue-950 via-blue-900 to-slate-900 text-white pt-12 pb-20 sm:pt-16 sm:pb-24 border-b border-blue-800" id="hero-section">
      {/* Background subtle watermark & architectural lines */}
      <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
        <img src="/logo.svg" alt="" className="w-[600px] h-[600px] object-contain" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Official Organization Banner */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-800/80 border border-blue-700/60 backdrop-blur-sm mb-6 text-xs sm:text-sm font-semibold tracking-wide text-blue-100">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span>Official Event of Christ Holy Church International No. 2 Benin</span>
        </div>

        {/* Official Logo Display */}
        <div className="flex justify-center mb-6">
          <ChcLogo size="hero" className="p-2 rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-md shadow-2xl" />
        </div>

        {/* Primary Hero Typography */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white mb-3 leading-tight uppercase">
          Who Will Wear The Crown?
        </h1>

        <p className="text-sm sm:text-lg md:text-xl font-bold text-amber-400 max-w-2xl mx-auto mb-5 tracking-wide">
          Christ Holy Church International No. 2 Benin Ambassadorship
        </p>

        <p className="text-xs sm:text-base text-slate-200 max-w-xl mx-auto mb-8 font-normal leading-relaxed">
          Explore the official contestants and cast your votes. Each vote is ₦{price} verified via direct bank transfer.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-10">
          <button
            onClick={handleVote}
            id="hero-primary-vote-btn"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-base shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all transform active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Vote Now</span>
            <ChevronRight className="w-5 h-5" />
          </button>

          <button
            onClick={handleExplore}
            id="hero-secondary-meet-btn"
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-base border border-white/20 hover:border-white/30 backdrop-blur-sm transition-all cursor-pointer"
          >
            Meet the Candidates
          </button>
        </div>

        {/* Trust Badges & Verified Rate Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl mx-auto text-left">
          <div className="bg-white/5 border border-white/10 rounded-lg p-3 backdrop-blur-xs">
            <div className="text-xs text-slate-300 font-medium">Official Rate</div>
            <div className="text-base sm:text-lg font-bold text-white">₦{price} / Vote</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg p-3 backdrop-blur-xs">
            <div className="text-xs text-slate-300 font-medium">Payment Channel</div>
            <div className="text-base sm:text-lg font-bold text-white">Direct Bank Transfer</div>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-white/5 border border-white/10 rounded-lg p-3 backdrop-blur-xs">
            <div className="text-xs text-slate-300 font-medium">Total Approved Votes</div>
            <div className="text-base sm:text-lg font-bold text-emerald-400">
              {votesCount.toLocaleString()} Votes
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
