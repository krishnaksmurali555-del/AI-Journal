import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Star, 
  Trash2, 
  Download, 
  Sparkles, 
  MessageSquare, 
  FileText, 
  Lightbulb, 
  Rocket, 
  CheckSquare, 
  HelpCircle, 
  Send, 
  Loader2, 
  Smile, 
  Tag as TagIcon, 
  X, 
  Plus, 
  ChevronRight, 
  Bot, 
  User,
  Clock,
  Share2
} from 'lucide-react';
import { JournalEntry, JournalMessage, MoodType } from '../types';
import { api } from '../services/api';
import { exportJournalAsPdf, exportJournalAsMarkdown, exportJournalAsTxt, exportJournalAsJson } from '../utils/export';
import { ConfirmModal } from './ConfirmModal';

interface JournalEditorViewProps {
  journalId: string;
  onBack: () => void;
  onDeleteSuccess: () => void;
}

const MOODS: { type: MoodType; emoji: string; label: string }[] = [
  { type: 'happy', emoji: '😊', label: 'Happy' },
  { type: 'good', emoji: '🙂', label: 'Good' },
  { type: 'neutral', emoji: '😐', label: 'Neutral' },
  { type: 'worried', emoji: '😟', label: 'Worried' },
  { type: 'sad', emoji: '😔', label: 'Sad' },
  { type: 'angry', emoji: '😡', label: 'Angry' },
];

