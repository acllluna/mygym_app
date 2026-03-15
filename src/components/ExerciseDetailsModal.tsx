import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { X, TrendingUp, Award, Repeat } from 'lucide-react';
import { Exercise } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ExerciseDetailsModalProps {
  exercise: Exercise;
  onClose: () => void;
}

export default function ExerciseDetailsModal({ exercise, onClose }: ExerciseDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'instructions' | 'history'>('instructions');
  const sessions = useLiveQuery(() => db.sessions.toArray(), []);
  
  const chartData = useMemo(() => {
    if (!sessions) return [];
    
    const data = [];
    for (const session of sessions) {
      const exerciseLog = session.exercises.find(e => e.exerciseId === exercise.id);
      if (exerciseLog) {
        let maxWeight = 0;
        let totalReps = 0;
        
        for (const set of exerciseLog.sets) {
          if (set.completed) {
            if (set.weight && set.weight > maxWeight) maxWeight = set.weight;
            if (set.reps) totalReps += set.reps;
          }
        }
        
        if (totalReps > 0 || maxWeight > 0) {
          data.push({
            date: new Date(session.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            timestamp: session.startTime,
            weight: maxWeight,
            reps: totalReps
          });
        }
      }
    }
    
    return data.sort((a, b) => a.timestamp - b.timestamp);
  }, [sessions, exercise.id]);

  const metrics = useMemo(() => {
    if (!sessions) return { prWeight: 0, maxRepsAtPr: 0, increase30d: 0 };
    
    let prWeight = 0;
    let maxRepsAtPr = 0;
    
    sessions.forEach(session => {
      const logEx = session.exercises.find(e => e.exerciseId === exercise.id);
      if (!logEx) return;
      
      logEx.sets.filter(s => s.completed).forEach(set => {
        if (set.weight && set.weight > prWeight) {
          prWeight = set.weight;
          maxRepsAtPr = set.reps || 0;
        } else if (set.weight === prWeight) {
          if (set.reps && set.reps > maxRepsAtPr) {
            maxRepsAtPr = set.reps;
          }
        }
      });
    });

    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    let oldPr = 0;
    let hasOldData = false;
    
    sessions.forEach(session => {
      if (session.startTime < thirtyDaysAgo) {
        const logEx = session.exercises.find(e => e.exerciseId === exercise.id);
        if (!logEx) return;
        
        logEx.sets.filter(s => s.completed).forEach(set => {
          hasOldData = true;
          if (set.weight && set.weight > oldPr) {
            oldPr = set.weight;
          }
        });
      }
    });

    let increase30d = 0;
    if (hasOldData && oldPr > 0) {
      increase30d = ((prWeight - oldPr) / oldPr) * 100;
    } else if (hasOldData && oldPr === 0 && prWeight > 0) {
       increase30d = 100; // went from 0 to something
    }

    return { prWeight, maxRepsAtPr, increase30d };
  }, [sessions, exercise.id]);

  return (
    <div 
      className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 select-none font-sans text-white"
      onClick={onClose}
    >
      <div 
        className="bg-apple-card w-full max-w-sm rounded-[32px] overflow-hidden border border-white/10 shadow-2xl flex flex-col shadow-black/80 max-h-[85dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full aspect-video bg-black/40 relative shrink-0">
          <img src={exercise.gif_url || exercise.thumbnail_url} alt={exercise.name} className="w-full h-full object-contain" />
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }} 
            className="absolute top-4 right-4 w-9 h-9 bg-black/60 backdrop-blur-xl rounded-full flex items-center justify-center hover:bg-black/80 transition-colors pointer-events-auto border border-white/10 z-10"
            style={{ top: 'max(1rem, var(--safe-top))' }}
          >
            <X size={20} className="text-white" />
          </button>
        </div>
        
        <div className="flex bg-white/5 p-1 shrink-0">
          <button 
            onClick={() => setActiveTab('instructions')}
            className={`flex-1 py-3 text-sm font-semibold rounded-2xl transition-all ${activeTab === 'instructions' ? 'bg-apple-card text-white shadow-lg border border-white/10' : 'text-apple-text-muted hover:text-white'}`}
          >
            Instructions
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 text-sm font-semibold rounded-2xl transition-all ${activeTab === 'history' ? 'bg-apple-card text-white shadow-lg border border-white/10' : 'text-apple-text-muted hover:text-white'}`}
          >
            History
          </button>
        </div>

        <div className="p-5 sm:p-6 flex flex-col overflow-y-auto overscroll-contain pointer-events-auto pb-8">
          <h3 className="text-xl font-bold mb-4">{exercise.name}</h3>

          {activeTab === 'instructions' ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex gap-2 flex-wrap mb-6 shrink-0">
                {exercise.muscleGroup && <span className="text-xs font-semibold bg-white/10 px-3 py-1.5 rounded-lg border border-white/5">{exercise.muscleGroup}</span>}
                {exercise.bodyPart && <span className="text-xs font-semibold bg-white/10 px-3 py-1.5 rounded-lg border border-white/5">{exercise.bodyPart}</span>}
                {exercise.equipment && <span className="text-xs font-semibold bg-white/10 px-3 py-1.5 rounded-lg border border-white/5">{exercise.equipment}</span>}
              </div>
              <h4 className="text-xs font-semibold text-apple-text-muted uppercase tracking-wider mb-2 shrink-0">Execution</h4>
              <p className="text-sm text-apple-text-muted leading-relaxed whitespace-pre-line">
                {exercise.description || "No detailed instructions available."}
              </p>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-black/40 rounded-2xl p-4 border border-white/5 flex flex-col items-center text-center">
                  <Award size={20} className="text-yellow-500 mb-2" />
                  <div className="text-2xl font-bold">{metrics.prWeight}<span className="text-sm text-apple-text-muted ml-0.5 font-medium">kg</span></div>
                  <div className="text-[10px] text-apple-text-muted uppercase tracking-wider font-semibold mt-1">PR Weight</div>
                </div>
                
                <div className="flex flex-col gap-3">
                  <div className="bg-black/40 rounded-2xl p-3 border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-apple-text-muted">
                      <Repeat size={16} />
                      <span className="text-[10px] uppercase tracking-wider font-semibold">Max Reps at PR</span>
                    </div>
                    <div className="font-bold">{metrics.maxRepsAtPr}</div>
                  </div>
                  
                  <div className="bg-black/40 rounded-2xl p-3 border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-apple-text-muted">
                      <TrendingUp size={16} />
                      <span className="text-[10px] uppercase tracking-wider font-semibold">30d Growth</span>
                    </div>
                    <div className={`font-bold ${metrics.increase30d > 0 ? 'text-apple-green' : metrics.increase30d < 0 ? 'text-red-400' : 'text-white'}`}>
                      {metrics.increase30d > 0 ? '+' : ''}{metrics.increase30d.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              {chartData.length > 0 ? (
                <div className="shrink-0 mb-2">
                  <h4 className="text-xs font-semibold text-apple-text-muted uppercase tracking-wider mb-4">Volume Progression</h4>
                  <div className="h-48 w-full -ml-4">
                    <ResponsiveContainer width={280} height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: -20, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis dataKey="date" stroke="#ffffff50" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="left" stroke="#32d74b" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="right" orientation="right" stroke="#0a84ff" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#1c1c1e', border: '1px solid #ffffff20', borderRadius: '12px', fontSize: '12px' }} />
                        <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px', paddingLeft: '30px' }} iconType="circle" iconSize={8} />
                        <Line yAxisId="left" type="monotone" dataKey="weight" stroke="#32d74b" strokeWidth={3} name="Max Weight" dot={{ r: 4, fill: '#1c1c1e', strokeWidth: 2 }} />
                        <Line yAxisId="right" type="monotone" dataKey="reps" stroke="#0a84ff" strokeWidth={3} name="Total Reps" dot={{ r: 4, fill: '#1c1c1e', strokeWidth: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="bg-white/5 rounded-2xl p-6 text-center border border-white/5 shrink-0 mt-4">
                  <p className="text-sm text-apple-text-muted">Complete this exercise in a workout to see progression charts.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
