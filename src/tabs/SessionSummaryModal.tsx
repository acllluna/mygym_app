import { X } from 'lucide-react';
import { WorkoutSession } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

interface SessionSummaryModalProps {
  session: WorkoutSession;
  elapsedSeconds: number;
  onSave: () => void;
  onDiscard: () => void;
}

export default function SessionSummaryModal({ session, elapsedSeconds, onSave, onDiscard }: SessionSummaryModalProps) {
  const allExercises = useLiveQuery(() => db.exercises.toArray());
  if (!allExercises) return null;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}m ${s}s`;
  };

  let totalVolume = 0;
  let totalSets = 0;
  const completedExercises = session.exercises.filter(ex => {
    const completedSets = ex.sets.filter(s => s.completed);
    completedSets.forEach(s => {
      totalSets++;
      if (s.weight && s.reps) {
        totalVolume += (s.weight * s.reps);
      }
    });
    return completedSets.length > 0;
  });

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 select-none font-sans text-white">
      <div className="bg-apple-card w-full max-w-sm rounded-[32px] overflow-hidden border border-white/10 shadow-2xl flex flex-col shadow-black/80">
        <div className="px-6 py-5 border-b border-white/5 bg-white/5 flex items-center justify-between">
          <h2 className="font-bold text-xl">Workout Finished</h2>
          <button onClick={onDiscard} className="p-2 -mr-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <h3 className="text-2xl font-semibold mb-6 text-center text-apple-accent">{session.name}</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-black/40 rounded-2xl p-4 border border-white/5 text-center">
              <div className="text-xs text-apple-text-muted font-bold uppercase tracking-wider mb-1">Time</div>
              <div className="text-xl font-medium w-full truncate">{formatTime(elapsedSeconds)}</div>
            </div>
            <div className="bg-black/40 rounded-2xl p-4 border border-white/5 text-center">
              <div className="text-xs text-apple-text-muted font-bold uppercase tracking-wider mb-1">Volume</div>
              <div className="text-xl font-medium truncate">{totalVolume}<span className="text-sm text-apple-text-muted ml-0.5">kg</span></div>
            </div>
          </div>

          <div className="mb-8">
            <h4 className="text-sm font-semibold text-apple-text-muted uppercase tracking-wider mb-3">Completed ({completedExercises.length})</h4>
            <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
              {completedExercises.length === 0 ? (
                <div className="text-sm text-apple-text-muted">No exercises completed.</div>
              ) : (
                completedExercises.map((logEx, i) => {
                  const exDef = allExercises.find(e => e.id === logEx.exerciseId);
                  const setsDone = logEx.sets.filter(s => s.completed).length;
                  return (
                    <div key={i} className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-xl">
                      <span className="font-medium text-sm truncate pr-4">{exDef?.name || 'Unknown'}</span>
                      <span className="text-xs font-bold text-apple-text-muted bg-black/40 px-2 py-1 rounded bg-white/10">{setsDone} sets</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button 
              onClick={onSave}
              className="w-full bg-apple-green text-black py-4 rounded-2xl font-bold text-base hover:opacity-90 transition-opacity"
            >
              Save Session
            </button>
            <button 
              onClick={onDiscard}
              className="w-full bg-white/10 text-white py-4 rounded-2xl font-bold text-base hover:bg-white/20 transition-colors"
            >
              Discard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
