import React from 'react';
import { Candidate } from '../types';
import { Trophy, Medal, Crown, Vote, User, ShieldCheck } from 'lucide-react';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';

interface LeaderboardProps {
  candidates: Candidate[];
  onVoteCandidate: (candidate: Candidate) => void;
  onViewCandidate: (candidate: Candidate) => void;
  totalVotes: number;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  candidates,
  onVoteCandidate,
  onViewCandidate,
  totalVotes,
}) => {
  // Sort candidates strictly by approved vote count descending, then sortOrder
  const sortedCandidates = [...candidates].sort((a, b) => {
    const votesDiff = (b.approvedVotes || 0) - (a.approvedVotes || 0);
    if (votesDiff !== 0) return votesDiff;
    return a.sortOrder - b.sortOrder;
  });

  const hasAnyVotes = totalVotes > 0 && sortedCandidates.some((c) => (c.approvedVotes || 0) > 0);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  };

  return (
    <section className="py-16 bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-200" id="leaderboard">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-300 text-xs font-bold uppercase tracking-wider mb-3">
            <Trophy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Authoritative Live Standings</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-950 dark:text-white tracking-tight">
            Official Ambassadorship Leaderboard
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2">
            Standings are computed strictly in real-time from verified and approved vote ledger entries.
          </p>
        </div>

        {/* Status Notice when 0 votes exist */}
        {!hasAnyVotes && (
          <div className="mb-8 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800 shadow-xs flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-blue-950 dark:text-blue-200">
                Official Voting Portal Active
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No approved votes recorded yet. Cast your vote now — standings update live as administrator confirms bank transfers.
              </p>
            </div>
          </div>
        )}

        {/* Podium Highlights - Only active when genuine votes exist */}
        {hasAnyVotes && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {sortedCandidates.slice(0, 3).map((candidate, idx) => {
              const votes = candidate.approvedVotes || 0;
              const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
              const rank = idx + 1;

              return (
                <div
                  key={candidate.id}
                  className={`rounded-2xl p-5 border flex flex-col justify-between relative overflow-hidden transition-all ${
                    rank === 1 && votes > 0
                      ? 'bg-gradient-to-b from-amber-500/10 via-white to-white dark:from-amber-500/15 dark:via-slate-900 dark:to-slate-900 border-amber-300 dark:border-amber-600/60 shadow-md ring-2 ring-amber-400/20'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
                  }`}
                >
                  {/* Crown / Rank Icon */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {rank === 1 && votes > 0 ? (
                        <span className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs">
                          <Crown className="w-4 h-4 fill-slate-950" />
                        </span>
                      ) : rank === 2 && votes > 0 ? (
                        <span className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center">
                          <Medal className="w-4 h-4" />
                        </span>
                      ) : (
                        <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center">
                          #{rank}
                        </span>
                      )}
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                        Rank {rank}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-blue-900 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 border border-blue-100 dark:border-blue-800/60 px-2.5 py-0.5 rounded-full">
                      {percentage}% of votes
                    </span>
                  </div>

                  <div className="flex items-center gap-3.5 my-2">
                    <img
                      src={candidate.photoUrl || candidate.image || DEFAULT_AVATAR}
                      alt={candidate.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                      }}
                      className="w-14 h-14 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                    />
                    <div>
                      <h3 className="font-extrabold text-base text-blue-950 dark:text-white leading-tight">
                        {candidate.name}
                      </h3>
                      <p className="text-xs text-red-600 dark:text-red-400 font-semibold">{candidate.state}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Approved Votes</div>
                      <div className="text-lg font-black text-blue-950 dark:text-amber-400">
                        {votes.toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => onVoteCandidate(candidate)}
                      className="px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-950 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Vote className="w-3.5 h-3.5 text-amber-400 dark:text-slate-950" />
                      <span>Vote</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Detailed Leaderboard Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-[11px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-bold text-center w-16">
                    {hasAnyVotes ? 'Rank' : '#'}
                  </th>
                  <th className="py-3.5 px-4 font-bold">Candidate</th>
                  <th className="py-3.5 px-4 font-bold hidden md:table-cell">State</th>
                  <th className="py-3.5 px-4 font-bold text-right">Approved Votes</th>
                  <th className="py-3.5 px-4 font-bold text-right">Share</th>
                  <th className="py-3.5 px-4 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-900 dark:text-slate-100">
                {sortedCandidates.map((candidate, idx) => {
                  const votes = candidate.approvedVotes || 0;
                  const share = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : '0.0';
                  const rank = idx + 1;

                  return (
                    <tr
                      key={candidate.id}
                      className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors"
                      id={`leaderboard-row-${candidate.slug}`}
                    >
                      <td className="py-3.5 px-4 text-center font-black text-slate-700 dark:text-slate-300">
                        {hasAnyVotes && rank === 1 && votes > 0 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-slate-950 text-xs font-black">
                            1
                          </span>
                        ) : (
                          rank
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5 sm:gap-3">
                          <img
                            src={candidate.photoUrl || candidate.image || DEFAULT_AVATAR}
                            alt={candidate.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                            }}
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                          <div className="min-w-0">
                            <button
                              onClick={() => onViewCandidate(candidate)}
                              className="font-bold text-blue-950 dark:text-blue-300 hover:text-blue-700 dark:hover:text-amber-400 transition-colors text-left text-xs sm:text-sm truncate block max-w-[130px] sm:max-w-none cursor-pointer"
                            >
                              {candidate.name}
                            </button>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium md:hidden">
                              {candidate.state}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300 hidden md:table-cell">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium">
                          {candidate.state}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-blue-950 dark:text-amber-400 text-sm sm:text-base">
                        {votes.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400 text-xs">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                            <div
                              className="h-full bg-blue-800 dark:bg-amber-500 rounded-full"
                              style={{ width: `${Math.min(100, Number(share))}%` }}
                            />
                          </div>
                          <span>{share}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => onVoteCandidate(candidate)}
                          id={`leaderboard-vote-${candidate.slug}`}
                          className="px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-950 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-bold text-xs tracking-wide transition-all shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Vote className="w-3.5 h-3.5 text-amber-400 dark:text-slate-950" />
                          <span>Vote</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
