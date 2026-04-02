import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Reorder, motion, useDragControls } from 'motion/react';
import { Play, ArrowLeft, Plus, Trash2, Dumbbell, GripVertical } from 'lucide-react';
import { SessionTemplate, Exercise, TemplateExercise } from '../types';
import { v4 as uuidv4 } from 'uuid';
import ExerciseDetailsModal from '../components/ExerciseDetailsModal';

interface WorkoutDetailsProps {
  templateId: string;
  onClose: () => void;
  onStart: (template: SessionTemplate) => void;
  onAddExerciseClick: () => void;
}

export default function WorkoutDetails({ templateId, onClose, onStart, onAddExerciseClick }: WorkoutDetailsProps) {
  const template = useLiveQuery(() => db.templates.get(templateId), [templateId]);
  const allExercises = useLiveQuery(() => db.exercises.toArray());
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  
  if (!template || !allExercises) return null;

  const updateExercises = async (newExercises: TemplateExercise[]) => {
    await db.templates.update(templateId, { exercises: newExercises });
  };

  const removeExercise = async (index: number) => {
    const newExercises = template.exercises.filter((_, i) => i !== index);
    await updateExercises(newExercises);
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col font-sans text-white overflow-hidden">
      {/* Header */}
      <div 
        className="bg-black border-b border-white/10 px-4 pb-4 flex items-center sticky top-0 z-50 shrink-0"
        style={{ paddingTop: 'var(--safe-top)' }}
      >
        <div className="flex items-center w-full pt-4">
          <button onClick={onClose} className="p-2 text-white/70 hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1 mx-2">
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
            className="p-2 text-white/50 hover:text-red-400 transition-colors shrink-0"
            title="Delete Workout"
          >
            <Trash2 size={24} />
          </button>
        </div>
      </div>

      <motion.div layoutScroll className="flex-1 overflow-y-auto px-6 py-6 pb-40">
        <div className="mb-8">
          <h4 className="text-[10px] font-bold text-apple-text-muted uppercase tracking-widest mb-2 px-1">Description</h4>
          <textarea 
            value={template.description || ''}
            onChange={(e) => db.templates.update(templateId, { description: e.target.value })}
            placeholder="Add a detailed description for this routine..."
            rows={2}
            className="w-full bg-apple-card border border-white/5 rounded-2xl p-4 text-sm text-apple-text-muted focus:outline-none focus:text-white transition-colors resize-none"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Exercises</h3>
            <span className="text-apple-accent text-sm font-medium">{template.exercises.length}</span>
          </div>

          <Reorder.Group axis="y" values={template.exercises} onReorder={updateExercises} className="space-y-3">
            {template.exercises.map((ex, idx) => (
              <ExerciseReorderItem
                key={`${ex.exerciseId}-${idx}`}
                ex={ex}
                idx={idx}
                allExercises={allExercises}
                removeExercise={removeExercise}
                setSelectedExercise={setSelectedExercise}
              />
            ))}
          </Reorder.Group>
          
          <button 
            onClick={onAddExerciseClick}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors mt-2"
          >
            <Plus size={18} />
            Add Exercise
          </button>
        </div>
      </motion.div>

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

function ExerciseReorderItem({ ex, idx, allExercises, removeExercise, setSelectedExercise }: any) {
  const dragControls = useDragControls();
  const exDef = allExercises.find((e: any) => e.id === ex.exerciseId);

  return (
    <Reorder.Item
      value={ex}
      dragListener={false}
      dragControls={dragControls}
      className="bg-apple-card rounded-3xl p-4 border border-white/5 relative active:shadow-xl active:z-10"
    >
      <div 
        className="flex items-center gap-4 touch-none"
        onPointerDown={(e) => dragControls.start(e)}
      >
        <div className="cursor-grab active:cursor-grabbing text-white/30 hover:text-white/60">
          <GripVertical size={20} />
        </div>
        
        <div 
          className="w-14 h-14 bg-white/5 rounded-2xl overflow-hidden shrink-0 relative cursor-pointer touch-auto"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => { if (exDef) setSelectedExercise(exDef); }}
        >
          {exDef?.thumbnail_url ? (
            <img src={exDef.thumbnail_url} alt={exDef.name} className="w-full h-full object-cover pointer-events-none" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><Dumbbell size={20} className="text-white/20" /></div>
          )}
        </div>

        <div className="flex-1 min-w-0 pointer-events-none">
          <h4 className="font-semibold text-base leading-tight truncate">{exDef?.name || 'Unknown Exercise'}</h4>
        </div>

        <button 
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => removeExercise(idx)} 
          className="p-2 text-red-400/50 hover:text-red-400 transition-colors touch-auto"
        >
          <Trash2 size={20} />
        </button>
      </div>
    </Reorder.Item>
  );
}
