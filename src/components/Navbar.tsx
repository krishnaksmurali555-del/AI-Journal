import React, { useState, useRef, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  Sparkles, 
  BarChart2, 
  Compass, 
  Sun, 
  Moon, 
  Monitor, 
  LogOut, 
  ShieldCheck, 
  Flame,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  onNewJournal: () => void;
  onOpenAskMyJournal: () => void;
  onOpenReflections: () => void;
  onOpenStats: () => void;
  writingStreak?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onNewJournal,
  onOpenAskMyJournal,
  onOpenReflections,
  onOpenStats,
  writingStreak = 0,
}) => {
  const { user, logout } = useAuth();
  const { theme, setTheme, isDark } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-slate-100">
                AI Journal
              </span>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900/40">
                Gemini 3.6
              </span>
            </div>
            <p className="hidden md:block text-[11px] text-slate-500 dark:text-slate-400">
              Private AI-powered reflection & thought workspace
            </p>
          </div>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Writing streak */}
          {writingStreak > 0 && (
            <button
              onClick={onOpenStats}
              title={`Active Writing Streak: ${writingStreak} days`}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-950/70 transition-colors"
            >
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>{writingStreak}d streak</span>
            </button>
          )}

          {/* Ask My Journal */}
          <button
            onClick={onOpenAskMyJournal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/60 dark:border-slate-700/60 transition-all"
            title="Ask anything across your journal history"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden md:inline">Ask My Journal</span>
          </button>

          {/* Reflections */}
          <button
            onClick={onOpenReflections}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60 transition-all"
            title="Weekly & Monthly Reflections"
          >
            <Compass className="w-3.5 h-3.5 text-violet-500" />
            <span className="hidden lg:inline">Reflections</span>
          </button>

          {/* Stats */}
          <button
            onClick={onOpenStats}
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60 transition-all"
            title="Journal Analytics & Stats"
          >
            <BarChart2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden lg:inline">Stats</span>
          </button>

          {/* Theme switcher */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={() => setTheme('light')}
              title="Light theme"
              className={`p-1.5 rounded-lg transition-colors ${
                theme === 'light' ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-xs' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('dark')}
              title="Dark theme"
              className={`p-1.5 rounded-lg transition-colors ${
                theme === 'dark' ? 'bg-white dark:bg-slate-700 text-indigo-400 shadow-xs' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('system')}
              title="System theme"
              className={`p-1.5 rounded-lg transition-colors ${
                theme === 'system' ? 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-xs' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* New Journal Button */}
          <button
            onClick={onNewJournal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Journal</span>
          </button>

          {/* User Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-1 pl-1.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-8 h-8 rounded-xl object-cover ring-2 ring-indigo-500/20"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center">
                  {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-2 text-slate-900 dark:text-slate-100 animate-fade-in z-50">
                <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {user?.displayName || 'Journaler'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {user?.email}
                  </p>
                  <div className="mt-2.5 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium border border-emerald-200/50 dark:border-emerald-900/40">
                    <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span className="truncate">UID: {user?.uid.slice(0, 10)}... (Strict Isolation)</span>
                  </div>
                </div>

                <div className="p-1 space-y-1">
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      onOpenStats();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <BarChart2 className="w-4 h-4 text-slate-400" />
                    <span>Writing Stats & Streaks</span>
                  </button>

                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
