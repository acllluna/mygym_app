# Data Flow & Integrations

Aura Fitness operates as a client-side application. Data enters via user interactions and is persisted locally.

## Module Dependencies
- **src/tabs/** → `src/db.ts`, `src/types.ts`
- **src/App.tsx** → `src/tabs/*`, `src/db.ts`

## Service Layer
- [`AuraFitnessDB`](file:///Users/acluna/Documents/Business_AI/aura-fitness/src/db.ts)

## High-level Flow
1. User interacts with a tab (e.g., `LibraryTab`, `WorkoutsTab`).
2. Component reads/writes state or invokes `AuraFitnessDB` methods.
3. `AuraFitnessDB` serializes/deserializes data to `localStorage`.
