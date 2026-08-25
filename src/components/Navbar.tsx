import React from 'react';
import { ChcLogo } from './ChcLogo';
import { ThemeToggle } from './ThemeToggle';
import { Vote, Trophy, Search, HelpCircle, Shield, Menu, X } from 'lucide-react';

interface NavbarProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  onOpenVoteModal: () => void;
  onOpenAdmin: () => void;
  isAdminLoggedIn?: boolean;
  pendingPaymentsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab = 'home',
  setActiveTab,
  onOpenVoteModal,
  onOpenAdmin,
  isAdminLoggedIn,
  pendingPaymentsCount = 0,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'candidates', label: 'Candidates' },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'how-it-works', label: 'How Voting Works' },
    { id: 'status', label: 'Check Vote Status', icon: Search },
    { id: 'faq', label: 'FAQ', icon: HelpCircle },
  ];

  const handleNavClick = (id: string) => {
    if (setActiveTab) {
      setActiveTab(id);
    }
    setMobileMenuOpen(false);
    // Smooth scroll to element if on home
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo Brand Identity */}
          <button
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2 sm:gap-3 text-left group focus:outline-none cursor-pointer min-w-0 pr-2"
            id="brand-logo-button"
          >
            <div className="relative shrink-0 flex items-center justify-center p-1 rounded-xl bg-white/95 dark:bg-slate-900 shadow-xs ring-1 ring-slate-200/80 dark:ring-slate-800 w-10 h-10 sm:w-13 sm:h-13">
              <img
                src="/logo.svg"
                alt="Christ Holy Church Emblem"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs sm:text-sm md:text-base font-extrabold text-blue-950 dark:text-blue-100 uppercase tracking-tight group-hover:text-blue-800 dark:group-hover:text-amber-400 transition-colors leading-tight truncate">
                <span className="hidden sm:inline">Christ Holy Church International</span>
                <span className="sm:hidden">Christ Holy Church</span>
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-red-600 dark:text-red-400 tracking-wide leading-tight truncate">
                No. 2 Benin Ambassadorship
              </span>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center space-x-1" id="desktop-nav">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  id={`nav-${item.id}`}
                  className={`px-3 py-2 text-xs lg:text-sm font-semibold rounded-lg transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-900 dark:text-blue-300 shadow-xs border border-blue-100 dark:border-blue-800/60'
                      : 'text-slate-700 dark:text-slate-300 hover:text-blue-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                  }`}
                >
                  {item.icon && <item.icon className="w-4 h-4 text-blue-800 dark:text-blue-400" />}
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Desktop & Tablet Actions */}
          <div className="hidden md:flex items-center gap-2.5">
            {/* Theme Toggle Button */}
            <ThemeToggle />

            <button
              onClick={onOpenVoteModal}
              id="header-vote-now-btn"
              className="px-4 sm:px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all transform active:scale-98 flex items-center gap-2 cursor-pointer"
            >
              <Vote className="w-4 h-4 text-amber-400 dark:text-slate-950" />
              <span>Vote Now</span>
            </button>

            {/* Admin Portal Button with Real-time Notification Badge */}
            <button
              onClick={onOpenAdmin}
              id="header-admin-btn"
              title={
                isAdminLoggedIn && pendingPaymentsCount > 0
                  ? `${pendingPaymentsCount} pending transaction${pendingPaymentsCount > 1 ? 's' : ''} awaiting approval`
                  : 'Administrator Portal'
              }
              className={`relative px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isAdminLoggedIn
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/60 text-amber-950 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-blue-950 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/80'
              }`}
            >
              <Shield className="w-4 h-4 text-blue-950 dark:text-amber-400" />
              <span className="hidden lg:inline">{isAdminLoggedIn ? 'Admin Active' : 'Admin'}</span>

              {/* Real-time Notification Badge (Protected) */}
              {isAdminLoggedIn && pendingPaymentsCount > 0 && (
                <span
                  id="admin-nav-pending-badge"
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black tracking-tight shadow-sm animate-pulse ml-0.5"
                >
                  <span>{pendingPaymentsCount}</span>
                </span>
              )}
            </button>
          </div>

          {/* Clean, Decluttered Mobile Header Actions */}
          <div className="flex md:hidden items-center gap-2 shrink-0">
            <button
              onClick={onOpenVoteModal}
              className="px-3 py-2 rounded-xl bg-blue-900 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
              id="mobile-header-vote-btn"
            >
              <Vote className="w-3.5 h-3.5 text-amber-400 dark:text-slate-950" />
              <span>Vote</span>
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="relative p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none cursor-pointer border border-slate-200/70 dark:border-slate-800"
              id="mobile-menu-toggle"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              {isAdminLoggedIn && pendingPaymentsCount > 0 && !mobileMenuOpen && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-600 rounded-full ring-2 ring-white dark:ring-slate-950 animate-pulse" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 pt-3 pb-6 space-y-2 shadow-xl transition-colors duration-200">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 cursor-pointer ${
                activeTab === item.id
                  ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-900 dark:text-blue-300 font-bold border border-blue-100 dark:border-blue-800/60'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              {item.icon && <item.icon className="w-4 h-4 text-blue-800 dark:text-blue-400" />}
              {item.label}
            </button>
          ))}
          
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2.5">
            {/* Theme switcher segment inside mobile menu */}
            <div className="flex items-center justify-between px-2 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Theme Mode</span>
              <ThemeToggle variant="segmented" />
            </div>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenVoteModal();
              }}
              className="w-full py-3 bg-blue-900 dark:bg-amber-500 hover:bg-blue-950 dark:hover:bg-amber-400 text-white dark:text-slate-950 rounded-xl font-bold text-center text-sm shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Vote className="w-4 h-4 text-amber-400 dark:text-slate-950" />
              Vote Now (₦50 / vote)
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAdmin();
              }}
              className="w-full py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold text-center hover:bg-slate-50 dark:hover:bg-slate-900 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-blue-950 dark:text-amber-400" />
              <span>{isAdminLoggedIn ? 'Administrator Portal (Active)' : 'Administrator Portal'}</span>
              {isAdminLoggedIn && pendingPaymentsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black animate-pulse">
                  {pendingPaymentsCount} PENDING
                </span>
              )}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
