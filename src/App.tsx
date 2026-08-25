import React, { useState, useEffect } from 'react';
import { Candidate, Competition, PaymentSettings } from './types';
import { fetchPublicData, fetchPendingTransactionsCount } from './services/api';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { CandidateCard } from './components/CandidateCard';
import { Leaderboard } from './components/Leaderboard';
import { HowItWorks } from './components/HowItWorks';
import { StatusChecker } from './components/StatusChecker';
import { FaqSection } from './components/FaqSection';
import { Footer } from './components/Footer';
import { VotingModal } from './components/VotingModal';
import { CandidateProfileModal } from './components/CandidateProfileModal';
import { AdminPortal } from './components/AdminPortal';
import { Search, Filter, RefreshCw, Users, AlertCircle } from 'lucide-react';

const DEFAULT_CANDIDATES: Candidate[] = [
  {
    id: 'cand-01',
    competitionId: 'comp-chc-benin-01',
    name: 'Bro David Okolo',
    slug: 'bro-david-okolo',
    state: 'Edo Contestant',
    biography:
      'Dedicated youth member and passionate choir chorister at Christ Holy Church International No. 2 Benin. Committed to music ministry, spiritual growth, and ambassadorial excellence representing Edo Contestant.',
    image: '',
    status: 'ACTIVE',
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    approvedVotes: 0,
  },
  {
    id: 'cand-02',
    competitionId: 'comp-chc-benin-01',
    name: 'Bro Chiagozie Okafor',
    slug: 'bro-chiagozie-okafor',
    state: 'Yoruba Contestant',
    biography:
      'Dynamic youth member and dedicated choir chorister at Christ Holy Church International No. 2 Benin. Passionate about music evangelism, youth development, and ambassadorial service representing Yoruba Contestant.',
    image: '',
    status: 'ACTIVE',
    sortOrder: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    approvedVotes: 0,
  },
];

