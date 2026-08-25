import React from 'react';
import { ChcLogo } from './ChcLogo';
import { ShieldCheck, Heart, Shield, MessageCircle } from 'lucide-react';

interface FooterProps {
  onOpenAdmin: () => void;
  isAdminLoggedIn?: boolean;
  pendingPaymentsCount?: number;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdmin, isAdminLoggedIn, pendingPaymentsCount = 0 }) => {
  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Col 1: Brand & Logo */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <ChcLogo size="lg" />
              <div>
                <h4 className="text-sm font-extrabold text-white uppercase tracking-tight">
                  Christ Holy Church International
                </h4>
                <p className="text-xs font-bold text-red-500">
                  No. 2 Benin Ambassadorship
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-400 max-w-md leading-relaxed">
              Official voting portal for <strong>WHO WILL WEAR THE CROWN OF CHRIST HOLY CHURCH INTERNATIONAL NO2 BENIN AMBASSADORSHIP</strong>. A secure, transparent, and auditable ambassadorial contest.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Manual Bank Transfer Verification & Vote Ledger Audited</span>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="space-y-2.5">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider">
              Quick Navigation
            </h5>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#candidates" className="hover:text-amber-400 transition-colors">
                  Meet Candidates
                </a>
              </li>
              <li>
                <a href="#leaderboard" className="hover:text-amber-400 transition-colors">
                  Live Standings
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-amber-400 transition-colors">
                  How Voting Works
                </a>
              </li>
              <li>
                <a href="#status" className="hover:text-amber-400 transition-colors">
                  Check Vote Status
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-amber-400 transition-colors">
                  FAQs
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Church Office & Admin */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider">
              Church Administration
            </h5>
            <p className="text-xs text-slate-400 leading-relaxed">
              Christ Holy Church International No. 2 Benin Parish, Edo State, Nigeria.
            </p>
            <div className="pt-2">
              <button
                onClick={onOpenAdmin}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium transition-colors cursor-pointer"
                id="footer-admin-login-btn"
              >
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Admin Dashboard</span>
                {isAdminLoggedIn && pendingPaymentsCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white font-extrabold text-[10px] animate-pulse">
                    {pendingPaymentsCount} PENDING
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-900 text-xs text-slate-400 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Christ Holy Church International No. 2 Benin. All rights reserved.</p>
          
          {/* Creator Attribution with WhatsApp link */}
          <div className="flex items-center flex-wrap justify-center gap-2 text-xs">
            <span>Website created by <strong className="text-slate-200 font-bold">Ferdinard</strong></span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <a
              href="https://wa.me/2348165686796?text=Hello%20Ferdinard%2C%20I%20am%20reaching%20out%20from%20the%20Christ%20Holy%20Church%20Voting%20Portal"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 hover:text-emerald-300 border border-emerald-800/60 font-semibold transition-all duration-200 shadow-xs"
              id="footer-whatsapp-creator-link"
              title="Chat with Ferdinard on WhatsApp: 08165686796"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
              <span>Message on WhatsApp (08165686796)</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
