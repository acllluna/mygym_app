export type ExerciseType = 'weighted' | 'bodyweight' | 'cardio' | 'assisted' | 'duration';

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  lastSync?: number;
  avatarUrl?: string;
  settings?: {
    useCloudSync: boolean;
    language: string;
    units: 'kg' | 'lbs';
  };
}

export interface Exercise {
  id: string;
  name: string;
  description?: string;
  muscleGroup?: string;
  bodyPart?: string;
  equipment?: string;
  secondaryMuscles?: string[];
  type: ExerciseType;
  thumbnail_url?: string;
  gif_url?: string;
}

export interface TemplateExercise {
  exerciseId: string;
  targetSets: number;
  targetReps?: number;
  targetDuration?: number; // seconds
}

export interface SessionTemplate {
  id: string;
  profileId?: string; // Link to user profile
  name: string;
  description?: string;
  exercises: TemplateExercise[];
  createdAt: number;
}

export interface LoggedSet {
  id: string;
  reps?: number;
  weight?: number; // kilos
  duration?: number; // seconds
  completed: boolean;
}

export interface LoggedExercise {
  exerciseId: string;
  sets: LoggedSet[];
}

export interface WorkoutSession {
  id: string;
  profileId?: string; // Link to user profile
  templateId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  exercises: LoggedExercise[];
}
