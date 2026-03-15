import Dexie, { Table } from 'dexie';
import { Exercise, SessionTemplate, WorkoutSession } from './types';

export class AuraFitnessDB extends Dexie {
  exercises!: Table<Exercise, string>;
  templates!: Table<SessionTemplate, string>;
  sessions!: Table<WorkoutSession, string>;

  constructor() {
    super('AuraFitnessDB');
    this.version(1).stores({
      exercises: 'id, name, muscleGroup, equipment',
      templates: 'id, name, createdAt',
      sessions: 'id, templateId, startTime, endTime'
    });
  }
}

export const db = new AuraFitnessDB();