export default function App() {
  const [competition, setCompetition] = useState<Competition | null>({
    id: 'comp-chc-benin-01',
    name: 'WHO WILL WEAR THE CROWN OF CHRIST HOLY CHURCH INTERNATIONAL NO2 BENIN AMBASSADORSHIP',
    slug: 'who-will-wear-the-crown-chc-no2-benin',
    description:
      'Official ambassadorial contest organized by Christ Holy Church International No. 2 Benin. Support your preferred ambassador with verified votes.',
    image: '/logo.svg',
    startDate: '2026-08-01T00:00:00.000Z',
    endDate: '2026-10-31T23:59:59.000Z',
    votePrice: 50,
    status: 'ACTIVE',
    votingRules:
      '1. Votes are purchased at ₦50 per vote via direct bank transfer to the official designated church account.\n2. Each vote transaction generates a unique payment reference.\n3. After making your transfer, submit your transaction reference, contact info, and receipt.\n4. Votes are counted strictly upon administrator verification and approval.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const [candidates, setCandidates] = useState<Candidate[]>(DEFAULT_CANDIDATES);
  const [totalVotes, setTotalVotes] = useState(0);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  const [activeNavTab, setActiveNavTab] = useState('home');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    id: 'default',
    bankName: 'OPAY',
    accountName: 'Okonkwo Precious',
    accountNumber: '9017311644',
    votePrice: 50,
    paymentInstructions: 'Transfer the exact amount shown below to the designated OPAY account and submit your payment details with transfer receipt for verification.',
    updatedAt: new Date().toISOString(),
  });
  const [isLoading, setIsLoading] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('ALL');

  // Modals & Subviews
  const [isVoteModalOpen, setIsVoteModalOpen] = useState(false);
  const [votingCandidate, setVotingCandidate] = useState<Candidate | null>(null);
  const [profileCandidate, setProfileCandidate] = useState<Candidate | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [statusCheckRef, setStatusCheckRef] = useState<string | null>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return !!localStorage.getItem('chc_admin_token');
  });

  const checkAdminSession = () => {
    setIsAdminLoggedIn(!!localStorage.getItem('chc_admin_token'));
  };

  const loadData = async (silent = false) => {
    if (!silent && candidates.length === 0) {
      setIsLoading(true);
    }
    try {
      const data = await fetchPublicData();
      setCompetition(data.competition);
      setCandidates(data.candidates && data.candidates.length > 0 ? data.candidates : DEFAULT_CANDIDATES);
      setTotalVotes(data.totalApprovedVotes || 0);
      setPaymentSettings(data.paymentSettings);
      setFetchError(null);
    } catch (err: any) {
      // Don't crash UI, keep default state
      console.warn('Syncing contest data in background:', err.message || err);
      if (candidates.length === 0) {
        setFetchError('Unable to reach server. Retrying...');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshPendingCount = async () => {
    const token = localStorage.getItem('chc_admin_token');
    if (!token) {
      setPendingPaymentsCount(0);
      setIsAdminLoggedIn(false);
      return;
    }
    setIsAdminLoggedIn(true);
    try {
      const count = await fetchPendingTransactionsCount(token);
      setPendingPaymentsCount(count);
    } catch (e) {
      // quiet fallback
    }
  };

  useEffect(() => {
    loadData(true);
    refreshPendingCount();
    // Refresh contest data every 10 seconds
    const contestInterval = setInterval(() => loadData(true), 10000);
    // Real-time pending count poller for authenticated admins
    const notificationInterval = setInterval(refreshPendingCount, 6000);

    return () => {
      clearInterval(contestInterval);
      clearInterval(notificationInterval);
    };
  }, []);

  // Filter candidates
  const availableStates = Array.from(new Set(candidates.map((c) => c.state)));
  const filteredCandidates = candidates.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.state.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesState = selectedState === 'ALL' || c.state === selectedState;
    return matchesSearch && matchesState;
  });

  const handleStartVoting = (candidate?: Candidate) => {
    setVotingCandidate(candidate || (candidates.length > 0 ? candidates[0] : null));
    setIsVoteModalOpen(true);
  };

  const handleViewStatusWithRef = (ref: string) => {
    setStatusCheckRef(ref);
    const element = document.getElementById('status');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-900 dark:selection:bg-amber-500 selection:text-white dark:selection:text-slate-950 transition-colors duration-200">
      {/* Navigation */}
      <Navbar
        activeTab={activeNavTab}
        setActiveTab={setActiveNavTab}
        onOpenVoteModal={() => handleStartVoting()}
        onOpenAdmin={() => setIsAdminOpen(true)}
        isAdminLoggedIn={isAdminLoggedIn}
        pendingPaymentsCount={pendingPaymentsCount}
      />

      {/* Hero Section */}
      <Hero
        competition={competition}
        totalVotes={totalVotes}
        paymentSettings={paymentSettings}
        candidatesCount={candidates.length}
        onStartVoting={() => handleStartVoting()}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Candidates Section */}
        <section className="py-16 bg-white dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800/80 transition-colors duration-200" id="candidates">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-2">
                  <Users className="w-3.5 h-3.5" />
                  <span>Ambassadorial Aspirants</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-950 dark:text-white tracking-tight">
                  Official Contestants
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Select an ambassador to read their profile and cast your verified votes.
                </p>
              </div>

              {/* Search & State Filter Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search candidate name or state..."
                    className="w-full sm:w-64 pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-900 dark:focus:border-amber-400 focus:ring-2 focus:ring-blue-900/10 dark:focus:ring-amber-400/10"
                  />
                </div>

                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium focus:border-blue-900 dark:focus:border-amber-400"
                >
                  <option value="ALL">All States</option>
                  {availableStates.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Candidates Grid */}
            {isLoading ? (
              <div className="py-16 text-center text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-900 dark:text-amber-400 mb-2" />
                <p className="text-xs font-semibold">Loading official candidates...</p>
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="py-16 text-center bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <AlertCircle className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-500 mb-2" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No candidates found</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Try adjusting your search criteria or state filter.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredCandidates.map((candidate) => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    onVote={handleStartVoting}
                    onViewProfile={(c) => setProfileCandidate(c)}
                    votePrice={paymentSettings.votePrice}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Live Leaderboard Section */}
        <Leaderboard
          candidates={candidates}
          onVoteCandidate={handleStartVoting}
          onViewCandidate={(c) => setProfileCandidate(c)}
          totalVotes={totalVotes}
        />

        {/* How It Works (6-Step Architecture) */}
        <HowItWorks
          paymentSettings={paymentSettings}
          onStartVoting={() => handleStartVoting()}
        />

        {/* Status Checker View */}
        <StatusChecker
          initialReference={statusCheckRef || undefined}
          onVoteAgain={() => handleStartVoting()}
        />

        {/* FAQ Section */}
        <FaqSection paymentSettings={paymentSettings} />
      </main>

      {/* Footer */}
      <Footer
        onOpenAdmin={() => setIsAdminOpen(true)}
        isAdminLoggedIn={isAdminLoggedIn}
        pendingPaymentsCount={pendingPaymentsCount}
      />

      {/* Voting Workflow Modal */}
      {isVoteModalOpen && (
        <VotingModal
          isOpen={true}
          candidate={votingCandidate}
          initialCandidate={votingCandidate}
          candidates={candidates}
          paymentSettings={paymentSettings}
          onClose={() => {
            setIsVoteModalOpen(false);
            setVotingCandidate(null);
          }}
          onVoteSubmitted={() => {
            loadData();
            refreshPendingCount();
          }}
          onVoteSuccess={(ref) => {
            loadData();
            refreshPendingCount();
            handleViewStatusWithRef(ref);
          }}
          onGoToStatus={(ref) => {
            loadData();
            refreshPendingCount();
            handleViewStatusWithRef(ref);
          }}
        />
      )}

      {/* Candidate Profile Modal */}
      {profileCandidate && (
        <CandidateProfileModal
          candidate={profileCandidate}
          onClose={() => setProfileCandidate(null)}
          onVote={(c) => handleStartVoting(c)}
        />
      )}

      {/* Administrator Portal */}
      {isAdminOpen && (
        <AdminPortal
          onClose={() => {
            setIsAdminOpen(false);
            checkAdminSession();
            loadData();
            refreshPendingCount();
          }}
          candidates={candidates}
          paymentSettings={paymentSettings}
          onRefreshData={() => {
            checkAdminSession();
            loadData();
            refreshPendingCount();
          }}
        />
      )}
    </div>
  );
}

