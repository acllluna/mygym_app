import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Play, ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Check, Minus, Dumbbell } from 'lucide-react';
import { SessionTemplate, Exercise, TemplateExercise } from '../types';
import { v4 as uuidv4 } from 'uuid';
import ExerciseDetailsModal from '../components/ExerciseDetailsModal';

interface WorkoutDetailsProps {
  templateId: string;
  onClose: () => void;
  onStart: (template: SessionTemplate) => void;
  onAddExerciseClick: () => void; // Pass control up if we want to open a library selector
}

export default function WorkoutDetails({ templateId, onClose, onStart, onAddExerciseClick }: WorkoutDetailsProps) {
  const template = useLiveQuery(() => db.templates.get(templateId), [templateId]);
  const allExercises = useLiveQuery(() => db.exercises.toArray());
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  
  if (!template || !allExercises) return null;

  const moveExercise = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === template.exercises.length - 1) return;
    
    const newExercises = [...template.exercises];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    [newExercises[index], newExercises[swapIndex]] = [newExercises[swapIndex], newExercises[index]];
    
    await db.templates.update(templateId, { exercises: newExercises });
  };

  const removeExercise = async (index: number) => {
    const newExercises = template.exercises.filter((_, i) => i !== index);
    await db.templates.update(templateId, { exercises: newExercises });
  };
  
  const updateExercise = async (index: number, field: 'targetSets' | 'targetReps', value: number) => {
    if (value < 1) value = 1;
    const newExercises = [...template.exercises];
    newExercises[index] = { ...newExercises[index], [field]: value };
    await db.templates.update(templateId, { exercises: newExercises });
  };

  return (
    <div className="fixed inset-0 bg-black z-[60] flex flex-col font-sans text-white">
      {/* Header */}
      <div className="bg-apple-card/90 backdrop-blur-xl border-b border-white/10 px-4 py-4 flex items-center sticky top-0 z-50 shrink-0">
        <button onClick={onClose} className="p-2 text-white/70 hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1 mx-3 pr-2">
          <input 
            type="text" 
            value={template.name}
            onChange={(e) => db.templates.update(templateId, { name: e.target.value })}
            className="bg-transparent font-semibold text-lg w-full focus:outline-none focus:text-apple-accent transition-colors truncate"
            placeholder="Workout Name"
          />
        </div>
        <button 
          onClick={async () => {
            if (window.confirm(`Are you sure you want to delete "${template.name}"?`)) {
              await db.templates.delete(templateId);
              onClose();
            }
          }}
          className="p-2 text-white/50 hover:text-red-400 transition-colors"
          title="Delete Workout"
        >
          <Trash2 size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 pb-40">
        <div className="mb-8">
          <textarea 
            value={template.description || ''}
            onChange={(e) => db.templates.update(templateId, { description: e.target.value })}
            placeholder="Add a description..."
            rows={2}
            className="w-full bg-transparent text-sm text-apple-text-muted focus:outline-none focus:text-white transition-colors resize-none"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Exercises</h3>
            <span className="text-apple-accent text-sm font-medium">{template.exercises.length}</span>
          </div>

          {template.exercises.map((ex, idx) => {
            const exDef = allExercises.find(e => e.id === ex.exerciseId);
            return (
              <div key={`${ex.exerciseId}-${idx}`} className="bg-apple-card rounded-2xl p-4 border border-white/5 relative">
                <div className="absolute right-2 top-2 flex flex-col items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 text-white/50">
                  <button onClick={() => moveExercise(idx, 'up')} disabled={idx === 0} className="hover:text-white disabled:opacity-30 disabled:hover:text-white/50"><ChevronUp size={16} /></button>
                  <button onClick={() => removeExercise(idx)} className="text-red-400 p-1"><Trash2 size={16} /></button>
                  <button onClick={() => moveExercise(idx, 'down')} disabled={idx === template.exercises.length - 1} className="hover:text-white disabled:opacity-30 disabled:hover:text-white/50"><ChevronDown size={16} /></button>
                </div>

                <div className="flex gap-4 pr-14">
                  <div 
                    className="w-16 h-16 bg-white/5 rounded-2xl overflow-hidden shrink-0 relative cursor-pointer group"
                    onClick={() => { if (exDef) setSelectedExercise(exDef); }}
                  >
                    {exDef?.thumbnail_url ? (
                      <img src={exDef.thumbnail_url} alt={exDef.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Dumbbell size={20} className="text-white/20" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold mb-3 text-sm sm:text-base leading-tight pr-2 truncate">{exDef?.name || 'Unknown Exercise'}</h4>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 text-sm scale-90 origin-left">
                    <div className="flex items-center gap-2 bg-black/40 px-2 py-1 rounded-lg border border-white/5 w-fit">
                      <span className="text-[10px] text-apple-text-muted font-medium w-6 uppercase">Sets</span>
                      <button onClick={() => updateExercise(idx, 'targetSets', ex.targetSets - 1)} className="w-6 h-6 flex items-center justify-center bg-white/10 rounded text-white hover:bg-white/20"><Minus size={12}/></button>
                      <span className="font-mono text-sm font-semibold w-4 text-center">{ex.targetSets}</span>
                      <button onClick={() => updateExercise(idx, 'targetSets', ex.targetSets + 1)} className="w-6 h-6 flex items-center justify-center bg-white/10 rounded text-white hover:bg-white/20"><Plus size={12}/></button>
                    </div>
                    <div className="flex items-center gap-2 bg-black/40 px-2 py-1 rounded-lg border border-white/5 w-fit">
                      <span className="text-[10px] text-apple-text-muted font-medium w-6 uppercase">Reps</span>
                      <button onClick={() => updateExercise(idx, 'targetReps', (ex.targetReps || 10) - 1)} className="w-6 h-6 flex items-center justify-center bg-white/10 rounded text-white hover:bg-white/20"><Minus size={12}/></button>
                      <span className="font-mono text-sm font-semibold w-4 text-center">{ex.targetReps || 10}</span>
                      <button onClick={() => updateExercise(idx, 'targetReps', (ex.targetReps || 10) + 1)} className="w-6 h-6 flex items-center justify-center bg-white/10 rounded text-white hover:bg-white/20"><Plus size={12}/></button>
                    </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          <button 
            onClick={onAddExerciseClick}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors mt-2"
          >
            <Plus size={18} />
            Add Exercise
          </button>
        </div>
      </div>

      <div className="fixed bottom-6 left-6 right-6 z-20 pointer-events-none">
        <button 
          onClick={() => onStart(template)}
          disabled={template.exercises.length === 0}
          className="w-full pointer-events-auto bg-apple-accent text-black py-4 rounded-full font-bold text-base flex items-center justify-center gap-2 shadow-[0_10_40px_rgba(50,215,75,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none"
        >
          <Play size={20} fill="currentColor" />
          Start Session
        </button>
      </div>

      {selectedExercise && <ExerciseDetailsModal exercise={selectedExercise} onClose={() => setSelectedExercise(null)} />}
    </div>
  );
}
