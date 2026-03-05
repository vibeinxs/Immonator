# Immonator — Claude Code Context

Immonator is a **German Real Estate Intelligence Platform** that helps property investors analyse deals, track portfolios, and understand city-level market trends.

## Project structure

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

## Tech stack

- **Framework**: React 18 + React Router v6
- **Language**: TypeScript (strict)
- **Build tool**: Vite (`import.meta.env.VITE_API_URL`)
- **Styling**: CSS custom properties + CSS Modules for component-scoped styles
- **Fonts**: DM Serif Display (headings), DM Sans (body), JetBrains Mono (mono)

## Running the app

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

## Authentication

Auth is managed via `src/lib/auth.ts`. Tokens are stored in `localStorage` under the keys `immo_token`, `immo_user_id`, and `immo_display_name`. Every API call automatically attaches `Authorization: Bearer <token>` and `X-User-ID: <id>` headers. A 401 response calls `logout()` which clears storage and redirects to `/beta-login`.

> Phase 4 plan (see comment in `auth.ts`): replace localStorage with Clerk's `useAuth()` hook.

## Routing

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

## Key types (`src/lib/immonatorApi.ts`)

- `Verdict` — `'strong_buy' | 'worth_analysing' | 'proceed_with_caution' | 'avoid'`
- `MarketTemperature` — `'hot' | 'warm' | 'neutral' | 'cool' | 'cold'`
- `PortfolioStatus` — `'watching' | 'analysing' | 'negotiating' | 'purchased' | 'rejected'`
- `Property` / `PropertyDetail` — property listing and full detail models
- `DeepAnalysisData` — AI-generated deep analysis with verdict, valuation, scenarios
- `NegotiateBrief` — negotiation strategy with recommended offer and walk-away price

## Design system

All colour, typography, and spacing tokens live in two places (kept in sync):

1. **CSS custom properties** in `src/index.css` — use in stylesheets and inline styles (`var(--color-brand)`)
2. **`src/styles/design-system.ts`** (`DESIGN` object) — use in TypeScript (chart configs, dynamic styles)

Dark-mode colour palette: `bgBase: #0A0F1E`, `bgSurface: #111827`, `bgElevated: #1C2333`.
Brand blue: `#2E6BFF`.

## Coding conventions

- Component files: PascalCase (e.g. `PropertyDetail.tsx`)
- CSS Module files: `ComponentName.module.css` alongside the component
- Inline styles are acceptable and common; prefer CSS vars over hard-coded hex values
- All API calls go through `api.get / api.post / api.put / api.patch / api.delete` from `src/lib/api.ts`
- No test framework is configured yet — the CI only runs sanity checks

## Legacy calculator (`index.html`)

The root `index.html` is a self-contained vanilla HTML/CSS/JS German real estate calculator. It does **not** use React or Vite and requires no build step — open it directly in a browser. It is separate from the React app in `src/`.
