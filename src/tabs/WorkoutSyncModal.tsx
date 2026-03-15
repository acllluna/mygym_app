import { useState, useEffect } from 'react';
import { X, Save, Trash2, Plus, GripVertical, CheckCircle2 } from 'lucide-react';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { Exercise } from '../types';

interface ProposedExercise {
  name: string;
  targetSets: number;
  targetReps: number;
}

interface ProposedTemplate {
  name: string;
  description: string;
  exercises: ProposedExercise[];
}

interface WorkoutSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: { templates: ProposedTemplate[] };
  onImportComplete: (count: number) => void;
}

export default function WorkoutSyncModal({ isOpen, onClose, plan, onImportComplete }: WorkoutSyncModalProps) {
  const [editedPlan, setEditedPlan] = useState<ProposedTemplate[]>([]);
  const [library, setLibrary] = useState<Exercise[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEditedPlan(JSON.parse(JSON.stringify(plan.templates)));
      loadLibrary();
    }
  }, [isOpen, plan]);

  const loadLibrary = async () => {
    const exercises = await db.exercises.toArray();
    setLibrary(exercises);
  };

  const handleUpdateExercise = (tIdx: number, eIdx: number, updates: Partial<ProposedExercise>) => {
    const newPlan = [...editedPlan];
    newPlan[tIdx].exercises[eIdx] = { ...newPlan[tIdx].exercises[eIdx], ...updates };
    setEditedPlan(newPlan);
  };

  const handleRemoveExercise = (tIdx: number, eIdx: number) => {
    const newPlan = [...editedPlan];
    newPlan[tIdx].exercises.splice(eIdx, 1);
    setEditedPlan(newPlan);
  };

  const handleImport = async () => {
    setIsSaving(true);
    try {
      let savedCount = 0;
      for (const t of editedPlan) {
        if (t.exercises.length === 0) continue;

        const templateExercises = [];
        for (const ex of t.exercises) {
          const matchedEx = library.find(e => 
            e.name.toLowerCase() === ex.name.toLowerCase() || 
            e.name.toLowerCase().includes(ex.name.toLowerCase())
          );
          
          if (matchedEx) {
            templateExercises.push({
              exerciseId: matchedEx.id,
              targetSets: ex.targetSets,
              targetReps: ex.targetReps
            });
          }
        }

        if (templateExercises.length > 0) {
          await db.templates.add({
            id: uuidv4(),
            name: t.name,
            description: t.description || "",
            exercises: templateExercises,
            createdAt: Date.now()
          });
          savedCount++;
        }
      }
      onImportComplete(savedCount);
      onClose();
    } catch (error) {
      console.error("Import failed", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-apple-card border border-white/10 rounded-[32px] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 sm:px-8 sm:py-6 border-b border-white/5 bg-black/40">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Review Workouts</h2>
            <p className="text-[9px] sm:text-[10px] text-apple-text-muted mt-0.5 uppercase font-black tracking-widest">Aura Sync v2</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} className="sm:size-24" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 sm:space-y-10">
          {editedPlan.map((template, tIdx) => (
            <div key={tIdx} className="space-y-6">
              <div className="space-y-2">
                <input
                  type="text"
                  value={template.name}
                  onChange={(e) => {
                    const newPlan = [...editedPlan];
                    newPlan[tIdx].name = e.target.value;
                    setEditedPlan(newPlan);
                  }}
                  className="w-full bg-transparent text-xl font-bold focus:outline-none border-b border-transparent focus:border-apple-accent pb-1"
                />
                <textarea
                  value={template.description}
                  onChange={(e) => {
                    const newPlan = [...editedPlan];
                    newPlan[tIdx].description = e.target.value;
                    setEditedPlan(newPlan);
                  }}
                  placeholder="Workout description..."
                  className="w-full bg-transparent text-sm text-apple-text-muted focus:outline-none resize-none h-12"
                />
              </div>

              <div className="space-y-3">
                {template.exercises.map((exercise, eIdx) => {
                  const isMatched = library.some(e => 
                    e.name.toLowerCase() === exercise.name.toLowerCase() || 
                    e.name.toLowerCase().includes(exercise.name.toLowerCase())
                  );
                  
                  return (
                    <div key={eIdx} className="group flex items-start sm:items-center gap-3 sm:gap-4 bg-white/5 hover:bg-white/10 p-3 sm:p-4 rounded-2xl transition-all border border-white/5">
                      <div className="pt-2 sm:pt-0">
                        <GripVertical size={14} className="text-white/20 sm:size-16" />
                      </div>
                      
                      <div className="flex-1 space-y-1.5 sm:space-y-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <input
                            type="text"
                            value={exercise.name}
                            onChange={(e) => handleUpdateExercise(tIdx, eIdx, { name: e.target.value })}
                            className="bg-transparent font-medium focus:outline-none border-b border-transparent focus:border-apple-accent flex-1 text-sm sm:text-base"
                          />
                          {isMatched ? (
                            <div className="flex items-center gap-1 text-[10px] text-apple-green font-bold uppercase tracking-tighter">
                              <CheckCircle2 size={10} /> Link Found
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-[10px] text-red-400 font-bold uppercase tracking-tighter">
                              <X size={10} /> Generic
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold text-apple-text-muted">Sets</span>
                            <input
                              type="number"
                              value={exercise.targetSets}
                              onChange={(e) => handleUpdateExercise(tIdx, eIdx, { targetSets: parseInt(e.target.value) || 0 })}
                              className="w-8 bg-transparent text-sm font-bold focus:outline-none text-apple-accent"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold text-apple-text-muted">Reps</span>
                            <input
                              type="number"
                              value={exercise.targetReps}
                              onChange={(e) => handleUpdateExercise(tIdx, eIdx, { targetReps: parseInt(e.target.value) || 0 })}
                              className="w-8 bg-transparent text-sm font-bold focus:outline-none text-apple-accent"
                            />
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleRemoveExercise(tIdx, eIdx)}
                        className="p-2 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-5 sm:p-8 bg-black/40 border-t border-white/5 flex gap-3 sm:gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 sm:py-4 rounded-2xl bg-white/5 hover:bg-white/10 font-bold transition-all border border-white/5 text-sm sm:text-base"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={isSaving}
            className="flex-[2] py-3 sm:py-4 rounded-2xl bg-apple-accent hover:bg-apple-accent/90 text-black font-bold transition-all shadow-xl shadow-apple-accent/20 flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <Save size={18} className="sm:size-20" />
                Save to Library
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
