import { useState, useEffect } from 'react';
import { Dumbbell, Activity, Calendar, User, BookOpen, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import DashboardTab from './tabs/DashboardTab';
import WorkoutsTab from './tabs/WorkoutsTab';
import LibraryTab from './tabs/LibraryTab';
import CoachTab from './tabs/CoachTab';
import { db } from './db';

type Tab = 'summary' | 'workouts' | 'library' | 'coach';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('summary');

  useEffect(() => {

    // Populate the database with the pre-packaged exercises if empty
    const loadInitialExercises = async () => {
      try {
        const count = await db.exercises.count();
        if (count === 0) {
          console.log('Database empty, loading initial exercises...');
          const response = await fetch('/exercises.json');
          if (response.ok) {
            const data = await response.json();
            // Use put for better resilience if some data exists
            await db.exercises.bulkPut(data);
            console.log(`Successfully loaded ${data.length} exercises into DB`);
          }
        }
      } catch (err) {
        console.error('Critical: Database initialization failed', err);
      }
    };
    loadInitialExercises();
  }, []);

  return (
    <div className="h-[100dvh] w-full bg-black text-white flex flex-col font-sans selection:bg-apple-accent/30 overflow-hidden">
      {/* Header */}
      <header className="mobile-header sticky top-0 bg-black z-50 border-b border-white/10 shrink-0 w-full">
        <div className="flex flex-col">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Aura Fitness</h1>
          <p className="text-apple-text-muted text-[10px] sm:text-xs font-medium uppercase tracking-widest mt-0.5">Your Personal AI Coach</p>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="flex-1 h-full flex flex-col overflow-hidden"
          >
            {activeTab === 'summary' && <DashboardTab />}
            {activeTab === 'workouts' && <WorkoutsTab onNavigateToLibrary={() => setActiveTab('library')} />}
            {activeTab === 'library' && <LibraryTab />}
            {activeTab === 'coach' && <CoachTab />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-black/80 backdrop-blur-xl border-t border-white/10 pb-safe pt-2 px-6 sticky bottom-0 z-50">
        <div className="flex justify-between items-center pb-6 pt-2">
          <NavItem icon={<Activity size={24} />} label="Summary" active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} />
          <NavItem icon={<Dumbbell size={24} />} label="Workouts" active={activeTab === 'workouts'} onClick={() => setActiveTab('workouts')} />
          <NavItem icon={<BookOpen size={24} />} label="Library" active={activeTab === 'library'} onClick={() => setActiveTab('library')} />
          <NavItem icon={<Bot size={24} />} label="Coach" active={activeTab === 'coach'} onClick={() => setActiveTab('coach')} />
        </div>
      </nav>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${active ? 'text-apple-accent' : 'text-apple-text-muted hover:text-white'}`}>
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
