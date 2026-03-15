# Testing Strategy

Aura Fitness relies on standard React testing practices. Developers should ensure their modifications do not break the core data schemas or local storage interactions.

## Test Types
- **Unit**: Vitest/Jest for isolated function testing.
- **Integration**: React Testing Library for component interactions.

## Running Tests
- All tests: `npm run test` (if configured)
- Build check: `npm run build`

## Quality Gates
Ensure the TypeScript compiler passes without errors prior to submitting any code changes.
