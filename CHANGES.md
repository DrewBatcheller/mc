# UX/Design Refactoring Changelog

## Color System — Brand Alignment
- **CSS variables** (`globals.css`): Replaced neutral greys with cool blue-grey tones derived from MC logo palette. Background has a subtle cool tint. Borders carry a blue-grey undertone.
- **Primary color**: Now a dark navy-teal (`oklch(0.30 0.045 235)`) instead of pure black
- **Accent color**: Light teal tint for hover/active states
- **Ring/focus**: Brand teal instead of generic grey
- **Chart palette**: Teal → blue → emerald gradient for better differentiation
- **Radius**: Tightened from 0.625rem to 0.375rem for crisper edges

## Blue → Brand Teal Migration
All generic `blue-50/100/600/700` references updated across 15+ files:
- **Links**: `text-blue-600` → `text-teal-700` (hover: `text-teal-600`)
- **Highlights**: `bg-blue-50` → `bg-teal-50`, `bg-blue-100` → `bg-teal-100`
- **Active states**: Sidebar active items use `bg-accent text-accent-foreground` (theme-aware teal)
- **Calendar today**: Teal highlight instead of blue
- **Badges**: Info badges use teal tones
- **Financial charts**: Revenue=teal, Expenses=slate, Profit=emerald (better contrast)
- **Exception**: `StatusBadge` "live" status intentionally uses `teal` (was blue) for brand alignment
- **Exception**: Team department "Strategy" uses `sky` (semantic differentiation from brand teal)

## Component Density
- **Card** (`components/ui/card.tsx`): `py-6 gap-6 px-6` → `py-3 gap-3 px-4`. Removed `shadow-sm`, changed `rounded-lg` → `rounded-md`
- **Table headers** (`components/ui/table.tsx`): `text-foreground h-10 font-medium` → `text-muted-foreground h-8 text-xs font-medium uppercase tracking-wider` (Airtable-style)
- **App shell**: Main content padding `p-6` → `p-4`
- **Page gaps**: All page-level `gap-6` → `gap-4`
- **StandardMetricCard**: `text-3xl` → `text-xl font-semibold tabular-nums`. Tighter padding. Added `teal` color option.
- **Tracker stat cards**: Fixed contradictory `pt-1 pb-1 py-0` → clean `px-3 py-2`. Values `text-2xl` → `text-xl`. Labels `text-sm` → `text-xs`.

## StatusBadge Overhaul
- **Default variant**: Changed from `subtle` (was actually the same) to properly flat pastel tones with subtle borders
- **Subtle**: `bg-{color}-50 text-{color}-700 border-{color}-200/60` — softer, flatter, better for dense tables
- **Solid**: Toned down slightly — still vibrant but less aggressive
- **Live status**: Uses `teal` instead of `blue` to align with brand
- **Consolidated**: Removed duplicate style entries

## Badge Colors (`lib/v2/badge-colors.ts`)
- All status/stage colors updated to use `{color}-50` bg with `{color}-200/60` borders
- Softer, more consistent appearance across client status, lead status, and lead stage badges
- Added dark mode variants

## Cleanup
- **Removed all `console.log`** debug statements (13 instances across 6 files)
- **Consolidated `globals.css`**: `styles/globals.css` now re-imports from `app/globals.css` (was a full duplicate)
- **Fixed** duplicate CSS classes (`pl-1 pl-2` → `pl-2` in dashboard metric card)
- **Fixed** contradictory padding in tracker stat cards

## Files Changed
```
app/globals.css                          — Full rewrite (brand palette)
styles/globals.css                       — Now re-imports app/globals.css
components/ui/card.tsx                   — Tighter padding
components/ui/table.tsx                  — Compact headers
components/v2/app-shell.tsx              — Tighter padding
components/v2/sidebar.tsx                — Brand active states
components/v2/status-badge.tsx           — Full rewrite (cleaner, brand-aligned)
components/v2/standard-metric-card.tsx   — Compact rewrite
components/v2/dashboard/dashboard-content.tsx  — Layout fixes
components/v2/client-tracker/tracker-content.tsx — Density + cleanup
components/v2/client-tracker/experiment-detail-panel.tsx — Brand colors
components/v2/client-tracker/variant-data-table.tsx — Brand colors
components/v2/clients/clients-content.tsx — Density + colors
components/v2/clients/client-detail-content.tsx — Brand colors
components/v2/clients/clients-analytics.tsx — Removed debug logs
components/v2/contacts-editor.tsx        — Brand colors
components/v2/financial/finance-overview.tsx — Chart colors
components/v2/financial/dividends.tsx    — Removed debug logs
components/v2/financial/metric-card.tsx  — Brand colors
components/v2/leads/leads-content.tsx    — Brand colors + cleanup
components/v2/schedule/schedule-content.tsx — Brand colors
components/v2/shared/batch-row-group.tsx — Brand colors
components/v2/test-ideas/ideas-content.tsx — Brand colors
components/v2/default-pie-chart.tsx      — Removed debug logs
lib/v2/badge-colors.ts                  — Full rewrite (brand-aligned)
```
