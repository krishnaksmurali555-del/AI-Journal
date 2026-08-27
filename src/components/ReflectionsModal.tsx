import React, { useState } from 'react';
import { X, Calendar, Sparkles, CheckCircle2, HelpCircle, ArrowRight, Loader2, Compass, Award } from 'lucide-react';
import { api } from '../services/api';
import { WeeklyReflectionResponse, MonthlyReflectionResponse } from '../types';

interface ReflectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReflectionsModal: React.FC<ReflectionsModalProps> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<'weekly' | 'monthly'>('weekly');
  const [loading, setLoading] = useState(false);
  const [weeklyData, setWeeklyData] = useState<WeeklyReflectionResponse | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyReflectionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateWeekly = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getWeeklyReflection();
      setWeeklyData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to synthesize weekly reflection.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMonthly = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getMonthlyReflection();
      setMonthlyData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to synthesize monthly reflection.');
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
            <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">AI Periodic Reflections</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Holistic analysis of your progress, recurring patterns & mindset</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="mt-4 flex items-center gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 self-start">
          <button
            type="button"
            onClick={() => {
              setTab('weekly');
              setError(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === 'weekly'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Weekly Reflection (7 Days)
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('monthly');
              setError(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === 'monthly'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Monthly Reflection (30 Days)
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-6 flex-1 overflow-y-auto pr-1">
          {error && (
            <div className="mb-4 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-sm">
              {error}
            </div>
          )}

          {tab === 'weekly' ? (
            <div>
              {!weeklyData && !loading ? (
                <div className="py-14 text-center">
                  <Calendar className="w-12 h-12 mx-auto text-indigo-400 mb-3" />
                  <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                    Synthesize Your Past 7 Days
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                    Gemini will analyze your journal entries from the past week to extract focus areas, learnings, changes, and next steps.
                  </p>
                  <button
                    onClick={handleGenerateWeekly}
                    className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate Weekly Reflection
                  </button>
                </div>
              ) : loading ? (
                <div className="py-16 text-center text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-3" />
                  <p className="text-sm font-medium">Gemini is synthesizing your week...</p>
                  <p className="text-xs text-slate-400 mt-1">Reviewing your recent journal entries</p>
                </div>
              ) : weeklyData ? (
                <div className="space-y-5 animate-fade-in">
                  <div className="p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Weekly Executive Summary</span>
                    <p className="mt-2 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                      {weeklyData.summary}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2.5">
                        🎯 Focus Areas
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                        {weeklyData.focusAreas.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-indigo-500">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2.5">
                        🔄 What Shifted or Changed
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {weeklyData.whatChanged}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2.5">
                        💡 Key Learnings
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                        {weeklyData.thingsLearned.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2.5">
                        ❓ Questions to Consider
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                        {weeklyData.questionsToConsider.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <HelpCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Next Steps */}
                  <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 mb-2">
                      🚀 Suggested Next Steps
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {weeklyData.suggestedNextSteps.map((step, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-xs text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 shadow-sm"
                        >
                          <ArrowRight className="w-3 h-3 text-emerald-500" />
                          <span>{step}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={handleGenerateWeekly}
                      className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-semibold"
                    >
                      ↻ Re-generate Weekly Reflection
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div>
              {!monthlyData && !loading ? (
                <div className="py-14 text-center">
                  <Award className="w-12 h-12 mx-auto text-violet-400 mb-3" />
                  <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                    Synthesize Your Past 30 Days
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                    Deep monthly overview identifying major themes, goal milestones, recurring challenges, and long-term trajectory.
                  </p>
                  <button
                    onClick={handleGenerateMonthly}
                    className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-md shadow-violet-600/20 transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate Monthly Reflection
                  </button>
                </div>
              ) : loading ? (
                <div className="py-16 text-center text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-violet-600 mb-3" />
                  <p className="text-sm font-medium">Gemini is synthesizing your monthly trajectory...</p>
                  <p className="text-xs text-slate-400 mt-1">Reviewing entries across 30 days</p>
                </div>
              ) : monthlyData ? (
                <div className="space-y-5 animate-fade-in">
                  <div className="p-5 rounded-2xl bg-violet-50/60 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/40">
                    <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">Monthly Overview</span>
                    <p className="mt-2 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                      {monthlyData.summary}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2.5">
                        🌟 Major Themes & Topics
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {monthlyData.majorThemes.concat(monthlyData.frequentlyDiscussedTopics).map((t, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-medium border border-indigo-100 dark:border-indigo-900/30">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2.5">
                        📈 Progress & Positive Milestones
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                        {monthlyData.progress.concat(monthlyData.positiveDevelopments).map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2.5">
                        ⚠️ Navigated Challenges
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                        {monthlyData.challenges.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-amber-500">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2.5">
                        🧭 Goals & Trajectory
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                        {monthlyData.goals.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <ArrowRight className="w-3.5 h-3.5 text-violet-500 shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={handleGenerateMonthly}
                      className="text-xs text-violet-600 hover:text-violet-700 dark:text-violet-400 font-semibold"
                    >
                      ↻ Re-generate Monthly Reflection
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>🔒 Only considers your private authenticated journals.</span>
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
