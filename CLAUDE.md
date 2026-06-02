# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Next.js dashboard for [uni-api](https://github.com/yym68686/uni-api): it reads uni-api's
config (`api.yaml`) and its stats database to visualize usage, channel health, and request
logs, and lets admins edit the config. This app is a **read-only consumer** of the stats DB —
uni-api writes the `request_stats` / `channel_stats` tables; we only query them.

## Commands

```bash
pnpm dev      # dev server (Next.js, default :3000, override with PORT)
pnpm build    # production build
pnpm start    # serve the production build
pnpm lint     # eslint (must pass; CI runs it)
```

- Package manager is **pnpm** (`pnpm-lock.yaml` is committed; keep it in sync).
- There is no test suite. Verify changes by running `pnpm dev` and exercising the UI, plus
  `npx tsc --noEmit` for type checking.
- Local config lives in `.env.local` (see `.env.example`). Required: `API_YAML_PATH`,
  `STATS_DB_TYPE` (`sqlite` | `postgres`) and the matching DB vars.

## Two data sources

1. **`api.yaml`** (path from `API_YAML_PATH`) — providers, `api_keys`, and `model_price`.
   All access goes through `lib/config.ts` (`readConfig`, `requireKey`, `requireAdmin`,
   `listProviders`, `resolveTestTarget`, `saveConfig`). This is the source of truth for
   auth and channel definitions.
2. **Stats DB** (SQLite *or* PostgreSQL) — accessed only via `lib/db.ts` and `lib/stats.ts`.

## Auth model

There are no sessions/cookies. **Login is admin-only**: the Gate validates the entered key and
only admits it when its `role` is `admin`. The browser stores that admin key in `localStorage`
(`uniapi_admin_key`) and sends it as the `x-api-key` header on every request
(`requireApiKeyParam` falls back to a query param). Every stats/logs/config route re-validates it
with `requireAdmin` on each call.

**Viewing a key's usage** is separate from auth. The header is always the admin key; a `?key=`
query param (the `viewKey`) selects *whose* usage to show. `viewKey` empty/absent → aggregate
across **all** keys (the default). `resolveViewKey` (in `lib/config.ts`) validates that a
non-empty `viewKey` is a real `api.yaml` key before it reaches SQL. The browser stores the
current selection in `uniapi_view_key`; the sidebar **KeySwitcher** (`key-switcher.tsx`, fed by
`GET /api/stats/keys`) lists only keys that have ≥1 request. Raw keys belonging to other users are
never needed by the logs UI — `lib/stats.ts` resolves each request's `api_key` to a `{keyName,
keyRole}` label via `keyDirectory()` so the Logs screen can tag rows without leaking secrets.

## Request flow

- **UI**: `app/page.tsx` is a single client page that switches between screens by state
  (`overview` / `models` / `channels` / `logs` / `tester` / `config`) — no client routing.
  Screens live in `components/dashboard/screen-*.tsx`.
- **Data fetching**: TanStack Query hooks in `hooks/use-stats.ts`, which call the typed client
  in `lib/api-client.ts`, which hits the API routes.
- **API routes** (`app/api/**/route.ts`) are thin: wrap the body in `handleRoute()` (from
  `lib/api-helpers.ts`) for uniform error→JSON, gate with `requireAdmin(requireApiKeyParam(...))`,
  resolve the optional `?key=` via `resolveViewKey`, then delegate to `lib/stats.ts` (DB stats,
  always called with `viewKey: string | null`) or `lib/config.ts` (yaml). Throw
  `ApiError(status, msg)` for expected failures.

## Cross-database rules (lib/db.ts + lib/stats.ts)

`lib/db.ts` exposes one `query(sql, params)` using **PostgreSQL `$1,$2` placeholders**; the
SQLite branch rewrites `$n`→`?`. When writing or editing SQL in `lib/stats.ts`, two non-obvious
rules must hold for both engines (both were the cause of a "no data on Postgres" bug):

- **Quote camelCase column aliases**: write `as "totalTokens"`, not `as totalTokens`. PostgreSQL
  folds unquoted identifiers to lowercase (`totaltokens`), so the camelCase reads in JS return
  `undefined`. SQLite preserves case, so unquoted aliases pass locally and break in production.
- **Chat traffic spans multiple endpoints**: filter on the `CHAT_ENDPOINTS` array
  (`/v1/chat/completions`, `/v1/messages`, `/v1/responses`) via the `buildScope()` helper (which
  also appends the optional `viewKey` filter and emits the leading placeholders/params), never
  a single hard-coded endpoint — uni-api logs OpenAI, Anthropic, and Responses-style calls under
  different `endpoint` values.

`model_price` in `api.yaml` is **USD per 1M tokens** (`prompt,completion`); per-request cost is
`(prompt_tokens·prompt_price + completion_tokens·completion_price) / 1e6` (see `computeCost`).

## Channel Tester security

The client only sends a provider name + model display name. The server (`resolveTestTarget` in
`lib/config.ts`) looks up the real `base_url` and upstream key from `api.yaml` — clients can
never inject a URL or see upstream keys (anti-SSRF, no key leakage). The Tester screen uses
`auth.key`, not the admin's `viewingKey`.

## Styling

Components use mostly inline styles driven by CSS variables defined in `app/globals.css`
(`--ink`, `--surface`, `--line`, `--up`/`--down`/`--warn`, etc.); `components/ui/*` are
shadcn-style primitives. Responsiveness is handled by `.table-desktop` / `.table-mobile` toggles
and media queries at 880px / 560px — tables render as real `<table>`s on desktop and stacked
cards on mobile, so changes usually need to be made in both branches of a screen component.
