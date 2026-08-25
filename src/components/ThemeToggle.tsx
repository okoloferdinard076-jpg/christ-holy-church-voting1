import React, { useState, useRef, useEffect } from 'react';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import { Sun, Moon, Monitor, Check, ChevronDown } from 'lucide-react';

interface ThemeToggleProps {
  variant?: 'button' | 'dropdown' | 'segmented';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'button', className = '' }) => {
  const { theme, resolvedTheme, setTheme, toggleTheme, isDark } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  if (variant === 'segmented') {
    return (
      <div
        className={`inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 ${className}`}
        role="group"
        aria-label="Theme selection"
      >
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            theme === 'light'
              ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          title="Light Theme"
        >
          <Sun className="w-3.5 h-3.5" />
          <span>Light</span>
        </button>
        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            theme === 'dark'
              ? 'bg-slate-900 text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          title="Dark Theme"
        >
          <Moon className="w-3.5 h-3.5" />
          <span>Dark</span>
        </button>
        <button
          type="button"
          onClick={() => setTheme('system')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            theme === 'system'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          title="System Auto Theme"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Auto</span>
        </button>
      </div>
    );
  }

  if (variant === 'dropdown') {
    return (
      <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen((prev) => !prev)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
        >
          {isDark ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
          <span className="capitalize">{theme}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-36 origin-top-right rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg py-1 z-50 focus:outline-none">
            <button
              onClick={() => {
                setTheme('light');
                setDropdownOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium ${
                theme === 'light'
                  ? 'text-blue-900 dark:text-blue-400 bg-blue-50 dark:bg-slate-700/50'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Light</span>
              </div>
              {theme === 'light' && <Check className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => {
                setTheme('dark');
                setDropdownOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium ${
                theme === 'dark'
                  ? 'text-blue-900 dark:text-blue-400 bg-blue-50 dark:bg-slate-700/50'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-blue-400" />
                <span>Dark</span>
              </div>
              {theme === 'dark' && <Check className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => {
                setTheme('system');
                setDropdownOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium ${
                theme === 'system'
                  ? 'text-blue-900 dark:text-blue-400 bg-blue-50 dark:bg-slate-700/50'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-slate-400" />
                <span>System Auto</span>
              </div>
              {theme === 'system' && <Check className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Default button: one-click instant toggle with smooth rotation animation & tooltip
  return (
    <button
      type="button"
      onClick={toggleTheme}
      id="theme-toggle-btn"
      title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode (Current: ${theme})`}
      aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
      className={`relative p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/90 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 transition-all duration-200 shadow-xs hover:shadow-sm cursor-pointer flex items-center justify-center group ${className}`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        <Sun
          className={`w-4 h-4 text-amber-500 absolute transition-all duration-300 transform ${
            isDark ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'
          }`}
        />
        <Moon
          className={`w-4 h-4 text-amber-300 absolute transition-all duration-300 transform ${
            isDark ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'
          }`}
        />
      </div>
    </button>
  );
};
