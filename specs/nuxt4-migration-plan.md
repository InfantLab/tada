# Nuxt 4 Migration Plan

## Current Status (March 2026)

Nuxt 4 is **released and stable** (currently at v4.3). Nuxt 3 EOL is **July 31, 2026**.
The project is on Nuxt 3.15.1 — migration should happen before EOL.

Sources: [Nuxt 4 Announcement](https://nuxt.com/blog/v4), [Upgrade Guide](https://nuxt.com/docs/4.x/getting-started/upgrade)

## Key Breaking Changes Relevant to This Project

### 1. App Directory Structure (LOW impact)
Nuxt 4 defaults to `app/` as the source directory. **This project already uses `app/`** as its
root — the Nuxt config, pages, components, composables, server, etc. all live under `/workspaces/tada/app`.
This should be auto-detected, but needs verification that paths resolve correctly.

### 2. Shallow Reactivity for Data Fetching (LOW impact)
`useAsyncData` and `useFetch` default to shallow reactivity. Only one file uses these
(`components/DraftIndicator.vue`) and it does not access nested reactive properties.
No changes expected, but audit during testing.

### 3. Separate TypeScript Projects (MEDIUM impact)
Nuxt 4 creates separate TS projects for app, server, shared, and config. The project
already has `shared/` and `server/` directories. The current `tsConfig` overrides in
`nuxt.config.ts` may need adjustment. The single `tsconfig.json` approach may conflict
with the current setup.

### 4. Module Compatibility (MEDIUM impact)
Modules in use that need compatibility checks:
- `@nuxtjs/tailwindcss` (^6.13.1) — check for Nuxt 4 compatible version
- `@vite-pwa/nuxt` (^0.10.6) — check for Nuxt 4 compatible version
- `@nuxt/eslint` (^0.7.4) — likely compatible, verify
- `@nuxt/devtools` (^1.7.0) — bundled in Nuxt 4, may be removable

### 5. Experimental Features (LOW impact)
`payloadExtraction` and `componentIslands` are used. These are likely stable in Nuxt 4
and may move out of `experimental`. Config key may change.

### 6. `compatibilityDate` (LOW impact)
Already set to `"2026-01-10"`. Nuxt 4 continues to use this mechanism.

### 7. Builder Watch Hook (NO impact)
Not used in this project.

## Compatibility Flags to Enable Now (in Nuxt 3)

Add to `nuxt.config.ts` to test Nuxt 4 behavior before upgrading:

```ts
future: {
  compatibilityVersion: 4
}
```

This enables the new directory structure detection, shallow reactivity defaults, and
other v4 behaviors while still on Nuxt 3. Run the full test suite after enabling.

## Migration Steps

1. **Enable compatibility flag** — add `future: { compatibilityVersion: 4 }` to
   `nuxt.config.ts` and run tests. Fix any issues.
2. **Check module versions** — verify `@nuxtjs/tailwindcss`, `@vite-pwa/nuxt`, and
   `@nuxt/eslint` have Nuxt 4 compatible releases. Update as needed.
3. **Run the codemod** — `npx codemod@latest nuxt/4/file-structure` to auto-fix
   directory structure issues (likely a no-op since we already use `app/`).
4. **Bump Nuxt** — change `"nuxt": "^3.15.1"` to `"nuxt": "^4.0.0"` in `package.json`.
   Remove `@nuxt/devtools` if bundled. Update `@nuxt/test-utils`.
5. **Fix TypeScript config** — adapt to separated TS projects. Remove `tsConfig`
   overrides from `nuxt.config.ts` if they conflict; move settings to root `tsconfig.json`.
6. **Audit `createError` calls** — 120+ server files use `createError`. Verify the API
   signature hasn't changed (it likely hasn't, but confirm).
7. **Test PWA** — workbox config and service worker registration with the new build output.
8. **Remove `future.compatibilityVersion`** — no longer needed on Nuxt 4.
9. **Full regression test** — run `bun run test:run`, `bun run typecheck`, `bun run build`.

## Risk Assessment

| Area | Risk | Rationale |
|------|------|-----------|
| Directory structure | Low | Already using `app/` layout |
| Data fetching | Low | Minimal use of `useAsyncData`/`useFetch` |
| Module compat | Medium | PWA and Tailwind modules need verified v4 support |
| TypeScript config | Medium | Separated TS projects may require config rework |
| Nitro/Server | Low | Nitro config is standard; externals should carry over |
| PWA/Workbox | Medium | Service worker generation may change with new build |
| Overall | **Low-Medium** | Project structure already aligns with Nuxt 4 conventions |

Estimated effort: **1-2 days** including testing, assuming module compatibility is confirmed.
