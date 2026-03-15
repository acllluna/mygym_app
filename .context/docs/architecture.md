# Architecture Notes

Aura Fitness is a React-based web application built with Vite and TypeScript.

## System Architecture Overview
The system is a client-side monolith designed to run locally or statically. Control flow is handled by React component tabs with state management and persistence handled by a local storage database abstraction.

## Architectural Layers
- **UI Components**: React components (`src/tabs/*.tsx`, `src/App.tsx`)
- **Database**: Local storage adapter `AuraFitnessDB` (`src/db.ts`)
- **Types**: Shared interfaces and type definitions (`src/types.ts`)

> See [`codebase-map.json`](./codebase-map.json) for complete symbol counts and dependency graphs.

## Detected Design Patterns
| Pattern | Confidence | Locations | Description |
|---------|------------|-----------|-------------|
| Repository | 90% | `src/db.ts` | Abstracts local storage data access |
| Component | 95% | `src/tabs/*.tsx` | React component-based UI isolation |

## Entry Points
- [`src/main.tsx`](file:///Users/acluna/Documents/Business_AI/aura-fitness/src/main.tsx)
- [`src/App.tsx`](file:///Users/acluna/Documents/Business_AI/aura-fitness/src/App.tsx)

## Public API
| Symbol | Type | Location |
|--------|------|----------|
| `AuraFitnessDB` | Class | `src/db.ts` |
| `Exercise` | Interface | `src/types.ts` |
| `WorkoutSession` | Interface | `src/types.ts` |

## Top Directories Snapshot
- `src/` (main application code)
- `src/tabs/` (UI feature components)
- `scripts/` (utility scripts)

## Related Resources
- [Project Overview](./project-overview.md)
- [Data Flow & Integrations](./data-flow.md)
