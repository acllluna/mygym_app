import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { 
  format, startOfWeek, endOfWeek, subDays, startOfDay, eachDayOfInterval, subWeeks, subMonths, endOfMonth, startOfYear, endOfYear 
} from 'date-fns';
import { Award, Calendar as CalendarIcon, Activity, Flame, Clock, Dumbbell } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#32d74b', '#0a84ff', '#ff9f0a', '#ff375f', '#bf5af2', '#64d2ff', '#ffd60a'];

export default function DashboardTab() {
  const sessions = useLiveQuery(() => db.sessions.toArray());
  const exercises = useLiveQuery(() => db.exercises.toArray());
  const [timeRange, setTimeRange] = useState<'daily'|'weekly'>('daily');
  const [viewMode, setViewMode] = useState<'month'|'year'>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Generate month options for the dropdown (last 12 months)
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
       const d = subMonths(now, i);
       options.push({
         value: d.toISOString(),
         label: format(d, 'MMMM yyyy')
       });
    }
    return options;
  }, []);

  // Calculate stats based on viewMode and selectedDate
  const { filteredSessions, statsLabel } = useMemo(() => {
    if (!sessions) return { filteredSessions: [], statsLabel: '' };
    
    if (viewMode === 'month') {
      const start = startOfDay(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)).getTime();
      const end = endOfMonth(selectedDate).getTime();
      return {
        filteredSessions: sessions.filter(s => s.startTime >= start && s.startTime <= end),
        statsLabel: format(selectedDate, 'MMMM').toUpperCase()
      };
    } else {
      const start = startOfYear(selectedDate).getTime();
      const end = endOfYear(selectedDate).getTime();
      return {
        filteredSessions: sessions.filter(s => s.startTime >= start && s.startTime <= end),
        statsLabel: format(selectedDate, 'yyyy')
      };
    }
  }, [sessions, viewMode, selectedDate]);

  // Calculate this week's stats (stays relative to current real-time)
  const { thisWeekSessions, totalVolume } = useMemo(() => {
    if (!sessions) return { thisWeekSessions: [], totalVolume: 0 };
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 }).getTime();
    const end = endOfWeek(now, { weekStartsOn: 1 }).getTime();

    const currentSessions = sessions.filter(s => s.startTime >= start && s.startTime <= end);
    let vol = 0;
    currentSessions.forEach(session => {
      session.exercises.forEach(ex => {
        ex.sets.forEach(set => {
          if (set.completed && set.weight && set.reps) vol += (set.weight * set.reps);
        });
      });
    });
    return { thisWeekSessions: currentSessions, totalVolume: vol };
  }, [sessions]);

  // Top 3 Recent PRs (relative to filtered period for exploratory view)
  const recentPRs = useMemo(() => {
    if (!filteredSessions || !exercises) return [];
    const exercisePRs: Record<string, number> = {};
    const events: any[] = [];

    const sortedSessions = [...filteredSessions].sort((a, b) => a.startTime - b.startTime);

    for (const session of sortedSessions) {
      for (const logEx of session.exercises) {
        const exDef = exercises.find(e => e.id === logEx.exerciseId);
        if (!exDef) continue;

        let sessionMax = 0;
        for (const set of logEx.sets) {
          if (set.completed && set.weight && set.weight > sessionMax) {
            sessionMax = set.weight;
          }
        }

        if (sessionMax > 0) {
          const currentPR = exercisePRs[logEx.exerciseId] || 0;
          if (sessionMax > currentPR) {
            exercisePRs[logEx.exerciseId] = sessionMax;
            events.push({
              id: `${session.id}-${logEx.exerciseId}`,
              date: session.startTime,
              exerciseName: exDef.name,
              weight: sessionMax,
              increase: sessionMax - currentPR,
              isFirst: currentPR === 0
            });
          }
        }
      }
    }

    return events.filter(e => !e.isFirst).sort((a, b) => b.date - a.date).slice(0, 3);
  }, [filteredSessions, exercises]);

  // Strava-style Totals
  const topStats = useMemo(() => {
    const uniqueDays = new Set(filteredSessions.map(s => format(new Date(s.startTime), 'yyyy-MM-dd')));
    
    let vol = 0;
    let durationMs = 0;
    filteredSessions.forEach(s => {
      durationMs += s.endTime ? (s.endTime - s.startTime) : (45 * 60000);
      s.exercises.forEach(ex => ex.sets.forEach(set => {
        if (set.completed && set.weight && set.reps) vol += set.weight * set.reps;
      }));
    });

    return {
      daysTrained: uniqueDays.size,
      totalHours: Math.round(durationMs / 3600000),
      totalVol: Math.round(vol)
    };
  }, [filteredSessions]);

  // Time Series Data (always shows a window, but we filter based on selection if needed)
  const timeSeriesData = useMemo(() => {
    if (!sessions) return [];
    const baseDate = viewMode === 'month' ? selectedDate : new Date();
    const today = startOfDay(baseDate);
    
    if (timeRange === 'daily') {
      const days = eachDayOfInterval({ start: subDays(today, 13), end: today });
      return days.map(d => {
        const start = d.getTime();
        const end = start + 86400000;
        const daySessions = sessions.filter(s => s.startTime >= start && s.startTime < end);
        
        let duration = 0;
        let volume = 0;
        daySessions.forEach(s => {
          if (s.endTime) duration += (s.endTime - s.startTime) / 60000;
          else duration += 45;
          s.exercises.forEach(ex => ex.sets.forEach(set => {
            if (set.completed && set.weight && set.reps) volume += set.weight * set.reps;
          }));
        });

        return { label: format(d, 'MMM d'), duration: Math.round(duration), volume };
      });
    } else {
      const result = [];
      for (let i = 11; i >= 0; i--) {
        const wStart = startOfWeek(subWeeks(today, i), { weekStartsOn: 1 });
        const wEnd = endOfWeek(wStart, { weekStartsOn: 1 });
        const weekSessions = sessions.filter(s => s.startTime >= wStart.getTime() && s.startTime <= wEnd.getTime());
        
        let duration = 0;
        let volume = 0;
        weekSessions.forEach(s => {
          if (s.endTime) duration += (s.endTime - s.startTime) / 60000;
          else duration += 45;
          s.exercises.forEach(ex => ex.sets.forEach(set => {
            if (set.completed && set.weight && set.reps) volume += set.weight * set.reps;
          }));
        });

        result.push({ label: `W${format(wStart, 'ww')}`, duration: Math.round(duration), volume });
      }
      return result;
    }
  }, [sessions, timeRange, viewMode, selectedDate]);

  // Muscle Group Volume Pie Chart
  const volumeByMuscleGroup = useMemo(() => {
    if (!filteredSessions || !exercises) return [];
    const map: Record<string, number> = {};
    
    filteredSessions.forEach(s => {
      s.exercises.forEach(exLog => {
        const exDef = exercises.find(e => e.id === exLog.exerciseId);
        if (!exDef) return;
        const group = exDef.muscleGroup || 'Other';
        let vol = 0;
        exLog.sets.forEach(set => {
          if (set.completed && set.weight && set.reps) vol += set.weight * set.reps;
        });
        if (vol > 0) {
          map[group] = (map[group] || 0) + vol;
        }
      });
    });
    
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [filteredSessions, exercises]);

  const monthGrid = useMemo(() => {
    if (!sessions || !Array.isArray(sessions)) return [];
    try {
      const base = selectedDate;
      const start = startOfWeek(startOfDay(new Date(base.getFullYear(), base.getMonth(), 1)), { weekStartsOn: 1 });
      const end = endOfWeek(endOfMonth(base), { weekStartsOn: 1 });
      
      const days = eachDayOfInterval({ start, end });
      const sessionMap = new Set(
        sessions
          .filter(s => s && s.startTime)
          .map(s => format(new Date(s.startTime), 'yyyy-MM-dd'))
      );

      const weeks = [];
      for (let i = 0; i < days.length; i += 7) {
        const weekDays = days.slice(i, i + 7);
        if (weekDays.length === 0) continue;
        
        weeks.push(weekDays.map(d => ({
          date: d,
          active: sessionMap.has(format(d, 'yyyy-MM-dd')),
          isCurrentMonth: d.getMonth() === base.getMonth()
        })));
      }
      return weeks;
    } catch (e) {
      console.error("MonthGrid calculation failed", e);
      return [];
    }
  }, [sessions, selectedDate]);

  // If critical data isn't loaded yet, show a polite loading state or early return
  if (!sessions || !exercises) {
    return (
      <div className="flex-1 flex items-center justify-center p-10 text-apple-text-muted">
        <div className="flex flex-col items-center gap-4">
          <Activity className="animate-pulse text-apple-accent" size={48} />
          <p className="font-semibold animate-pulse">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 py-6 space-y-6 h-full overflow-y-auto pb-32">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <div className="flex bg-white/5 rounded-xl p-1 border border-white/5 h-9">
          <button 
            onClick={() => setViewMode('month')}
            className={`px-3 py-1 text-[10px] font-black tracking-tighter uppercase rounded-lg transition-all ${viewMode === 'month' ? 'bg-[#2c2c2e] text-white shadow-sm border border-white/10' : 'text-apple-text-muted hover:text-white'}`}
          >Month</button>
          <button 
            onClick={() => setViewMode('year')}
            className={`px-3 py-1 text-[10px] font-black tracking-tighter uppercase rounded-lg transition-all ${viewMode === 'year' ? 'bg-[#2c2c2e] text-white shadow-sm border border-white/10' : 'text-apple-text-muted hover:text-white'}`}
          >Year</button>
        </div>
      </div>
      
      {/* Strava-style Totals Card */}
      <section className="bg-apple-card rounded-[32px] p-6 border border-white/5 space-y-8">
        <div className="border-b border-white/10 pb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[11px] font-black text-apple-text-muted tracking-[0.2em]">
              {statsLabel} TOTALS
            </h3>
            {viewMode === 'month' && (
              <select 
                value={selectedDate.toISOString()}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="bg-transparent text-[11px] font-black text-apple-accent tracking-wider uppercase outline-none cursor-pointer"
              >
                {monthOptions.map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-black text-white">{opt.label}</option>
                ))}
              </select>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-8 items-start">
            <div className="relative">
              <span className="absolute -top-1 right-0 text-[10px] font-black text-apple-text-muted tracking-widest uppercase">Days</span>
              <div className="text-[84px] font-black leading-none tracking-tighter">
                {topStats.daysTrained}
              </div>
            </div>
            
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-apple-text-muted" />
                  <span className="text-2xl font-black">{topStats.totalHours}</span>
                </div>
                <span className="text-[10px] font-black text-apple-text-muted tracking-widest uppercase">Hrs</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <Dumbbell size={16} className="text-apple-text-muted" />
                  <span className="text-2xl font-black truncate max-w-[80px]">{Math.round(topStats.totalVol / 100) / 10}k</span>
                </div>
                <span className="text-[10px] font-black text-apple-text-muted tracking-widest uppercase">Vol</span>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Grid - Only show in Month view */}
        {viewMode === 'month' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="grid grid-cols-7 gap-1">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                <div key={i} className="text-[10px] font-black text-apple-text-muted text-center py-1">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="space-y-3">
              {monthGrid.map((week, i) => (
                <div key={i} className="grid grid-cols-7 gap-1">
                  {week.map((day, j) => (
                    <div key={j} className="flex justify-center items-center py-1">
                      {day.active ? (
                        <div className="w-8 h-8 rounded-full bg-[#ff4500] text-white flex items-center justify-center text-xs font-black shadow-[0_0_12px_rgba(255,69,0,0.4)] border border-[#ff4500]/50 transition-transform active:scale-95">
                          {day.date.getDate()}
                        </div>
                      ) : (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold ${day.isCurrentMonth ? 'text-white/40 bg-white/5' : 'text-white/10'}`}>
                          {day.isCurrentMonth ? day.date.getDate() : ''}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Top Section: Hero Stats & Recent PRs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-apple-card rounded-3xl p-5 border border-white/5 flex flex-col justify-center">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-sm font-semibold text-apple-text-muted uppercase tracking-wider">This Week</h3>
             <Activity size={18} className="text-apple-accent" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-apple-text-muted mb-1 font-bold">Sessions</div>
              <div className="text-3xl font-black">{thisWeekSessions.length}</div>
            </div>
            <div>
              <div className="text-xs text-apple-text-muted mb-1 font-bold">Volume</div>
              <div className="text-3xl font-black truncate">{totalVolume}<span className="text-sm text-apple-text-muted ml-1">kg</span></div>
            </div>
          </div>
        </div>

        <div className="bg-apple-card rounded-[28px] p-5 border border-white/5">
           <div className="flex justify-between items-center mb-3">
             <h3 className="text-sm font-semibold text-apple-text-muted uppercase tracking-wider">Recent PRs</h3>
             <Award size={18} className="text-yellow-500" />
           </div>
           <div className="space-y-2">
              {recentPRs.length > 0 ? recentPRs.map(pr => (
                <div key={pr.id} className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-2xl border border-white/5">
                   <div className="flex flex-col pr-2 truncate">
                     <span className="text-sm font-bold truncate">{pr.exerciseName}</span>
                     <span className="text-[10px] text-apple-text-muted font-bold tracking-wide uppercase">{format(new Date(pr.date), 'MMM d, yyyy')}</span>
                   </div>
                   <div className="flex items-center gap-2 shrink-0">
                     <span className="text-[10px] text-apple-green font-black uppercase tracking-wider bg-apple-green/10 px-1.5 py-0.5 rounded-md">+{pr.increase}kg</span>
                     <span className="text-sm font-black">{pr.weight}kg</span>
                   </div>
                </div>
              )) : (
                <div className="text-xs text-apple-text-muted italic bg-white/5 p-4 rounded-2xl text-center border border-white/5 font-medium">Keep training to break new PRs!</div>
              )}
           </div>
        </div>
      </div>

      {/* Analytics Toggles */}
      <div className="flex justify-between items-center mt-8 mb-2">
        <h3 className="text-sm font-semibold text-apple-text-muted uppercase tracking-wider">Analytics</h3>
        <div className="flex bg-white/5 rounded-xl p-1 border border-white/5">
          <button 
            onClick={() => setTimeRange('daily')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${timeRange === 'daily' ? 'bg-[#2c2c2e] text-white shadow-sm border border-white/10' : 'text-apple-text-muted hover:text-white'}`}
          >Daily</button>
          <button 
            onClick={() => setTimeRange('weekly')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${timeRange === 'weekly' ? 'bg-[#2c2c2e] text-white shadow-sm border border-white/10' : 'text-apple-text-muted hover:text-white'}`}
          >Weekly</button>
        </div>
      </div>

      {/* Time Series Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-apple-card rounded-[28px] p-5 border border-white/5">
          <h4 className="text-xs text-apple-text-muted mb-6 font-semibold uppercase tracking-wider flex items-center gap-1.5"><Dumbbell size={14}/> Total Volume</h4>
          <div className="h-44 w-full -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="label" stroke="#ffffff50" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff50" fontSize={10} tickLine={false} axisLine={false} width={40} />
                <RechartsTooltip cursor={{fill: '#ffffff05'}} contentStyle={{ backgroundColor: '#1c1c1e', border: '1px solid #ffffff20', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold' }} />
                <Bar dataKey="volume" fill="#0a84ff" radius={[4, 4, 0, 0]} barSize={timeRange==='daily'?8:24} name="Volume (kg)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-apple-card rounded-[28px] p-5 border border-white/5">
          <h4 className="text-xs text-apple-text-muted mb-6 font-semibold uppercase tracking-wider flex items-center gap-1.5"><Clock size={14}/> Workout Duration</h4>
          <div className="h-44 w-full -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="label" stroke="#ffffff50" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff50" fontSize={10} tickLine={false} axisLine={false} width={30} />
                <RechartsTooltip cursor={{fill: '#ffffff05'}} contentStyle={{ backgroundColor: '#1c1c1e', border: '1px solid #ffffff20', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold' }} />
                <Bar dataKey="duration" fill="#ff9f0a" radius={[4, 4, 0, 0]} barSize={timeRange==='daily'?8:24} name="Duration (min)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Muscle Group Pie Chart */}
        <div className="bg-apple-card rounded-[28px] p-5 border border-white/5 md:col-span-2">
          <h4 className="text-xs text-apple-text-muted mb-2 font-semibold uppercase tracking-wider flex items-center gap-1.5"><Flame size={14}/> Volume Breakdown</h4>
          <div className="h-56 w-full flex items-center justify-center">
            {volumeByMuscleGroup.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={volumeByMuscleGroup}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {volumeByMuscleGroup.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: number) => [`${value} kg`, 'Volume']}
                    contentStyle={{ backgroundColor: '#1c1c1e', border: '1px solid #ffffff20', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold' }} 
                  />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-apple-text-muted italic bg-white/5 py-4 px-6 rounded-2xl border border-white/5">No volume data available yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
