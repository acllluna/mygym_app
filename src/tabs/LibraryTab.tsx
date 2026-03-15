import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Search, Plus, Upload, Filter, Dumbbell, Activity, CalendarDays, CheckCircle2 } from 'lucide-react';
import WorkoutBuilder from './WorkoutBuilder';
import AddToRoutineModal from './AddToRoutineModal';
import ExerciseDetailsModal from '../components/ExerciseDetailsModal';
import { v4 as uuidv4 } from 'uuid';
import { Exercise } from '../types';

export default function LibraryTab() {
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBuilder, setShowBuilder] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const exercises = useLiveQuery(() => db.exercises.toArray(), []);

  // Filter States
  const [filterMuscle, setFilterMuscle] = useState('all');
  const [filterBodyPart, setFilterBodyPart] = useState('all');
  const [filterEquipment, setFilterEquipment] = useState('all');

  // Compute unique values for dropdowns
  const uniqueMuscles = Array.from(new Set(exercises?.map(e => e.muscleGroup).filter(Boolean))).sort() as string[];
  const uniqueBodyParts = Array.from(new Set(exercises?.map(e => e.bodyPart).filter(Boolean))).sort() as string[];
  const uniqueEquipment = Array.from(new Set(exercises?.map(e => e.equipment).filter(Boolean))).sort() as string[];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (file.name.endsWith('.json')) {
        try {
          const data = JSON.parse(text);
          // Assuming data is an array of objects
          const newExercises = data.map((item: any) => ({
            id: item.id || uuidv4(),
            name: item.name || item.Exercise || 'Unknown',
            description: item.description || item.Description || '',
            muscleGroup: item.muscleGroup || item.Muscle || '',
            equipment: item.equipment || item.Equipment || '',
            type: item.type || 'weighted',
            thumbnail_url: item.thumbnail_url || '',
            gif_url: item.gif_url || ''
          }));
          await db.exercises.bulkAdd(newExercises);
          alert(`Imported ${newExercises.length} exercises!`);
        } catch (err) {
          console.error("Failed to parse JSON", err);
          alert("Failed to parse JSON file.");
        }
      } else if (file.name.endsWith('.csv')) {
        // Basic CSV parsing (for demo purposes)
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const newExercises = [];
        
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const values = lines[i].split(',').map(v => v.trim());
          const obj: any = {};
          headers.forEach((h, index) => {
            obj[h] = values[index];
          });
          
          newExercises.push({
            id: uuidv4(),
            name: obj.name || obj.exercise || 'Unknown',
            description: obj.description || '',
            muscleGroup: obj.muscle || obj.musclegroup || '',
            equipment: obj.equipment || '',
            type: obj.type || 'weighted'
          });
        }
        await db.exercises.bulkAdd(newExercises);
        alert(`Imported ${newExercises.length} exercises!`);
      }
    };
    reader.readAsText(file);
  };

  // Grouping & Filtering logic
  const [groupBy, setGroupBy] = useState<'none' | 'muscleGroup' | 'bodyPart' | 'equipment'>('none');
  
  // 1. Apply Filters
  let filteredExercises = exercises || [];
  
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredExercises = filteredExercises.filter(e => e.name.toLowerCase().includes(q));
  }
  if (filterMuscle !== 'all') {
    filteredExercises = filteredExercises.filter(e => e.muscleGroup === filterMuscle);
  }
  if (filterBodyPart !== 'all') {
    filteredExercises = filteredExercises.filter(e => e.bodyPart === filterBodyPart);
  }
  if (filterEquipment !== 'all') {
    filteredExercises = filteredExercises.filter(e => e.equipment === filterEquipment);
  }

  // 2. Apply Grouping
  const groupedExercises = filteredExercises.reduce((acc, exercise) => {
    const key = groupBy === 'none' ? 'All Exercises' : (exercise[groupBy] || 'Uncategorized');
    if (!acc[key]) acc[key] = [];
    acc[key].push(exercise);
    return acc;
  }, {} as Record<string, typeof exercises>);

  const toggleSelection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  if (showBuilder) {
    return (
      <WorkoutBuilder 
        initialSelectedIds={Array.from(selectedIds)} 
        onClose={() => {
          setShowBuilder(false);
          setSelectedIds(new Set());
        }} 
      />
    );
  }

  return (
    <div className="px-6 py-8 flex flex-col h-full overflow-hidden relative">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h2 className="text-2xl font-semibold">Library</h2>
      </div>

      <div className="flex gap-4 mb-6 shrink-0">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search size={18} className="text-apple-text-muted" />
          </div>
          <input
            type="text"
            placeholder="Find exercises..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-apple-card border border-white/5 rounded-2xl py-3 pl-10 pr-4 text-base text-white placeholder:text-apple-text-muted focus:outline-none focus:ring-2 focus:ring-apple-accent/50 transition-all shadow-lg"
          />
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex gap-2 mb-6 shrink-0">
        <select 
          value={filterBodyPart}
          onChange={(e) => setFilterBodyPart(e.target.value)}
          className="flex-1 bg-apple-card border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-apple-accent transition-colors appearance-none"
        >
          <option value="all">Body Part: All</option>
          {uniqueBodyParts.map(bp => (
            <option key={bp} value={bp}>{bp}</option>
          ))}
        </select>

        <select 
          value={filterEquipment}
          onChange={(e) => setFilterEquipment(e.target.value)}
          className="flex-1 bg-apple-card border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-apple-accent transition-colors appearance-none"
        >
          <option value="all">Equipment: All</option>
          {uniqueEquipment.map(eq => (
            <option key={eq} value={eq}>{eq}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto pb-20 pr-2 space-y-8">
        {filteredExercises.length === 0 ? (
          <div className="text-center text-apple-text-muted mt-10">
            <Dumbbell size={48} className="mx-auto mb-4 opacity-20" />
            <p>No exercises match your filters.</p>
            <p className="text-sm mt-2">Try adjusting your search criteria.</p>
          </div>
        ) : (
          Object.entries(groupedExercises).map(([groupKey, groupExercises]) => (
            <div key={groupKey} className="space-y-3">
              {groupBy !== 'none' && (
                <h3 className="text-lg font-semibold text-apple-accent sticky top-0 bg-black/80 backdrop-blur-md py-2 z-10">{groupKey}</h3>
              )}
              {groupExercises.map((exercise: Exercise) => (
                <ExerciseCard key={exercise.id} exercise={exercise} selectedIds={selectedIds} toggleSelection={toggleSelection} />
              ))}
            </div>
          ))
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-apple-card border-t border-white/10 p-4 flex justify-between items-center z-20">
          <button 
            className="text-sm text-apple-text-muted"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear ({selectedIds.size})
          </button>
          <div className="flex gap-3">
            <button 
              className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm font-medium hover:bg-white/20 transition-colors"
              onClick={() => setShowAddModal(true)}
            >
              <CalendarDays size={16} />
              Add to Routine
            </button>
            <button 
              className="flex items-center gap-2 bg-apple-accent text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-apple-accent/80 transition-colors"
              onClick={() => setShowBuilder(true)}
            >
              <Activity size={16} />
              Build Workout
            </button>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddToRoutineModal 
          selectedIds={Array.from(selectedIds)} 
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            setSelectedIds(new Set());
            alert('Exercises added successfully!');
          }} 
        />
      )}
    </div>
  );
}

