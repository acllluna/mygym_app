import Dexie, { Table } from 'dexie';
import { Exercise, SessionTemplate, WorkoutSession, UserProfile } from './types';

export class AuraFitnessDB extends Dexie {
  exercises!: Table<Exercise, string>;
  templates!: Table<SessionTemplate, string>;
  sessions!: Table<WorkoutSession, string>;
  profiles!: Table<UserProfile, string>;

  constructor() {
    super('AuraFitnessDB');
    this.version(2).stores({
      exercises: 'id, name, muscleGroup, equipment',
      templates: 'id, name, profileId, createdAt',
      sessions: 'id, profileId, templateId, startTime, endTime',
      profiles: 'id, email, name'
    });
  }
}

export const db = new AuraFitnessDB();
