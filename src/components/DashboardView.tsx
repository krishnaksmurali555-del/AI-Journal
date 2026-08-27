import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Star, 
  Flame, 
  FileText, 
  Calendar, 
  Tag as TagIcon, 
  Smile, 
  Trash2, 
  Download, 
  Sparkles, 
  ArrowRight, 
  Loader2, 
  BookOpen,
  Filter,
  X,
  TrendingUp
} from 'lucide-react';
import { JournalEntry, JournalStats, MoodType } from '../types';
import { api } from '../services/api';
import { exportJournalAsPdf, exportJournalAsMarkdown, exportJournalAsTxt, exportJournalAsJson } from '../utils/export';
import { ConfirmModal } from './ConfirmModal';

interface DashboardViewProps {
  onSelectJournal: (id: string) => void;
  onNewJournal: () => void;
  onOpenStats: () => void;
  onOpenAskMyJournal: () => void;
  onOpenReflections: () => void;
}

const MOOD_EMOJIS: Record<string, string> = {
  happy: '😊',
  good: '🙂',
  neutral: '😐',
  worried: '😟',
  sad: '😔',
  angry: '😡',
};

const STARTER_PROMPTS = [
  {
    title: 'Career Planning & Next Steps',
    snippet: 'Reflecting on what roles and technical skills energize me most...',
    tags: ['career', 'growth'],
    mood: 'good' as MoodType,
  },
  {
    title: 'Daily Mindfulness & Wins',
    snippet: 'Today went well. The small breakthrough I had was...',
    tags: ['gratitude', 'mindfulness'],
    mood: 'happy' as MoodType,
  },
  {
    title: 'Navigating a Technical Challenge',
    snippet: 'Working through a challenging architecture problem today...',
    tags: ['learning', 'engineering'],
    mood: 'neutral' as MoodType,
  },
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  onSelectJournal,
  onNewJournal,
  onOpenStats,
  onOpenAskMyJournal,
  onOpenReflections,
}) => {
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [stats, setStats] = useState<JournalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deletion modal
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedTag, favoritesOnly, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [journalsData, statsData] = await Promise.all([
        api.getJournals({
          tag: selectedTag || undefined,
          favorite: favoritesOnly || undefined,
          q: searchQuery.trim() || undefined,
        }),
        api.getStats().catch(() => null),
      ]);
      setJournals(journalsData);
      if (statsData) setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load journals.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, id: string, currentFav: boolean) => {
    e.stopPropagation();
    try {
      const nextFav = !currentFav;
      await api.toggleFavorite(id, nextFav);
      setJournals(prev =>
        prev.map(j => (j.id === id ? { ...j, favorite: nextFav } : j))
      );
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    const targetId = deleteTargetId;
    setDeleteTargetId(null);
    try {
      await api.deleteJournal(targetId);
      setJournals(prev => prev.filter(j => j.id !== targetId));
      // reload stats in background
      api.getStats().then(setStats).catch(() => {});
    } catch (err: any) {
      setError(err.message || 'Failed to delete entry.');
    }
  };

  const handleCreateFromStarter = async (title: string, content: string, tags: string[], mood: MoodType) => {
    try {
      setLoading(true);
      const newEntry = await api.createJournal({
        title,
        content,
        tags,
        mood,
      });
      onSelectJournal(newEntry.id);
    } catch (err: any) {
      setError(err.message || 'Failed to create starter journal');
      setLoading(false);
    }
  };

  const filteredJournals = journals.filter(j => {
    if (selectedMood && j.mood !== selectedMood) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div 
          onClick={onOpenStats}
          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Writing Streak</span>
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {stats?.writingStreak ?? 0} <span className="text-xs font-normal text-slate-400">days</span>
          </div>
        </div>

        <div 
          onClick={onOpenStats}
          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Past 7 Days</span>
            <Calendar className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {stats?.entriesThisWeek ?? 0} <span className="text-xs font-normal text-slate-400">entries</span>
          </div>
        </div>

        <div 
          onClick={onOpenStats}
          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Words Written</span>
            <FileText className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {stats?.wordsWritten ? stats.wordsWritten.toLocaleString() : 0}
          </div>
        </div>

        <div 
          onClick={() => setFavoritesOnly(!favoritesOnly)}
          className={`p-4 sm:p-5 rounded-2xl border shadow-2xs transition-all cursor-pointer group ${
            favoritesOnly
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Favorites</span>
            <Star className={`w-4 h-4 text-amber-500 ${favoritesOnly ? 'fill-amber-500' : ''} group-hover:scale-110 transition-transform`} />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {stats?.favoriteCount ?? 0} <span className="text-xs font-normal text-slate-400">saved</span>
          </div>
        </div>
      </div>

      {/* Main Header / Search & Filter Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Your Journal Archive
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Strictly private and secured under your Firebase UID
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenAskMyJournal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/60 dark:border-slate-700/60 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Ask My Journal</span>
            </button>

            <button
              onClick={onNewJournal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Entry</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search your journal by title, content, or tags..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => {
                setFavoritesOnly(false);
                setSelectedTag(null);
                setSelectedMood(null);
                setSearchQuery('');
              }}
              className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                !favoritesOnly && !selectedTag && !selectedMood && !searchQuery
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              All Entries
            </button>

            <button
              onClick={() => setFavoritesOnly(!favoritesOnly)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap border transition-colors ${
                favoritesOnly
                  ? 'bg-amber-500 text-white border-amber-500 font-semibold'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${favoritesOnly ? 'fill-white' : 'text-amber-500'}`} />
              <span>Favorites</span>
            </button>

            {/* Mood filters */}
            {['happy', 'good', 'worried'].map(m => (
              <button
                key={m}
                onClick={() => setSelectedMood(selectedMood === m ? null : (m as MoodType))}
                className={`px-2.5 py-2 rounded-xl text-xs flex items-center gap-1 whitespace-nowrap border transition-colors ${
                  selectedMood === m
                    ? 'bg-indigo-600 text-white border-indigo-600 font-semibold'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                }`}
              >
                <span>{MOOD_EMOJIS[m]}</span>
                <span className="capitalize">{m}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Active Tag Filters Bar */}
        {stats && stats.topTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <TagIcon className="w-3 h-3" /> Filter by tag:
            </span>
            {stats.topTags.map(({ tag, count }) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedTag === tag
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60'
                }`}
              >
                #{tag} <span className="opacity-60 text-[10px]">({count})</span>
              </button>
            ))}
            {selectedTag && (
              <button
                onClick={() => setSelectedTag(null)}
                className="text-[11px] text-rose-500 hover:underline ml-1"
              >
                Clear tag
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Journal Cards Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
          <p className="text-sm font-medium">Loading your journals...</p>
        </div>
      ) : filteredJournals.length === 0 ? (
        /* Empty State */
        <div className="py-12 px-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-6">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {searchQuery || selectedTag || favoritesOnly ? 'No matching journal entries found' : 'Your private journal is ready'}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {searchQuery || selectedTag || favoritesOnly
                ? 'Try adjusting your search query or removing filters to view all entries.'
                : 'Start writing your first entry or pick one of these thoughtful starters to begin reflecting.'}
            </p>
          </div>

          {!searchQuery && !selectedTag && !favoritesOnly ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left pt-2">
              {STARTER_PROMPTS.map((starter, i) => (
                <div
                  key={i}
                  onClick={() => handleCreateFromStarter(starter.title, starter.snippet, starter.tags, starter.mood)}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 cursor-pointer transition-all hover:shadow-md group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg">{MOOD_EMOJIS[starter.mood]}</span>
                    <Plus className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 group-hover:rotate-90 transition-all" />
                  </div>
                  <h4 className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {starter.title}
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                    {starter.snippet}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedTag(null);
                setFavoritesOnly(false);
                setSelectedMood(null);
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
            >
              Reset All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJournals.map(entry => (
            <div
              key={entry.id}
              onClick={() => onSelectJournal(entry.id)}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/60 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                {/* Card Top Row (Date + Mood + Favorite Star) */}
                <div className="flex items-center justify-between gap-2 text-xs text-slate-400 pb-2">
                  <div className="flex items-center gap-1.5 font-medium">
                    {entry.mood && MOOD_EMOJIS[entry.mood] && (
                      <span className="text-base leading-none">{MOOD_EMOJIS[entry.mood]}</span>
                    )}
                    <span>{new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={e => handleToggleFavorite(e, entry.id, entry.favorite)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        entry.favorite ? 'text-amber-500 fill-amber-500' : 'text-slate-300 dark:text-slate-600 hover:text-amber-500'
                      }`}
                      title={entry.favorite ? 'Favorited' : 'Favorite'}
                    >
                      <Star className={`w-3.5 h-3.5 ${entry.favorite ? 'fill-amber-500' : ''}`} />
                    </button>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setDeleteTargetId(entry.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete journal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                  {entry.title || 'Untitled Entry'}
                </h3>

                {/* Content snippet or AI summary */}
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                  {entry.summary ? `✨ ${entry.summary}` : entry.content || '(No written content)'}
                </p>
              </div>

              {/* Card Footer (Tags + Word count + Arrow) */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 flex-wrap overflow-hidden max-w-[80%]">
                  {entry.tags && entry.tags.length > 0 ? (
                    entry.tags.slice(0, 3).map(t => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-medium"
                      >
                        #{t}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      {entry.wordCount || (entry.content ? entry.content.split(/\s+/).length : 0)} words
                    </span>
                  )}
                </div>

                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={deleteTargetId !== null}
        title="Delete Journal Entry"
        message="Are you sure you want to permanently delete this entry? All written text and AI conversation logs will be permanently erased."
        confirmText="Delete Entry"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
