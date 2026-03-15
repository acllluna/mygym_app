import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { X, Check, ChevronRight } from 'lucide-react';

interface AddToRoutineModalProps {
  selectedIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddToRoutineModal({ selectedIds, onClose, onSuccess }: AddToRoutineModalProps) {
  const templates = useLiveQuery(() => db.templates.toArray());

  const handleSelect = async (templateId: string) => {
    const t = await db.templates.get(templateId);
    if (!t) return;

    const newExercises = selectedIds.map(id => ({
      exerciseId: id,
      targetSets: 3,
      targetReps: 10
    }));

    await db.templates.update(templateId, { 
      exercises: [...t.exercises, ...newExercises] 
    });
    
    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-apple-card w-full max-w-md rounded-[32px] overflow-hidden flex flex-col max-h-[80vh] border border-white/10">
        <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 shrink-0 bg-white/5">
          <h2 className="font-semibold text-lg">Add to Routine</h2>
          <button onClick={onClose} className="p-2 -mr-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 shrink-0 min-h-[300px]">
          {(!templates || templates.length === 0) ? (
            <div className="flex flex-col items-center justify-center text-center text-apple-text-muted h-64">
              <p>No routines available.</p>
              <p className="text-sm mt-1">Create one first!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map(t => (
                <button 
                  key={t.id}
                  onClick={() => handleSelect(t.id)}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl p-4 flex items-center justify-between text-left transition-colors"
                >
                  <div>
                    <h3 className="font-semibold">{t.name}</h3>
                    <p className="text-xs text-apple-text-muted mt-1">{t.exercises.length} Exercises</p>
                  </div>
                  <ChevronRight size={20} className="text-apple-text-muted opacity-50" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
