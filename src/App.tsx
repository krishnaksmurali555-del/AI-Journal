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
      const newEntry = await api.createJournal({
        title: 'New Journal Entry',
        content: '',
        tags: [],
        mood: '',
      });
      setCurrentJournalId(newEntry.id);
    } catch (err) {
      console.error('Failed to create new journal:', err);
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
