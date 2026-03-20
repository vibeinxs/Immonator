# Immonator — Claude Code Context

Immonator is a **German Real Estate Intelligence Platform** that helps property investors analyse deals, track portfolios, and understand city-level market trends.

---

## 🗂 Two front-end repos — choosing the right one

There are **two separate front-end repositories** that share the same back-end API:

| Repo | GitHub | Stack | Env var | When to use it |
|------|--------|-------|---------|----------------|
| **immonator-Front-End-V0** | [`vibeinxs/immonator-Front-End-V0`](https://github.com/vibeinxs/immonator-Front-End-V0) | Next.js 16 · React 19 · Tailwind v4 · shadcn/ui | `NEXT_PUBLIC_API_URL` | First-generation UI — V0 features, migration reference, or Codespaces dev |
| **Immonator** ← *you are here* | [`vibeinxs/Immonator`](https://github.com/vibeinxs/Immonator) | React 18 · Vite · CSS custom properties | `VITE_API_URL` | Active V2 development and production work |

### How to switch front ends in Claude Code

Open the repo you want to work on directly in [Claude Code web](https://code.claude.ai):

- **V0 work** → open `vibeinxs/immonator-Front-End-V0`
- **V2 work** → open `vibeinxs/Immonator` (this repo)

Both repos connect to the same FastAPI back-end. The API contract, auth scheme, and endpoint paths documented in the **Back-end** section below apply to both. Note that a small number of endpoint paths differ between the two clients — those differences are called out inline in the endpoint tables.

---

## Back-end API

The back-end is a **FastAPI** service. An `openapi.json` schema lives in the V0 repo root (`vibeinxs/immonator-Front-End-V0/openapi.json`).

| | V2 (this repo) | V0 |
|-|----------------|----|
| **Base URL** | `https://api.immonator.de` (custom domain) | `https://web-production-61c120.up.railway.app` (Railway) |
| **Env var** | `VITE_API_URL` | `NEXT_PUBLIC_API_URL` |

> Both URLs point to the same FastAPI instance — the Railway URL is the origin, `api.immonator.de` is the custom domain in front of it.

All authenticated requests must include:

```
Authorization: Bearer <token>   # stored in localStorage key immo_token
X-User-ID:     <user_id>        # stored in localStorage key immo_user_id
```

A `401` response triggers automatic `logout()` → redirect to `/beta-login`.

Error shape: `{ message?: string; error?: string }` (HTTP 4xx/5xx).

### Auth endpoints

| Method | Path | Body / Params | Response |
|--------|------|---------------|----------|
| `POST` | `/api/auth/beta-login` | `{ beta_code, display_name? }` | `{ token, user_id, display_name }` |
| `POST` | `/api/auth/refresh` | — | `{ token }` |
| `GET`  | `/api/auth/me` | — | `{ user_id, display_name }` |

### Properties endpoints

| Method | Path | Body / Params | Response |
|--------|------|---------------|----------|
| `GET`  | `/api/properties` | `?city, min_price, max_price, min_rooms, property_type, page, limit, sort_by` | `Property[]` |
| `GET`  | `/api/properties/:id` | — | `PropertyDetail` |
| `GET`  | `/api/properties/stats` | — | `{ total_listings, total_cities }` |
| `POST` | `/api/properties/scrape` *(V2)* · `/api/properties/trigger-scrape` *(V0)* | `{ city, max_price, min_rooms }` | `{ job_id }` |

### Portfolio endpoints

| Method | Path | Body / Params | Response |
|--------|------|---------------|----------|
| `POST`  | `/api/portfolio/watch/:id` | — | `{ message }` |
| `GET`   | `/api/portfolio` | `?status` | `PortfolioEntry[]` |
| `PATCH` | `/api/portfolio/:id/status` | `{ status, notes?, purchase_price? }` | `{ message }` |
| `DELETE`| `/api/portfolio/:id` | — | `{ message }` |

### Analysis endpoints

| Method | Path | Body / Params | Response |
|--------|------|---------------|----------|
| `GET`  | `/api/analysis/compact/:id` | — | `CompactAnalysisData` |
| `POST` | `/api/analysis/deep/:id` | — | `{ job_id }` |
| `GET`  | `/api/analysis/deep/:id` | — | `DeepAnalysisData` |
| `GET`  | `/api/analysis/market/:city/stats` | — | `MarketStats` |
| `GET`  | `/api/analysis/market/:city` | `?property_type` | `MarketData` |
| `POST` | `/api/analysis/portfolio` | — | `{ job_id }` |
| `GET`  | `/api/analysis/portfolio` | — | `PortfolioAnalysis` |
| `POST` | `/api/analysis/scenario/:id` | `ScenarioParams` | `ScenarioResult` |
| `POST` | `/api/analysis/scenario/:id/save` | `{ name, params }` | `SavedScenario` |
| `GET`  | `/api/analysis/scenario/:id/saved` | — | `SavedScenario[]` |

### Strategy endpoints

| Method | Path | Body / Params | Response |
|--------|------|---------------|----------|
| `POST` | `/api/strategy/generate` | — | `StrategyData` |
| `GET`  | `/api/strategy` | — | `StrategyData` |
| `GET`  | `/api/strategy/matches` | — | `Property[]` |

### Negotiation endpoints

| Method | Path | Body / Params | Response |
|--------|------|---------------|----------|
| `POST` | `/api/negotiation/:id` *(V2)* · `/api/negotiate/:id` *(V0)* | — | `NegotiateBrief` |
| `GET`  | `/api/negotiation/:id` *(V2)* · `/api/negotiate/:id` *(V0)* | — | `NegotiateBrief` |

### User profile endpoints

| Method | Path | Body / Params | Response |
|--------|------|---------------|----------|
| `GET`  | `/api/users/profile` | — | `UserProfileData` |
| `PUT` *(V2)* · `POST` *(V0)* | `/api/users/profile` | `UserProfileData` | `UserProfileData` |

### Chat endpoints

| Method | Path | Body / Params | Response |
|--------|------|---------------|----------|
| `POST`   | `/api/chat/stream` *(V2)* · `/api/chat` *(V0)* | `{ message, context_type, context_id? }` | `ReadableStream` (SSE) |
| `GET`    | `/api/chat/history` | `?context_type, context_id` | `ChatMessage[]` |
| `DELETE` | `/api/chat/history` | `?context_type, context_id` | `{ message }` |

### Miscellaneous endpoints

| Method | Path | Body / Params | Response |
|--------|------|---------------|----------|
| `POST` | `/api/feedback` | `{ type, content, page_context?, rating? }` | `{ message }` |
| `POST` | `/api/waitlist` | `{ email, feature }` | `{ message }` |

---

## This repo — Immonator (Front-end V2)

### Project structure

```
/
├── index.html          # Legacy standalone calculator (vanilla HTML/CSS/JS, no build step)
├── src/
│   ├── App.tsx         # Root router — all routes defined here
│   ├── index.css       # Global CSS custom properties (design tokens as CSS vars)
│   ├── pages/          # Full-page route components
│   ├── components/     # Reusable UI components (auth/, layout/, analysis/, chat/, market/, common/, onboarding/)
│   ├── lib/            # Utilities and API clients
│   │   ├── api.ts          # Generic fetch wrapper (injects Bearer token + X-User-ID header)
│   │   ├── auth.ts         # localStorage-based auth (token, userId, displayName)
│   │   └── immonatorApi.ts # All API types (Property, PropertyDetail, Verdict, etc.) + API call functions
│   └── styles/
│       └── design-system.ts  # Design token constants (mirrors CSS vars, use in JS/TS logic)
└── .github/workflows/ci.yml  # CI: verifies index.html + src/ exist; blocks .env/.pem commits
```

### Tech stack

- **Framework**: React 18 + React Router v6
- **Language**: TypeScript (strict)
- **Build tool**: Vite (`import.meta.env.VITE_API_URL`)
- **Styling**: CSS custom properties + CSS Modules for component-scoped styles
- **Fonts**: DM Serif Display (headings), DM Sans (body), JetBrains Mono (mono)

### Running the app

There is no `package.json` committed to the repo. Set one up with Vite + React if the build toolchain is missing:

```bash
npm create vite@latest . -- --template react-ts
npm install react-router-dom
npm run dev
```

Set the API base URL before starting:

```bash
VITE_API_URL=https://api.immonator.de npm run dev
# or create a .env.local file (it is gitignored):
echo "VITE_API_URL=https://api.immonator.de" > .env.local
```

### Authentication

Auth is managed via `src/lib/auth.ts`. Tokens are stored in `localStorage` under the keys `immo_token`, `immo_user_id`, and `immo_display_name`. Every API call automatically attaches `Authorization: Bearer <token>` and `X-User-ID: <id>` headers. A 401 response calls `logout()` which clears storage and redirects to `/beta-login`.

> Phase 4 plan (see comment in `auth.ts`): replace localStorage with Clerk's `useAuth()` hook.

### Routing

| Path | Component | Auth required |
|---|---|---|
| `/` | `Landing` | No |
| `/beta-login` | `BetaLogin` | No |
| `/properties` | `Properties` | Yes |
| `/properties/:id` | `PropertyDetail` | Yes |
| `/portfolio` | `Portfolio` | Yes |
| `/markets` | `Markets` (placeholder) | Yes |
| `/market/:city` | `MarketPage` | Yes |
| `/strategy` | `Strategy` | Yes |

All authenticated routes are wrapped in `ProtectedRoute` (redirects to `/beta-login` if not logged in) and rendered inside `AppShell` (top nav + bottom mobile nav + feedback modal).

### Key types (`src/lib/immonatorApi.ts`)

- `Verdict` — `'strong_buy' | 'worth_analysing' | 'proceed_with_caution' | 'avoid'`
- `MarketTemperature` — `'hot' | 'warm' | 'neutral' | 'cool' | 'cold'`
- `PortfolioStatus` — `'watching' | 'analysing' | 'negotiating' | 'purchased' | 'rejected'`
- `Property` / `PropertyDetail` — property listing and full detail models
- `DeepAnalysisData` — AI-generated deep analysis with verdict, valuation, scenarios
- `NegotiateBrief` — negotiation strategy with recommended offer and walk-away price
- `StrategyData` — AI-generated investment strategy with target cities, financing options, matching properties
- `MarketData` — city-level market intelligence (temperature, value zones, neighbourhoods, outlook)
- `ScenarioResult` / `SavedScenario` — what-if modelling output
- `UserProfileData` — investor profile (equity, income, risk style, target cities)
- `ChatMessage` — AI chat history entry

### Design system

All colour, typography, and spacing tokens live in two places (kept in sync):

1. **CSS custom properties** in `src/index.css` — use in stylesheets and inline styles (`var(--color-brand)`)
2. **`src/styles/design-system.ts`** (`DESIGN` object) — use in TypeScript (chart configs, dynamic styles)

Dark-mode colour palette: `bgBase: #0A0F1E`, `bgSurface: #111827`, `bgElevated: #1C2333`.
Brand blue: `#2E6BFF`.

### Coding conventions

- Component files: PascalCase (e.g. `PropertyDetail.tsx`)
- CSS Module files: `ComponentName.module.css` alongside the component
- Inline styles are acceptable and common; prefer CSS vars over hard-coded hex values
- All API calls go through `api.get / api.post / api.put / api.patch / api.delete` from `src/lib/api.ts`
- No test framework is configured yet — the CI only runs sanity checks

### Legacy calculator (`index.html`)

The root `index.html` is a self-contained vanilla HTML/CSS/JS German real estate calculator. It does **not** use React or Vite and requires no build step — open it directly in a browser. It is separate from the React app in `src/`.

---

## Front-end V0 — immonator-Front-End-V0

> Full source: [`vibeinxs/immonator-Front-End-V0`](https://github.com/vibeinxs/immonator-Front-End-V0)

### Tech stack

- **Framework**: Next.js 16 (App Router) + React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui (Radix UI primitives)
- **Charts**: Recharts
- **Package manager**: pnpm (primary)
- **Dev environment**: `.devcontainer` included — works with GitHub Codespaces

### Project structure

```
/
├── app/
│   ├── layout.tsx            # Root layout (fonts, theme provider)
│   ├── page.tsx              # Landing / home page
│   ├── globals.css           # Tailwind base styles
│   ├── beta-login/           # Public login page
│   ├── api/                  # Next.js route handlers (thin proxies)
│   └── (protected)/          # Auth-gated pages (server-side redirect)
│       ├── layout.tsx        # Shared nav shell for protected pages
│       ├── properties/       # Property listing + detail
│       ├── analyse/          # Property analysis view
│       ├── market/           # City market pages
│       ├── portfolio/        # Portfolio tracker
│       └── strategy/         # Investment strategy
├── components/               # shadcn/ui + custom components
├── hooks/                    # Custom React hooks
├── lib/
│   ├── api.ts                # Fetch wrapper (NEXT_PUBLIC_API_URL + auth headers)
│   ├── auth.ts               # localStorage token helpers
│   ├── immonatorApi.ts       # All API type definitions + call functions
│   ├── localCompute.ts       # Client-side financial calculations
│   ├── copy.ts               # UI copy / text strings
│   └── i18n/                 # Internationalisation helpers
├── types/                    # Shared TypeScript types
├── styles/                   # Additional global styles
├── openapi.json              # FastAPI OpenAPI schema (generated from backend)
└── .env.local.example        # Template — copy to .env.local
```

### Running the app

```bash
pnpm install          # or: npm install
cp .env.local.example .env.local
# edit .env.local — set NEXT_PUBLIC_API_URL
pnpm dev              # or: npm run dev
```

Environment variables:

```bash
# .env.local
NEXT_PUBLIC_API_URL=https://web-production-61c120.up.railway.app
# local backend:
# NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Routing (Next.js App Router)

| Path | Notes | Auth required |
|------|-------|---------------|
| `/` | Landing page | No |
| `/beta-login` | Beta access login | No |
| `/(protected)/properties` | Property listing | Yes |
| `/(protected)/properties/:id` | Property detail | Yes |
| `/(protected)/analyse` | Analysis view | Yes |
| `/(protected)/market/:city` | City market page | Yes |
| `/(protected)/portfolio` | Portfolio tracker | Yes |
| `/(protected)/strategy` | Investment strategy | Yes |

Protected routes are wrapped in `app/(protected)/layout.tsx` which enforces authentication server-side.

### Key differences from V2

| Aspect | V0 | V2 |
|--------|----|----|
| Framework | Next.js App Router (SSR/SSG) | React + Vite (SPA) |
| Styling | Tailwind v4 + shadcn/ui | CSS custom properties |
| Env var | `NEXT_PUBLIC_API_URL` | `VITE_API_URL` |
| `scrape` path | `/api/properties/trigger-scrape` | `/api/properties/scrape` |
| `chat` path | `/api/chat` | `/api/chat/stream` |
| `negotiation` path | `/api/negotiate/:id` | `/api/negotiation/:id` |
| `profile` method | `POST` (upsert) | `PUT` |
| Extra lib | `localCompute.ts` (local financial math), `i18n/` | — |
| Codespaces | `.devcontainer` included | Not configured |

---

## Change Log

### Session: 2026-03-17 — AI Features Contract (cross-repo, research only)

#### Purpose
Define the shared frontend ↔ backend data contract for four AI features:
AI Insight, AI Analysis, Negotiation Strategy, Ask AI chat.
No endpoints implemented yet. This is the authoritative contract definition.

## AI Features — Data Contract

### Endpoint List

| # | Feature | Method | Path | Status |
|---|---------|--------|------|--------|
| 1 | AI Insight | `POST` | `/api/ai/insight` | **net-new** |
| 2 | AI Analysis | `POST` | `/api/ai/analysis` | **net-new** |
| 3 | Negotiation (manual/inline) | `POST` | `/api/ai/negotiation` | **net-new** (existing `/api/negotiate/:id` requires DB property) |
| 4 | Ask AI — send | `POST` | `/api/chat` | **extend** (new `context_type` values + `context_data` field) |
| 4b | Ask AI — history | `GET` | `/api/chat/history` | no change |

---

### Shared Base Types

#### `PropertySnapshot`
```typescript
interface PropertySnapshot {
  address: string           // required
  purchase_price: number    // required
  sqm: number
  year_built: number
  condition: "existing" | "newbuild"
  energy_class?: string
}
```

#### `MetricsSnapshot`
```typescript
interface MetricsSnapshot {
  score: number             // required
  verdict: string           // required
  net_yield_pct: number     // required
  gross_yield_pct?: number
  kpf: number               // required
  cash_flow_monthly_yr1: number  // required
  annuity_monthly?: number
  irr_10: number            // required
  irr_15?: number
  irr_20?: number
  equity_multiple_10: number
  equity_multiple_15?: number
  equity_multiple_20?: number
  ltv_pct?: number
  closing_costs?: number
  annual_afa?: number
  afa_tax_saving_yr1?: number
  // market enrichment — null in local-compute mode, populated after /analyse backend call
  market_rent_m2?: number | null
  bodenrichtwert_m2?: number | null
  current_mortgage_rate?: number | null
  location_score?: number | null
  population_trend?: string | null
}
```

#### `ComparisonSummary`
Pre-computed on the frontend from `CompareTable.tsx` logic (lines 124–152).
```typescript
interface ComparisonSummary {
  winner_net_yield: "a" | "b" | "tie"
  winner_irr_10:    "a" | "b" | "tie"
  winner_score:     "a" | "b" | "tie"
  winner_cash_flow: "a" | "b" | "tie"
  delta_net_yield_pct: number
  delta_irr_10: number
  delta_cash_flow_monthly: number
  auto_summary: string   // e.g. "A has higher net yield · B scores lower overall"
}
```

---

### AI Insight — `POST /api/ai/insight`

**Purpose**: Concise executive summary, ≤ 5 bullets. NOT a duplicate of AI Analysis.
**Model**: `claude-haiku-4-5` (fast, stateless, no DB persistence).
**Source in frontend**: `store/analysisStore.tsx` → `resultA` / `resultB`, `inputA` / `inputB`.

**Request (single)**:
```json
{
  "mode": "single",
  "property": PropertySnapshot,
  "metrics": MetricsSnapshot
}
```
**Request (comparison)**:
```json
{
  "mode": "comparison",
  "property_a": PropertySnapshot, "metrics_a": MetricsSnapshot,
  "property_b": PropertySnapshot, "metrics_b": MetricsSnapshot,
  "comparison_summary": ComparisonSummary
}
```
**Response**:
```json
{
  "mode": "single|comparison",
  "headline": "string",
  "bullets": ["string"],          // single mode
  "bullets_a": ["string"],        // comparison mode
  "bullets_b": ["string"],        // comparison mode
  "sentiment": "positive|neutral|negative",
  "recommendation": "a|b|null",
  "recommendation_reason": "string|null",
  "confidence": "high|medium|low",
  "generated_at": "ISO datetime"
}
```

---

### AI Analysis — `POST /api/ai/analysis`

**Purpose**: Deep narrative (investment thesis, risks, tax efficiency, exit). Supports single + comparison.
**Model**: `claude-sonnet-4-6` (stateless, no DB persistence for inline mode).
**Source in frontend**: full `inputA` + `resultA` from `store/analysisStore.tsx`; `year_data` trimmed to rows [1,5,10,15,20].

**Request (single)**:
```json
{
  "mode": "single",
  "property": PropertySnapshot,
  "financing": { "equity": 0, "loan": 0, "interest_rate": 0, "repayment_rate": 0, "ltv_pct": 0, "closing_costs": 0 },
  "income": { "rent_monthly": 0, "hausgeld_monthly": 0, "maintenance_nd": 0, "management_nd": 0, "vacancy_rate": 0 },
  "assumptions": { "rent_growth": 0, "appreciation": 0, "tax_rate": 0, "holding_years": 10 },
  "afa": { "afa_method": "linear", "afa_rate_pct": 0, "annual_afa": 0, "afa_basis": 0, "special_afa_enabled": false },
  "metrics": MetricsSnapshot,
  "year_data": [/* max 5 rows: years 1,5,10,15,20 */]
}
```
**Request (comparison)**: same but `property_a/b`, `financing_a/b`, `metrics_a/b`, `year_data_a/b`, `comparison_summary`.

**Response**:
```json
{
  "mode": "single|comparison",
  "verdict": "string",
  "headline": "string",
  "summary": "string",
  "sections": {
    "investment_thesis": "string",
    "risks": "string",
    "market_context": "string",
    "tax_efficiency": "string",
    "exit_strategy": "string"
  },
  "top_3_positives": ["string"],
  "top_3_risks": ["string"],
  "recommendation": "a|b|null",         // comparison only
  "recommendation_reason": "string|null",
  "head_to_head": {                      // comparison only
    "irr_10": { "winner": "a|b", "margin": "slight|significant" }
  },
  "confidence_score": 0.0,
  "data_quality": "high|medium|low",
  "generated_at": "ISO datetime"
}
```

**`sections.*`** are passed as context to Ask AI chat on follow-up questions.

---

### Negotiation Strategy — `POST /api/ai/negotiation`

**Purpose**: German RE negotiation brief (inline, no DB property_id required).
**Model**: `claude-sonnet-4-6`.
**Reuses existing `NegotiationBrief` response shape** from `types/api.ts`.

**Request**:
```json
{
  "property": PropertySnapshot,   // asking_price = purchase_price
  "metrics": MetricsSnapshot,
  "user_profile": {               // optional — fetched from GET /api/users/profile
    "available_equity": 0,
    "risk_tolerance": "moderate",
    "target_yield_percent": 3.5
  }
}
```
**Response** (unchanged `NegotiationBrief` shape):
```json
{
  "recommended_offer": 0,
  "walk_away_price": 0,
  "strategy": "string",
  "leverage_points": ["string"],
  "talking_points_de": ["string"],
  "talking_points_en": ["string"],
  "offer_letter_draft": "string"
}
```

---

### Ask AI Chat — `POST /api/chat` (extended)

**New `context_type` values**: `"analysis_single"`, `"analysis_compare"` (add to `_VALID_CONTEXT_TYPES`).
**New field**: `context_data` — assembled from live store state before each send, never persisted.

**Request (single analysis)**:
```json
{
  "message": "string",
  "context_type": "analysis_single",
  "context_id": null,
  "context_data": {
    "address": "string",
    "purchase_price": 0,
    "net_yield_pct": 0,
    "irr_10": 0,
    "cash_flow_monthly_yr1": 0,
    "score": 0,
    "verdict": "string",
    "market_rent_m2": null
  }
}
```
**Request (comparison)**:
```json
{
  "message": "string",
  "context_type": "analysis_compare",
  "context_id": null,
  "context_data": {
    "property_a": { "address": "string", "net_yield_pct": 0, "irr_10": 0 },
    "property_b": { "address": "string", "net_yield_pct": 0, "irr_10": 0 },
    "comparison_summary": "A has higher net yield · A scores higher overall"
  }
}
```
**Response**: existing SSE stream — no change.

---

### Frontend Source Mapping

| Feature | Store fields consumed | Transformation needed |
|---------|-----------------------|-----------------------|
| AI Insight | `resultA.score/verdict/net_yield_pct/kpf/irr_10/cash_flow_monthly_yr1/equity_multiple_10/ltv_pct/closing_costs/annual_afa/afa_tax_saving_yr1` | `comparison_summary` — extract `CompareTable` lines 124–152 to `lib/compareUtils.ts` |
| AI Analysis | all of `inputA` + `resultA` | `financing.*` computed from input; `year_data` trimmed to 5 rows; `energy_class` (Step 1 type extension) |
| Negotiation (manual) | `inputA.purchase_price/sqm/year_built/condition/energy_class`, all `resultA` metrics | merge `user_profile` from `GET /api/users/profile` before sending |
| Ask AI Chat | `resultA` / `resultB` live state | `context_data` assembled per message in `AnalysisChat.tsx` before `sendChatMessage()` call |

**Missing fields in current types**:
- `energy_class` on `AnalyseRequest` → already added (Session 2026-03-06)
- `context_data` on chat request → new field, needs `AnalysisChat.tsx` update when implementing

---

### Backend Location Guide

| Feature | New route | New agent | Reuse |
|---------|-----------|-----------|-------|
| AI Insight | `api/ai_router.py` | `agents/insight_agent.py` | `_fmt` helpers from `negotiation_agent.py` |
| AI Analysis | `api/ai_router.py` | `agents/inline_analysis_agent.py` | `_build_prompt` structure from `deep_analysis_agent.py` |
| Negotiation (inline) | `api/ai_router.py` | extend `agents/negotiation_agent.py` | `NegotiationBrief` response model |
| Ask AI Chat | `api/chat_router.py` (extend) | extend `agents/chat_agent.py` | `_VALID_CONTEXT_TYPES` frozenset |

New shared schema file: `immonator/schemas/ai_schemas.py` — Pydantic models for `PropertySnapshot`, `MetricsSnapshot`, `ComparisonSummary`.

---

### Open Questions

| # | Question |
|---|----------|
| 1 | Can `CompactAnalysisAgent` be reused for AI Insight (it already produces `verdict + top_3_*`) or is a new `insight_agent.py` cleaner? |
| 2 | Should `ai_analysis: string` in `AnalyseResponse` be replaced by structured `InlineAnalysisResponse` or stay a plain string? |
| 3 | Where does inline negotiation live in the frontend routing — new `/analyse/negotiate` route or modal on the analysis page? |
| 4 | Confirm trimming `year_data` to 5 rows `[1,5,10,15,20]` is acceptable for AI quality. |
| 5 | Do `/api/ai/*` routes require `Depends(get_current_user)` auth (assume yes, confirm)? |
| 6 | Rate limiting / per-user daily quota for `claude-sonnet-4-6` endpoints? |

