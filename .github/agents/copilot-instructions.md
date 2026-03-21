# tada Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-18

## Active Technologies
- TypeScript 5.x, Vue 3.4+, Nuxt 3.x + Drizzle ORM, TailwindCSS, Lucia Auth (002-graceful-rhythms)
- SQLite via Drizzle (existing database) (002-graceful-rhythms)
- TypeScript 5.x, Node.js 20 (production), Bun (development) + Nuxt 3, Vue 3, Drizzle ORM, Whisper.cpp (WASM), WebLLM (003-voice-input-llm)
- SQLite (Drizzle), IndexedDB (audio blobs, model cache) (003-voice-input-llm)
- TypeScript 5.x, Vue 3.4+, Nuxt 3.x + Nuxt 3, Vue 3, Drizzle ORM, SQLite, Zod (validation) (004-better-add)
- SQLite via Drizzle ORM (`app/server/db/schema.ts`) (004-better-add)
- TypeScript 5.9, Vue 3, Nuxt 4 + Drizzle ORM, Zod, Nodemailer, existing rhythm calculators, existing email templates, provider adapter for cloud AI, direct `croner` dependency during implementation for scheduler sweeps (009-weekly-rhythms)
- SQLite via Drizzle, plus existing environment-variable based SMTP/AI credentials (009-weekly-rhythms)

- TypeScript 5.x (strict mode), Vue 3 Composition API + Nuxt 3, Drizzle ORM, TailwindCSS (001-v020-completion)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.x (strict mode), Vue 3 Composition API: Follow standard conventions

## Recent Changes
- 009-weekly-rhythms: Added TypeScript 5.9, Vue 3, Nuxt 4 + Drizzle ORM, Zod, Nodemailer, existing rhythm calculators, existing email templates, provider adapter for cloud AI, direct `croner` dependency during implementation for scheduler sweeps
- 004-better-add: Added [if applicable, e.g., PostgreSQL, CoreData, files or N/A]
- 004-better-add: Added TypeScript 5.x, Vue 3.4+, Nuxt 3.x + Nuxt 3, Vue 3, Drizzle ORM, SQLite, Zod (validation)


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
