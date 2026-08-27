import React, { useState } from 'react';
import { X, Sparkles, Send, BookOpen, Clock, Loader2, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { AskMyJournalResponse } from '../types';

interface AskMyJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectJournal: (id: string) => void;
}

const SAMPLE_QUERIES = [
  'What have I been worried about most recently?',
  'What key learnings or breakthroughs did I document?',
  'What are my recurring thoughts around career & growth?',
  'How has my mood evolved over my recent reflections?',
];

export const AskMyJournalModal: React.FC<AskMyJournalModalProps> = ({
  isOpen,
  onClose,
  onSelectJournal,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AskMyJournalResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (queryText?: string) => {
    const q = (queryText || query).trim();
    if (!q) return;

    if (queryText) setQuery(queryText);

    try {
      setLoading(true);
      setError(null);
      const res = await api.askMyJournal(q);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to query your journals.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Ask My Journal</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Ask Gemini anything across your private journal history</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Query Input */}
        <div className="mt-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="relative flex items-center"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. What recurring challenges have I mentioned recently?"
              disabled={loading}
              className="w-full pl-4 pr-12 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2 p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white transition-all shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>

          {/* Quick Prompts */}
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 font-medium">Try asking:</span>
            {SAMPLE_QUERIES.map((sample, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSearch(sample)}
                disabled={loading}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/60 dark:border-slate-700/60 transition-colors"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        {/* Results Area */}
        <div className="mt-6 flex-1 overflow-y-auto space-y-6 pr-1">
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
              <p className="text-sm font-medium">Analyzing your private journal archive...</p>
              <p className="text-xs text-slate-400 mt-1">Connecting thoughts across your entries with Gemini</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-sm">
              {error}
            </div>
          )}

          {result && !loading && (
            <div className="space-y-6 animate-fade-in">
              {/* Answer Card */}
              <div className="p-6 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                  <span>Synthesized Insight</span>
                </div>
                <div className="text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line font-normal">
                  {result.answer}
                </div>
              </div>

              {/* Referenced Entries */}
              {result.referencedJournals && result.referencedJournals.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Relevant Journal Entries</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {result.referencedJournals.map((j) => (
                      <div
                        key={j.id}
                        onClick={() => {
                          onClose();
                          onSelectJournal(j.id);
                        }}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 cursor-pointer transition-all hover:shadow-md group"
                      >
                        <div className="flex items-start justify-between">
                          <h5 className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {j.title}
                          </h5>
                          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(j.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {j.snippet}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>🔒 Scoped strictly to your authenticated records.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
