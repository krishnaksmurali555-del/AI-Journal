import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { LandingPage } from './components/LandingPage';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { JournalEditorView } from './components/JournalEditorView';
import { AskMyJournalModal } from './components/AskMyJournalModal';
import { ReflectionsModal } from './components/ReflectionsModal';
import { StatsModal } from './components/StatsModal';
import { api } from './services/api';
import { Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentJournalId, setCurrentJournalId] = useState<string | null>(null);
  const [writingStreak, setWritingStreak] = useState<number>(0);
  const [creatingJournal, setCreatingJournal] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  // Modals state
  const [askModalOpen, setAskModalOpen] = useState(false);
  const [reflectionsModalOpen, setReflectionsModalOpen] = useState(false);
  const [statsModalOpen, setStatsModalOpen] = useState(false);

  // Load streak when user logs in
  useEffect(() => {
    if (user) {
      api.getStats()
        .then(stats => setWritingStreak(stats.writingStreak))
        .catch(() => {});
    }
  }, [user, currentJournalId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-sm font-semibold tracking-wide">Initializing secure session...</p>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  const handleCreateNewJournal = async () => {
    try {
      setCreatingJournal(true);
      setAppError(null);
      const newEntry = await api.createJournal({
        title: 'New Journal Entry',
        content: '',
        tags: [],
        mood: '',
      });
      setCurrentJournalId(newEntry.id);
    } catch (err: any) {
      console.error('Failed to create new journal:', err);
      setAppError(err.message || 'Failed to create journal entry.');
    } finally {
      setCreatingJournal(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-150">
      {/* Top Navbar */}
      <Navbar
        onNewJournal={handleCreateNewJournal}
        onOpenAskMyJournal={() => setAskModalOpen(true)}
        onOpenReflections={() => setReflectionsModalOpen(true)}
        onOpenStats={() => setStatsModalOpen(true)}
        writingStreak={writingStreak}
      />

      {/* Global Error Banner */}
      {appError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full">
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
            <span className="font-medium">{appError}</span>
            <button
              onClick={() => setAppError(null)}
              className="ml-3 font-semibold text-rose-500 hover:text-rose-700 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main view router */}
      <main className="flex-1">
        {currentJournalId ? (
          <JournalEditorView
            journalId={currentJournalId}
            onBack={() => setCurrentJournalId(null)}
            onDeleteSuccess={() => setCurrentJournalId(null)}
          />
        ) : (
          <DashboardView
            onSelectJournal={(id) => setCurrentJournalId(id)}
            onNewJournal={handleCreateNewJournal}
            onOpenStats={() => setStatsModalOpen(true)}
            onOpenAskMyJournal={() => setAskModalOpen(true)}
            onOpenReflections={() => setReflectionsModalOpen(true)}
          />
        )}
      </main>

      {/* Global Modals */}
      <AskMyJournalModal
        isOpen={askModalOpen}
        onClose={() => setAskModalOpen(false)}
        onSelectJournal={(id) => setCurrentJournalId(id)}
      />

      <ReflectionsModal
        isOpen={reflectionsModalOpen}
        onClose={() => setReflectionsModalOpen(false)}
      />

      <StatsModal
        isOpen={statsModalOpen}
        onClose={() => setStatsModalOpen(false)}
      />
    </div>
  );
};

export default App;
