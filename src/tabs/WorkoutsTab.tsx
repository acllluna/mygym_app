import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Play, MoreVertical, X, Check, Clock, Plus, Minus, Trash2, Pause, Square, Dumbbell } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { SessionTemplate, WorkoutSession, LoggedExercise, LoggedSet, Exercise } from '../types';
import WorkoutBuilder from './WorkoutBuilder';
import WorkoutDetails from './WorkoutDetails';
import SessionSummaryModal from './SessionSummaryModal';
import ExerciseDetailsModal from '../components/ExerciseDetailsModal';

export default function WorkoutsTab({ onNavigateToLibrary }: { onNavigateToLibrary?: () => void }) {
  const templates = useLiveQuery(() => db.templates.toArray());
  const sessions = useLiveQuery(() => db.sessions.toArray());
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [viewingTemplateId, setViewingTemplateId] = useState<string | null>(null);

  const startSession = async (template: SessionTemplate) => {
    // Determine PR weight for each exercise
    const allSessions = await db.sessions.toArray();
    
    // Helper to get max weight for an exercise across all history
    const getPrWeight = (exerciseId: string) => {
      let maxWeight = 0;
      allSessions.forEach(session => {
        const logEx = session.exercises.find(e => e.exerciseId === exerciseId);
        if (logEx) {
          logEx.sets.filter(s => s.completed).forEach(s => {
            if (s.weight && s.weight > maxWeight) maxWeight = s.weight;
          });
        }
      });
      return maxWeight;
    };

    const newSession: WorkoutSession = {
      id: uuidv4(),
      templateId: template.id,
      name: template.name,
      startTime: Date.now(),
      exercises: template.exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        sets: Array.from({ length: ex.targetSets }, () => ({
          id: uuidv4(),
          reps: ex.targetReps,
          weight: getPrWeight(ex.exerciseId) || 0, // Pre-populate with PR weight or 0
          completed: false
        }))
      }))
    };
    
    await db.sessions.add(newSession);
    setActiveSession(newSession);
  };

  const deleteTemplate = async (templateId: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      await db.templates.delete(templateId);
    }
  };

  const saveSession = async (finalSession: WorkoutSession, finalElapsed: number) => {
    const updatedSession = {
      ...finalSession,
      endTime: Date.now(),
      duration: finalElapsed
    };
    
    await db.sessions.put(updatedSession);
    setActiveSession(null);
  };

  const discardSession = async (sessionId: string) => {
    await db.sessions.delete(sessionId);
    setActiveSession(null);
  };

  if (activeSession) {
    return (
      <ActiveSessionView 
        session={activeSession} 
        onSave={saveSession}
        onDiscard={discardSession}
        onUpdateSession={setActiveSession} 
      />
    );
  }

  if (showBuilder) {
    return <WorkoutBuilder onClose={() => setShowBuilder(false)} />;
  }

  if (viewingTemplateId) {
    return (
      <WorkoutDetails
        templateId={viewingTemplateId}
        onClose={() => setViewingTemplateId(null)}
        onStart={(t) => {
          setViewingTemplateId(null);
          startSession(t);
        }}
        onAddExerciseClick={() => {
          setViewingTemplateId(null);
          if (onNavigateToLibrary) onNavigateToLibrary();
        }}
      />
    );
  }

  return (
    <div className="px-6 py-8 h-full flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h2 className="text-2xl font-semibold">Workouts</h2>
        {templates && templates.length > 0 && (
          <button 
            onClick={() => setShowBuilder(true)}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full text-sm font-medium border border-white/5 transition-colors"
          >
            <Plus size={16} />
            Create
          </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto pb-20">
        {!templates || templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center text-apple-text-muted h-full mt-10">
            <div className="w-16 h-16 bg-apple-card rounded-full flex items-center justify-center mb-6 border border-white/5 relative">
              <span className="text-2xl absolute">💪</span>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No Routines Yet</h3>
            <p className="max-w-[250px] text-sm mb-8">Create a template from your exercise library to get started logging your workouts.</p>
            <button 
              onClick={() => setShowBuilder(true)}
              className="bg-apple-accent text-black px-6 py-3 rounded-full font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <Plus size={18} />
              Create First Routine
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {templates.map(template => (
              <div 
                key={template.id} 
                onClick={() => setViewingTemplateId(template.id)}
                className="bg-apple-card rounded-3xl p-5 border border-white/5 relative overflow-hidden cursor-pointer hover:bg-white/5 transition-colors"
               >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold pr-8">{template.name}</h3>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      deleteTemplate(template.id, template.name);
                    }}
                    className="p-2 -m-2 text-apple-text-muted hover:text-red-400 transition-colors z-20 relative"
                    title="Delete Routine"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
                {template.description && (
                  <p className="text-sm text-apple-text-muted mb-4">{template.description}</p>
                )}
                <div className="flex justify-between items-center mt-4">
                  <div className="text-xs text-apple-text-muted font-medium">
                    {template.exercises.length} Exercises
                  </div>
                  <div className="text-xs text-apple-text-muted font-medium bg-white/5 px-2 py-1 rounded-lg">
                    {sessions?.filter(s => s.templateId === template.id).length || 0} Completions
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActiveSessionView({ 
  session, 
  onSave,
  onDiscard,
  onUpdateSession 
}: { 
  session: WorkoutSession, 
  onSave: (s: WorkoutSession, elapsed: number) => void,
  onDiscard: (id: string) => void,
  onUpdateSession: (s: WorkoutSession) => void 
}) {
  const [elapsed, setElapsed] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  
  const exercises = useLiveQuery(() => db.exercises.toArray());

  useEffect(() => {
    let interval: number;
    if (isPlaying && !showSummary) {
      interval = window.setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, showSummary]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const toggleSet = async (exerciseIndex: number, setIndex: number) => {
    const newSession = { ...session };
    const currentSet = newSession.exercises[exerciseIndex].sets[setIndex];
    currentSet.completed = !currentSet.completed;
    
    await db.sessions.put(newSession);
    onUpdateSession(newSession);
  };

  const updateSet = async (exerciseIndex: number, setIndex: number, field: 'reps' | 'weight', value: number) => {
    const newSession = { ...session };
    newSession.exercises[exerciseIndex].sets[setIndex][field] = value;
    
    await db.sessions.put(newSession);
    onUpdateSession(newSession);
  };

  const addSet = async (exerciseIndex: number) => {
    const newSession = { ...session };
    const exerciseLogs = newSession.exercises[exerciseIndex];
    const lastSet = exerciseLogs.sets[exerciseLogs.sets.length - 1]; // Copy reps/weight from previous set if available
    
    exerciseLogs.sets.push({
      id: uuidv4(),
      reps: lastSet ? lastSet.reps : 10,
      weight: lastSet ? lastSet.weight : 0,
      completed: false
    });
    
    await db.sessions.put(newSession);
    onUpdateSession(newSession);
  };

  const removeSet = async (exerciseIndex: number) => {
    const newSession = { ...session };
    const exerciseLogs = newSession.exercises[exerciseIndex];
    if (exerciseLogs.sets.length > 1) {
      exerciseLogs.sets.pop(); // Remove the last set
      await db.sessions.put(newSession);
      onUpdateSession(newSession);
    }
  };

  if (!exercises) return null;

  return (
    <div className="fixed inset-0 bg-black z-[60] flex flex-col">
      {/* Sticky Header */}
      <div className="bg-apple-card/90 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h2 className="font-semibold text-lg">{session.name}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-apple-green animate-pulse' : 'bg-yellow-500'}`}></span>
            <span className="text-apple-accent text-sm font-mono tracking-wider">{formatTime(elapsed)}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsPlaying(!isPlaying)} 
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isPlaying ? 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30' : 'bg-apple-green/20 text-apple-green hover:bg-apple-green/30'}`}
          >
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
          </button>
          
          <button 
            onClick={() => {
               setIsPlaying(false);
               setShowSummary(true);
            }} 
            className="w-10 h-10 rounded-full bg-red-500/20 text-red-500 hover:bg-red-500/30 flex items-center justify-center transition-colors"
          >
            <Square size={16} fill="currentColor" />
          </button>
        </div>
      </div>

      {/* Exercises List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-32">
        {session.exercises.map((logEx, exIdx) => {
          const exerciseDef = exercises.find(e => e.id === logEx.exerciseId);
          if (!exerciseDef) return null;

          return (
            <div key={exIdx} className="bg-apple-card rounded-3xl p-5 border border-white/5">
              <div className="flex gap-4 mb-4 items-center">
                <div 
                  className="w-16 h-16 bg-white/5 rounded-2xl overflow-hidden shrink-0 relative cursor-pointer group"
                  onClick={() => setSelectedExercise(exerciseDef)}
                >
                  {exerciseDef.thumbnail_url ? (
                    <img src={exerciseDef.thumbnail_url} alt={exerciseDef.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Dumbbell size={20} className="text-white/20" /></div>
                  )}
                </div>
                <h3 className="font-semibold text-lg text-apple-accent leading-tight">{exerciseDef.name}</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex text-xs font-semibold text-apple-text-muted uppercase tracking-wider px-2">
                  <div className="w-10">Set</div>
                  <div className="flex-1 text-center">kg</div>
                  <div className="flex-1 text-center">Reps</div>
                  <div className="w-10"></div>
                </div>
                
                {logEx.sets.map((set, setIdx) => (
                  <div 
                    key={set.id} 
                    className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${set.completed ? 'bg-white/5 opacity-50' : 'bg-white/10'}`}
                  >
                    <div className="w-8 text-center font-mono text-sm text-apple-text-muted">
                      {setIdx + 1}
                    </div>
                    
                    <div className="flex-1 relative">
                      <input 
                        type="number" 
                        value={set.weight || ''} 
                        onChange={(e) => updateSet(exIdx, setIdx, 'weight', parseFloat(e.target.value) || 0)}
                        className="w-full bg-transparent text-center font-semibold text-lg focus:outline-none"
                        placeholder="-"
                      />
                    </div>
                    
                    <div className="flex-1 relative">
                      <input 
                        type="number" 
                        value={set.reps || ''} 
                        onChange={(e) => updateSet(exIdx, setIdx, 'reps', parseInt(e.target.value) || 0)}
                        className="w-full bg-transparent text-center font-semibold text-lg focus:outline-none"
                        placeholder="-"
                      />
                    </div>
                    
                    <button 
                      onClick={() => toggleSet(exIdx, setIdx)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${set.completed ? 'bg-apple-green text-black scale-95 opacity-80' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    >
                      <Check size={20} strokeWidth={3} />
                    </button>
                  </div>
                ))}

                <div className="flex items-center justify-center gap-4 mt-4 pt-2 border-t border-white/5">
                  <button 
                    onClick={() => removeSet(exIdx)} 
                    disabled={logEx.sets.length <= 1}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-400/10 text-red-400 hover:bg-red-400/20 disabled:opacity-30 disabled:hover:bg-red-400/10 transition-colors text-xs font-semibold"
                  >
                    <Minus size={14} /> Remove Set
                  </button>
                  <button 
                    onClick={() => addSet(exIdx)} 
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-apple-accent/10 text-apple-accent hover:bg-apple-accent/20 transition-colors text-xs font-semibold"
                  >
                    <Plus size={14} /> Add Set
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showSummary && (
        <SessionSummaryModal
          session={session}
          elapsedSeconds={elapsed}
          onSave={() => onSave(session, elapsed)}
          onDiscard={() => onDiscard(session.id)}
        />
      )}

      {selectedExercise && <ExerciseDetailsModal exercise={selectedExercise} onClose={() => setSelectedExercise(null)} />}
    </div>
  );
}