export const JournalEditorView: React.FC<JournalEditorViewProps> = ({
  journalId,
  onBack,
  onDeleteSuccess,
}) => {
  const [journal, setJournal] = useState<JournalEntry | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<MoodType>('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [error, setError] = useState<string | null>(null);

  // AI Features State
  const [chatOpen, setChatOpen] = useState(true);
  const [messages, setMessages] = useState<JournalMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [aiActionLoading, setAiActionLoading] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Load Journal Data
  useEffect(() => {
    loadJournal();
  }, [journalId]);

  // Close export menu on click outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const loadJournal = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getJournal(journalId);
      setJournal(data);
      setTitle(data.title || '');
      setContent(data.content || '');
      setMood(data.mood || '');
      setTags(data.tags || []);
      setFavorite(data.favorite || false);
      setMessages(data.messages || []);
      setSaveStatus('saved');
    } catch (err: any) {
      setError(err.message || 'Failed to load journal.');
    } finally {
      setLoading(false);
    }
  };

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatOpen]);

  const handleContentChange = (newVal: string) => {
    setContent(newVal);
    setSaveStatus('unsaved');
  };

  const handleTitleChange = (newVal: string) => {
    setTitle(newVal);
    setSaveStatus('unsaved');
  };

  // Manual or Triggered Save
  const handleSave = async () => {
    if (!journal) return;
    try {
      setSaving(true);
      setSaveStatus('saving');
      const updated = await api.updateJournal(journalId, {
        title: title.trim() || 'Untitled Entry',
        content,
        mood,
        tags,
        favorite,
      });
      setJournal(prev => prev ? { ...prev, ...updated } : updated);
      setSaveStatus('saved');
    } catch (err: any) {
      console.error('Save failed:', err);
      setError(err.message || 'Failed to save changes.');
      setSaveStatus('unsaved');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFavorite = async () => {
    const nextVal = !favorite;
    setFavorite(nextVal);
    try {
      await api.toggleFavorite(journalId, nextVal);
      setJournal(prev => prev ? { ...prev, favorite: nextVal } : null);
    } catch (err) {
      setFavorite(!nextVal); // revert
    }
  };

  const handleAddTag = () => {
    const cleanTag = newTagInput.trim().replace(/^#/, '').toLowerCase();
    if (cleanTag && !tags.includes(cleanTag)) {
      const newTags = [...tags, cleanTag];
      setTags(newTags);
      setNewTagInput('');
      setSaveStatus('unsaved');
      api.updateJournal(journalId, { tags: newTags }).catch(console.error);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter(t => t !== tagToRemove);
    setTags(newTags);
    setSaveStatus('unsaved');
    api.updateJournal(journalId, { tags: newTags }).catch(console.error);
  };

  const handleSelectMood = (selectedMood: MoodType) => {
    const nextMood = mood === selectedMood ? '' : selectedMood;
    setMood(nextMood);
    setSaveStatus('unsaved');
    api.updateJournal(journalId, { mood: nextMood }).catch(console.error);
  };

  // AI Actions Handlers
  const handleSummarize = async () => {
    if (!content.trim()) {
      setError('Please write some content first to generate a summary.');
      return;
    }
    try {
      setAiActionLoading('summarize');
      setError(null);
      // Auto save content first
      await handleSave();
      const res = await api.summarizeJournal(journalId);
      setJournal(prev => prev ? { ...prev, summary: res.summary } : null);
    } catch (err: any) {
      setError(err.message || 'Failed to summarize journal.');
    } finally {
      setAiActionLoading(null);
    }
  };

  const handleReflect = async () => {
    if (!content.trim()) {
      setError('Please write some content first to generate reflections.');
      return;
    }
    try {
      setAiActionLoading('reflect');
      setError(null);
      await handleSave();
      const res = await api.reflectJournal(journalId);
      setJournal(prev => prev ? { ...prev, reflection: res.reflection } : null);
    } catch (err: any) {
      setError(err.message || 'Failed to generate reflection.');
    } finally {
      setAiActionLoading(null);
    }
  };

  const handleBrainstorm = async () => {
    if (!content.trim()) {
      setError('Please write some content first to brainstorm ideas.');
      return;
    }
    try {
      setAiActionLoading('brainstorm');
      setError(null);
      await handleSave();
      const res = await api.brainstormJournal(journalId);
      setJournal(prev => prev ? { ...prev, brainstorm: res.brainstorm } : null);
    } catch (err: any) {
      setError(err.message || 'Failed to brainstorm ideas.');
    } finally {
      setAiActionLoading(null);
    }
  };

  const handleKeyPoints = async () => {
    if (!content.trim()) {
      setError('Please write some content first to extract key points.');
      return;
    }
    try {
      setAiActionLoading('key-points');
      setError(null);
      await handleSave();
      const res = await api.keyPointsJournal(journalId);
      setJournal(prev => prev ? { ...prev, keyPoints: res.keyPoints } : null);
    } catch (err: any) {
      setError(err.message || 'Failed to extract key points.');
    } finally {
      setAiActionLoading(null);
    }
  };

  const handleQuestions = async () => {
    if (!content.trim()) {
      setError('Please write some content first to generate questions.');
      return;
    }
    try {
      setAiActionLoading('questions');
      setError(null);
      await handleSave();
      const res = await api.questionsJournal(journalId);
      setJournal(prev => prev ? { ...prev, questions: res.questions } : null);
    } catch (err: any) {
      setError(err.message || 'Failed to generate questions.');
    } finally {
      setAiActionLoading(null);
    }
  };

  // Send Message in Multi-Turn Chat
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const userMsg = chatInput.trim();
    if (!userMsg || chatLoading) return;

    setChatInput('');
    setChatLoading(true);
    setError(null);

    // Optimistic UI update
    const tempUserMsg: JournalMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMsg,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const response = await api.sendMessage(journalId, userMsg);
      // Replace with confirmed response
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempUserMsg.id),
        response.userMessage,
        response.assistantMessage,
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to send message to Gemini.');
    } finally {
      setChatLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await api.deleteJournal(journalId);
      onDeleteSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to delete journal.');
      setLoading(false);
    }
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  if (loading && !journal) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-medium">Loading your private journal...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <span className="text-slate-300 dark:text-slate-700">•</span>

          <span className="text-xs text-slate-500 dark:text-slate-400">
            {saveStatus === 'saving' ? (
              <span className="inline-flex items-center gap-1 text-indigo-500">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving...
              </span>
            ) : saveStatus === 'unsaved' ? (
              <span className="text-amber-500">Unsaved edits</span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400">Saved to Cloud</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Favorite */}
          <button
            onClick={handleToggleFavorite}
            title={favorite ? 'Remove from favorites' : 'Add to favorites'}
            className={`p-2 rounded-xl transition-colors ${
              favorite
                ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-500 fill-amber-500 border border-amber-200/60 dark:border-amber-900/40'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Star className={`w-4 h-4 ${favorite ? 'fill-amber-500 text-amber-500' : ''}`} />
          </button>

          {/* Export Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200/60 dark:border-slate-700/60"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            {exportMenuOpen && journal && (
              <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 text-xs font-medium z-50 animate-fade-in">
                <button
                  onClick={() => {
                    setExportMenuOpen(false);
                    exportJournalAsPdf({ ...journal, title, content, mood, tags, favorite, messages });
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  📄 Export as PDF
                </button>
                <button
                  onClick={() => {
                    setExportMenuOpen(false);
                    exportJournalAsMarkdown({ ...journal, title, content, mood, tags, favorite, messages });
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  📝 Export as Markdown (.md)
                </button>
                <button
                  onClick={() => {
                    setExportMenuOpen(false);
                    exportJournalAsTxt({ ...journal, title, content, mood, tags, favorite, messages });
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  📋 Export as Plain Text (.txt)
                </button>
                <button
                  onClick={() => {
                    setExportMenuOpen(false);
                    exportJournalAsJson({ ...journal, title, content, mood, tags, favorite, messages });
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  📦 Export as JSON (.json)
                </button>
              </div>
            )}
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save</span>
          </button>

          {/* Delete */}
          <button
            onClick={() => setDeleteModalOpen(true)}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Delete this journal"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Main Workspace Layout (Editor + Gemini Chat Drawer) */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Center: Writing Canvas & AI Insights (Col 7 or 8) */}
        <div className={`space-y-6 transition-all ${chatOpen ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
          {/* Metadata Bar (Mood & Tags) */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            {/* Mood selector */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1">
                <Smile className="w-3.5 h-3.5" /> Mood:
              </span>
              {MOODS.map(m => (
                <button
                  key={m.type}
                  type="button"
                  onClick={() => handleSelectMood(m.type)}
                  className={`px-2.5 py-1 rounded-xl text-xs flex items-center gap-1 transition-all ${
                    mood === m.type
                      ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 font-bold ring-2 ring-indigo-500/40 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200/60 dark:border-slate-700'
                  }`}
                >
                  <span>{m.emoji}</span>
                  <span className="text-[11px]">{m.label}</span>
                </button>
              ))}
            </div>

            {/* Word stats */}
            <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500 font-medium">
              <span>{wordCount} words</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {readTimeMinutes} min read
              </span>
            </div>
          </div>

          {/* Tags list */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-slate-400 flex items-center gap-1 font-medium">
              <TagIcon className="w-3 h-3" /> Tags:
            </span>
            {tags.map(t => (
              <span
                key={t}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-200/50 dark:border-indigo-900/40 text-xs"
              >
                <span>#{t}</span>
                <button onClick={() => handleRemoveTag(t)} className="hover:text-rose-500">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <div className="inline-flex items-center gap-1">
              <input
                type="text"
                value={newTagInput}
                onChange={e => setNewTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add tag + Enter"
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 w-28"
              />
            </div>
          </div>

          {/* Editor Canvas */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <input
              type="text"
              value={title}
              onChange={e => handleTitleChange(e.target.value)}
              placeholder="Journal Title..."
              className="w-full text-2xl sm:text-3xl font-extrabold tracking-tight bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none"
            />

            <textarea
              value={content}
              onChange={e => handleContentChange(e.target.value)}
              placeholder="What is on your mind today? Write freely about your thoughts, challenges, ideas, or reflections..."
              rows={16}
              className="w-full text-base sm:text-lg leading-relaxed bg-transparent text-slate-800 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none resize-y min-h-[300px]"
            />
          </div>

          {/* AI Quick Actions Bar */}
          <div className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> AI Reflection Tools
              </span>
              <button
                onClick={() => setChatOpen(!chatOpen)}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {chatOpen ? 'Hide Chat' : 'Open Gemini Dialogue'}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleSummarize}
                disabled={aiActionLoading !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 shadow-2xs transition-all disabled:opacity-50"
              >
                {aiActionLoading === 'summarize' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" /> : <FileText className="w-3.5 h-3.5 text-indigo-500" />}
                <span>Summarize</span>
              </button>

              <button
                onClick={handleReflect}
                disabled={aiActionLoading !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 shadow-2xs transition-all disabled:opacity-50"
              >
                {aiActionLoading === 'reflect' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" /> : <Lightbulb className="w-3.5 h-3.5 text-violet-500" />}
                <span>Reflect</span>
              </button>

              <button
                onClick={handleBrainstorm}
                disabled={aiActionLoading !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 shadow-2xs transition-all disabled:opacity-50"
              >
                {aiActionLoading === 'brainstorm' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" /> : <Rocket className="w-3.5 h-3.5 text-emerald-500" />}
                <span>Brainstorm</span>
              </button>

              <button
                onClick={handleKeyPoints}
                disabled={aiActionLoading !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 shadow-2xs transition-all disabled:opacity-50"
              >
                {aiActionLoading === 'key-points' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" /> : <CheckSquare className="w-3.5 h-3.5 text-amber-500" />}
                <span>Key Points</span>
              </button>

              <button
                onClick={handleQuestions}
                disabled={aiActionLoading !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 shadow-2xs transition-all disabled:opacity-50"
              >
                {aiActionLoading === 'questions' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" /> : <HelpCircle className="w-3.5 h-3.5 text-rose-500" />}
                <span>Questions</span>
              </button>
            </div>
          </div>

          {/* Generated AI Insights Cards (Persistent) */}
          {journal && (journal.summary || journal.reflection || journal.brainstorm || journal.keyPoints?.length || journal.questions?.length) && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Generated Insights & Analysis
              </h3>

              {/* Summary */}
              {journal.summary && (
                <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> AI Summary
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                    {journal.summary}
                  </p>
                </div>
              )}

              {/* Reflection */}
              {journal.reflection && (
                <div className="p-5 rounded-2xl bg-violet-50/50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/40">
                  <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 flex items-center gap-1.5 mb-2">
                    <Lightbulb className="w-3.5 h-3.5" /> AI Reflection & Themes
                  </span>
                  <div className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line">
                    {journal.reflection}
                  </div>
                </div>
              )}

              {/* Brainstorm */}
              {journal.brainstorm && (
                <div className="p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-2">
                    <Rocket className="w-3.5 h-3.5" /> Brainstormed Ideas & Angles
                  </span>
                  <div className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line">
                    {journal.brainstorm}
                  </div>
                </div>
              )}

              {/* Key points */}
              {journal.keyPoints && journal.keyPoints.length > 0 && (
                <div className="p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5 mb-2.5">
                    <CheckSquare className="w-3.5 h-3.5" /> Key Takeaways
                  </span>
                  <ul className="space-y-1.5 text-sm text-slate-800 dark:text-slate-200">
                    {journal.keyPoints.map((kp, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{kp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Questions */}
              {journal.questions && journal.questions.length > 0 && (
                <div className="p-5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5 mb-2.5">
                    <HelpCircle className="w-3.5 h-3.5" /> Questions to Ponder
                  </span>
                  <ul className="space-y-2 text-sm text-slate-800 dark:text-slate-200">
                    {journal.questions.map((q, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-rose-500 font-semibold">Q{idx + 1}:</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Multi-Turn Gemini Conversation (Col 5) */}
        {chatOpen && (
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col h-[750px] sticky top-24">
            {/* Chat header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Gemini Reflection Chat</h4>
                  <p className="text-[11px] text-slate-400">Contextual to this journal entry</p>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat messages list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {messages.length === 0 ? (
                <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs px-4">
                  <Bot className="w-8 h-8 mx-auto text-indigo-400/80 mb-2" />
                  <p className="font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Have a multi-turn conversation with Gemini
                  </p>
                  <p className="leading-relaxed">
                    Ask questions about your thoughts, seek fresh perspectives, or explore feelings deeper.
                  </p>
                </div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role !== 'user' && (
                      <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-1">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-tr-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-xs'
                      }`}
                    >
                      <p className="whitespace-pre-line">{msg.content}</p>
                      <span className="block text-[10px] mt-1 opacity-60 text-right">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}

              {chatLoading && (
                <div className="flex gap-2.5 justify-start">
                  <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-tl-xs flex items-center gap-2 text-xs">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                    <span>Gemini is thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat suggestions */}
            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-1.5 overflow-x-auto text-[11px] whitespace-nowrap">
              <button
                type="button"
                onClick={() => {
                  setChatInput('What underlying theme or pattern do you notice here?');
                }}
                className="px-2 py-1 rounded-md bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700"
              >
                🔍 What pattern is here?
              </button>
              <button
                type="button"
                onClick={() => {
                  setChatInput('What is a supportive next step I could take?');
                }}
                className="px-2 py-1 rounded-md bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700"
              >
                🚀 What's a next step?
              </button>
            </div>

            {/* Chat input form */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ask Gemini about your entry..."
                disabled={chatLoading}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white transition-all shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Journal Entry"
        message="Are you sure you want to permanently delete this journal entry and its conversation history? This action cannot be undone."
        confirmText="Delete Entry"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
};