function ExerciseCard({ exercise, selectedIds, toggleSelection }: { exercise: Exercise, selectedIds: Set<string>, toggleSelection: (e: React.MouseEvent, id: string) => void }) {
  const [showDetails, setShowDetails] = useState(false);
  
  return (
    <>
      <div 
        className="bg-apple-card rounded-3xl p-4 flex items-center gap-4 relative overflow-hidden group border border-white/5 cursor-pointer select-none"
        onClick={() => setShowDetails(true)}
      >
        <div className="w-20 h-20 bg-white/5 rounded-2xl overflow-hidden shrink-0 relative">
          {exercise.thumbnail_url ? (
          <img 
            src={exercise.thumbnail_url} 
            alt={exercise.name} 
            className="w-full h-full object-cover"
          />
        ) : (
          <Dumbbell size={24} className="text-white/20" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-lg leading-snug">{exercise.name}</h3>
      </div>
      <div className="flex items-center">
        <button 
          className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center transition-colors z-10 ${selectedIds.has(exercise.id) ? 'bg-apple-accent text-black' : 'bg-white/10 text-white hover:bg-apple-accent hover:text-black'}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleSelection(e, exercise.id);
          }}
        >
          {selectedIds.has(exercise.id) ? <CheckCircle2 size={18} /> : <Plus size={18} />}
        </button>
      </div>
    </div>

    {showDetails && <ExerciseDetailsModal exercise={exercise} onClose={() => setShowDetails(false)} />}
    </>
  );
}
