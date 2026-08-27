import React, { useEffect, useState } from 'react';
import { X, Flame, FileText, Star, Tag, BarChart3, Smile, Calendar, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { JournalStats } from '../types';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState<JournalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load statistics.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Journal Statistics</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Personal writing insights & streak analytics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
            <p className="text-sm">Calculating your journal metrics...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-rose-500 text-sm">{error}</div>
        ) : stats ? (
          <div className="mt-6 space-y-6">
            {/* Primary KPI Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-900/40 text-amber-900 dark:text-amber-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Streak</span>
                  <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                </div>
                <div className="mt-2 text-2xl font-bold tracking-tight">{stats.writingStreak} <span className="text-xs font-normal text-amber-600 dark:text-amber-400">days</span></div>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-900/40 text-indigo-900 dark:text-indigo-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">This Week</span>
                  <Calendar className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="mt-2 text-2xl font-bold tracking-tight">{stats.entriesThisWeek} <span className="text-xs font-normal text-indigo-600 dark:text-indigo-400">entries</span></div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Total Words</span>
                  <FileText className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="mt-2 text-2xl font-bold tracking-tight">{stats.wordsWritten.toLocaleString()}</div>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200/50 dark:border-purple-900/40 text-purple-900 dark:text-purple-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Favorites</span>
                  <Star className="w-4 h-4 text-purple-500 fill-purple-500" />
                </div>
                <div className="mt-2 text-2xl font-bold tracking-tight">{stats.favoriteCount} <span className="text-xs font-normal text-purple-600 dark:text-purple-400">saved</span></div>
              </div>
            </div>

            {/* Total entries summary */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Total Lifetime Journals</span>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{stats.totalJournals} Entries Written</p>
              </div>
              <div className="text-right text-xs text-slate-500">
                Avg. {stats.totalJournals > 0 ? Math.round(stats.wordsWritten / stats.totalJournals) : 0} words / entry
              </div>
            </div>

            {/* Mood breakdown */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-3">
                <Smile className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200">Mood Tracker Distribution</h3>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { key: 'happy', emoji: '😊', label: 'Happy' },
                  { key: 'good', emoji: '🙂', label: 'Good' },
                  { key: 'neutral', emoji: '😐', label: 'Neutral' },
                  { key: 'worried', emoji: '😟', label: 'Worried' },
                  { key: 'sad', emoji: '😔', label: 'Sad' },
                  { key: 'angry', emoji: '😡', label: 'Angry' },
                ].map(({ key, emoji, label }) => {
                  const count = stats.moodBreakdown?.[key] || 0;
                  return (
                    <div key={key} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-center border border-slate-100 dark:border-slate-700/50">
                      <div className="text-2xl mb-1">{emoji}</div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{count}</div>
                      <div className="text-[10px] text-slate-500 capitalize">{label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top tags */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200">Most Used Topics & Tags</h3>
              </div>
              {stats.topTags.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No tags added yet. Add #tags to your journal entries to track your recurring themes.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {stats.topTags.map(({ tag, count }) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40"
                    >
                      <span>#{tag}</span>
                      <span className="px-1.5 py-0.5 rounded-md bg-indigo-200/60 dark:bg-indigo-900/60 text-[10px] font-bold">
                        {count}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
