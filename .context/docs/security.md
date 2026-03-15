# Security & Compliance Notes

Aura Fitness runs entirely locally in the browser. All data resides in local storage and is not transmitted to external servers except where specific integrations might exist.

## Authentication & Authorization
Currently, there is no formal authentication layer as the application manages single-player state via `localStorage`.

## Secrets & Sensitive Data
There are no major secrets handled in the client application. Any API keys (e.g., for AI integrations like the Coach tab) should be stored securely in a `.env` file and never committed to source control (refer to `.env.example`).
