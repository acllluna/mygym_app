import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { Search, Plus, Minus, X, Save, Dumbbell, ChevronRight, Check } from 'lucide-react';
import { Exercise, SessionTemplate, TemplateExercise } from '../types';

interface WorkoutBuilderProps {
  onClose: () => void;
  initialSelectedIds?: string[];
}

interface BuilderExercise extends TemplateExercise {
  id: string;
}

export default function WorkoutBuilder({ onClose, initialSelectedIds }: WorkoutBuilderProps) {
  const [step, setStep] = useState<1 | 2>(initialSelectedIds?.length ? 1 : 1); 
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  
  const [selectedExercises, setSelectedExercises] = useState<BuilderExercise[]>([]);
  
  // Library Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<'none' | 'muscleGroup' | 'bodyPart' | 'equipment'>('none');
  
  const allExercises = useLiveQuery(() => db.exercises.toArray());
  const libraryExercises = allExercises?.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase())) || [];
  
  // Initialize from props if present and allExercises defined
  useEffect(() => {
    if (initialSelectedIds && initialSelectedIds.length > 0 && allExercises && selectedExercises.length === 0) {
      const initialExercises = initialSelectedIds.map(id => {
        const ex = allExercises.find(e => e.id === id);
        if (!ex) return null;
        return {
          id: uuidv4(),
          exerciseId: ex.id,
          targetSets: 3,
          targetReps: 10
        };
      }).filter(Boolean) as BuilderExercise[];
      
      setSelectedExercises(initialExercises);
    }
  }, [initialSelectedIds, allExercises]);

  const handleSave = async () => {
    if (!templateName.trim() || selectedExercises.length === 0) {
      alert("Please provide a name and add at least one exercise.");
      return;
    }
    
    const newTemplate: SessionTemplate = {
      id: uuidv4(),
      name: templateName.trim(),
      description: templateDesc.trim() || undefined,
      exercises: selectedExercises.map(({ id, ...rest }) => rest), // Strip local UI id
      createdAt: Date.now(),
    };
    
    await db.templates.add(newTemplate);
    onClose();
  };
  
  const addExercise = (exercise: Exercise) => {
    setSelectedExercises(prev => [
      ...prev, 
      {
        id: uuidv4(),
        exerciseId: exercise.id,
        targetSets: 3,
        targetReps: 10
      }
    ]);
  };
  
  const removeSelectedExercise = (id: string) => {
    setSelectedExercises(prev => prev.filter(e => e.id !== id));
  };
  
  const updateSelectedExercise = (id: string, field: 'targetSets' | 'targetReps', value: number) => {
    if (value < 1) value = 1;
    setSelectedExercises(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };
  
  const groupedLibrary = libraryExercises?.reduce((acc, exercise) => {
    const key = groupBy === 'none' ? 'All Exercises' : (exercise[groupBy] || 'Uncategorized');
    if (!acc[key]) acc[key] = [];
    acc[key].push(exercise);
    return acc;
  }, {} as Record<string, Exercise[]>) || {};

  return (
    <div className="fixed inset-0 bg-black z-[60] flex flex-col font-sans text-white">
      {/* Header */}
      <div className="bg-apple-card/90 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shrink-0">
        <button onClick={onClose} className="p-2 -ml-2 text-white/70 hover:text-white transition-colors">
          <X size={24} />
        </button>
        <h2 className="font-semibold text-lg text-center absolute left-1/2 -translate-x-1/2">
          {step === 1 ? 'New Routine' : 'Add Exercises'}
        </h2>
        {step === 1 ? (
          <button 
            onClick={handleSave} 
            disabled={!templateName.trim() || selectedExercises.length === 0}
            className="text-apple-accent font-semibold text-sm disabled:opacity-50"
          >
            Save
          </button>
        ) : (
          <button 
            onClick={() => setStep(1)} 
            className="text-apple-accent font-semibold text-sm"
          >
            Done
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pb-safe">
        {step === 1 ? (
          <div className="p-6 space-y-8 pb-32">
            <section className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-apple-text-muted uppercase tracking-wider mb-2 block ml-1">Routine Name</label>
                <input 
                  type="text" 
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  placeholder="e.g. Upper Body Power"
                  className="w-full bg-apple-card border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/20 focus:outline-none focus:border-apple-accent transition-colors text-lg font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-apple-text-muted uppercase tracking-wider mb-2 block ml-1">Description (Optional)</label>
                <textarea 
                  value={templateDesc}
                  onChange={e => setTemplateDesc(e.target.value)}
                  placeholder="Heavy compound movements focused on chest and back."
                  rows={2}
                  className="w-full bg-apple-card border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/20 focus:outline-none focus:border-apple-accent transition-colors resize-none"
                />
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Exercises</h3>
                <span className="text-apple-accent font-medium">{selectedExercises.length} added</span>
              </div>
              
              {selectedExercises.length === 0 ? (
                <div onClick={() => setStep(2)} className="bg-apple-card border border-dashed border-white/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/5 transition-colors">
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3 text-apple-accent">
                    <Plus size={24} />
                  </div>
                  <p className="font-medium">Add your first exercise</p>
                  <p className="text-sm text-apple-text-muted mt-1">Tap to browse the library</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedExercises.map((selEx, idx) => {
                    const exDef = allExercises?.find(e => e.id === selEx.exerciseId);
                    return (
                      <div key={selEx.id} className="bg-apple-card rounded-2xl p-4 border border-white/5 relative">
                        <button 
                          onClick={() => removeSelectedExercise(selEx.id)}
                          className="absolute top-4 right-4 text-white/30 hover:text-red-400 transition-colors"
                        >
                          <X size={18} />
                        </button>
                        
                        <div className="flex gap-4">
                          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-sm font-mono text-apple-text-muted shrink-0 mt-0.5">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold pr-8 mb-3 text-lg leading-tight">{exDef?.name || 'Unknown Exercise'}</h4>
                            <div className="flex items-center gap-6">
                              <div className="flex items-center gap-3 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                                <span className="text-xs text-apple-text-muted font-medium w-6">Sets</span>
                                <button onClick={() => updateSelectedExercise(selEx.id, 'targetSets', selEx.targetSets - 1)} className="w-6 h-6 flex items-center justify-center bg-white/10 rounded text-white hover:bg-white/20"><Minus size={14}/></button>
                                <span className="font-mono text-base font-semibold w-4 text-center">{selEx.targetSets}</span>
                                <button onClick={() => updateSelectedExercise(selEx.id, 'targetSets', selEx.targetSets + 1)} className="w-6 h-6 flex items-center justify-center bg-white/10 rounded text-white hover:bg-white/20"><Plus size={14}/></button>
                              </div>
                              <div className="flex items-center gap-3 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                                <span className="text-xs text-apple-text-muted font-medium w-8">Reps</span>
                                <button onClick={() => updateSelectedExercise(selEx.id, 'targetReps', selEx.targetReps - 1)} className="w-6 h-6 flex items-center justify-center bg-white/10 rounded text-white hover:bg-white/20"><Minus size={14}/></button>
                                <span className="font-mono text-base font-semibold w-6 text-center">{selEx.targetReps}</span>
                                <button onClick={() => updateSelectedExercise(selEx.id, 'targetReps', selEx.targetReps + 1)} className="w-6 h-6 flex items-center justify-center bg-white/10 rounded text-white hover:bg-white/20"><Plus size={14}/></button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <button 
                    onClick={() => setStep(2)}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors mt-2"
                  >
                    <Plus size={18} />
                    Add Another Exercise
                  </button>
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="h-full flex flex-col pt-4">
            <div className="px-6 flex gap-4 mb-4 shrink-0">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-apple-text-muted" />
                </div>
                <input
                  type="text"
                  placeholder="Search library..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-apple-card border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-apple-text-muted focus:outline-none focus:border-apple-accent transition-colors"
                />
              </div>
              <select 
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as any)}
                className="bg-apple-card border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-apple-accent transition-colors appearance-none"
              >
                <option value="none">Group By</option>
                <option value="muscleGroup">Target Muscle</option>
                <option value="bodyPart">Body Part</option>
                <option value="equipment">Equipment</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-20 space-y-8">
              {libraryExercises?.length === 0 ? (
                <div className="text-center text-apple-text-muted mt-10">
                  <Dumbbell size={48} className="mx-auto mb-4 opacity-20" />
                  <p>No matching exercises.</p>
                </div>
              ) : (
                Object.entries(groupedLibrary).map(([groupKey, groupExts]) => (
                  <div key={groupKey} className="space-y-2">
                    {groupBy !== 'none' && (
                      <h3 className="text-lg font-semibold text-apple-accent sticky top-0 bg-black py-2 z-10">{groupKey}</h3>
                    )}
                    {groupExts.map((exercise) => {
                      const isAdded = selectedExercises.some(se => se.exerciseId === exercise.id);
                      return (
                        <div 
                          key={exercise.id} 
                          className={`bg-apple-card p-3 rounded-2xl flex items-center justify-between gap-4 transition-colors ${isAdded ? 'border-apple-accent/50 border' : 'border border-white/5'}`}
                          onClick={() => {
                            if (!isAdded) addExercise(exercise);
                          }}
                        >
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-white/5 flex items-center justify-center">
                            {exercise.thumbnail_url ? (
                              <img src={exercise.thumbnail_url} alt={exercise.name} className="w-full h-full object-cover" />
                            ) : (
                              <Dumbbell size={20} className="text-white/20" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <h3 className="font-medium text-sm leading-tight truncate">{exercise.name}</h3>
                            <div className="flex items-center gap-2 text-[10px] text-apple-text-muted mt-1">
                              <span className="truncate">{exercise.muscleGroup || 'Unknown'}</span>
                              <span className="opacity-50">•</span>
                              <span className="truncate">{exercise.equipment || 'None'}</span>
                            </div>
                          </div>
                          {isAdded ? (
                            <div className="w-8 h-8 shrink-0 rounded-full bg-apple-accent text-black flex items-center justify-center z-10">
                              <Check size={16} strokeWidth={3} />
                            </div>
                          ) : (
                            <button className="w-8 h-8 shrink-0 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10">
                              <Plus size={16} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
