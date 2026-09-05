# Tasks: Analytics Section (`add-analytics-section`)

Dependency order: **T1 → T2 → {T3 → T4; T5}**. T3 depends on T1 + T2. T5 depends on T2 only (helpers must exist before History refactors, otherwise History breaks). T4 depends on T3.

## Review Workload Forecast (summary)

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Backend `GET /sales/breakdown` (Task 1) | PR 1 (~85 lines) | `pnpm --filter server typecheck` | `pnpm dev:server` + curl scenarios SCN-SB-1..9 | Revert 2 server files; zero client impact |
| 2 | Shared date filter + legacy cleanups (Tasks 2 + 5) | PR 2 (~240 lines) | `pnpm build:client` | `pnpm dev` → Historial presets identical (SCN-AN-9); Stock without earnings cards | Revert `datePresets.ts`, `DateRangeFilter.tsx`, `SalesHistoryPage.tsx`, `StockSalesPage.tsx`, client `getStats` line |
| 3 | Analytics page + wiring (Tasks 3 + 4) | PR 3 (~264 lines) | `pnpm build:client` | `pnpm dev` → `/analytics` full pass SCN-AN-1..8 | Revert `AnalyticsPage.tsx`, types/service additions, `App.tsx`, `BottomNav.tsx` |

Feature-branch-chain bases if chosen: PR 1 base = feature/tracker branch; PR 2 base = PR 1 branch; PR 3 base = PR 2 branch. All units stay under the 400-line budget.

## Task 1: Backend endpoint for sales breakdown

- [x] Implement the backend breakdown service and route.

**Scope**: Add `getSalesBreakdown()` — `$match` inclusive range → `$unwind items` → `$group` by `(itemType, itemId)` → `$lookup` recipe/tray names with snapshot fallback → `$sort { quantity: -1, revenue: -1 }` → `$facet` pagination — and expose `GET /sales/breakdown` reusing the `/sales/summary` date-parse pattern with limit/offset clamping.

**Files**:
- `server/src/services/sales.service.ts` — modify: add `getSalesBreakdown({ dateFrom?, dateTo?, limit?, offset? }) → { items, total }` per design pipeline; `roundCurrency` on profit; item cost via `$ifNull: ['$items.subtotalCost', 0]` (legacy sales → cost 0).
- `server/src/routes/sales.routes.ts` — modify: add `GET /breakdown` mirroring the parse at lines 53-61 (`T00:00:00` + `setHours(23,59,59,999)`); clamp `limit = Math.min(100, parseInt||10)`, `offset = Math.max(0, parseInt||0)`; respond `{ success: true, data: { items, total } }`.

**Depends on**: none

**Acceptance**:
- REQ-SB-1: contract `{ success, data: { items, total } }`; items `{ type, name, quantity, revenue, profit }`.
- REQ-SB-2 / SCN-SB-3, SCN-SB-4: inclusive end-of-day; omitted bounds = all time.
- REQ-SB-3 / SCN-SB-5: sums per group; legacy items contribute cost 0 → `profit = revenue`.
- REQ-SB-4 / SCN-SB-2, SCN-SB-9: mixed `recipe`/`tray` rows; `$lookup` name with `items.recipeName` snapshot fallback; deleted-product rows survive.
- REQ-SB-5 / SCN-SB-6: quantity desc, revenue desc tie-break (deterministic pagination).
- REQ-SB-6 / SCN-SB-1, SCN-SB-7: default limit 10, cap 100, offset ≥ 0, non-numeric → defaults; `total` enables hide-logic.

**Verification**: `pnpm --filter server typecheck`. Then `pnpm dev:server` and (token = auth PIN as Bearer):
- `curl -H "Authorization: Bearer $TOKEN" 'http://localhost:3001/api/sales/breakdown'` → top 10 + `total` (SCN-SB-1, SCN-SB-4)
- `...?dateFrom=2026-09-01&dateTo=2026-09-05` → includes a 22:00 sale that day (SCN-SB-3)
- `...?limit=500&offset=-3` → clamped, no error (SCN-SB-7)
- `...?dateFrom=2030-01-01` → `{ success: true, data: { items: [], total: 0 } }` (SCN-SB-8)
- Cross-check: Σ row `revenue` over all pages ≈ `data.totalAmount` of `/api/sales/summary` for the same range.

**Out of scope**: any frontend change; `/sales/stats` or `getSaleStats` changes; charts; new dependencies; auth changes.

## Task 2: Shared date filter components and helpers

- [x] Completed shared date filter components and helpers.

**Scope**: Extract `getPresetDates` + `Preset`/`PRESETS` from `SalesHistoryPage` into `client/src/utils/datePresets.ts` (pure refactor, identical I/O) and create `DateRangeFilter` (preset buttons + two date inputs) for reuse by Analytics and History.

**Files**:
- `client/src/utils/datePresets.ts` — new: export `Preset`, `PRESETS` (Hoy/Esta semana/Este mes/Todo), `getPresetDates()`; comment documenting the browser-TZ = `America/Argentina/Buenos_Aires` assumption (REQ-AN-4). No `date-fns-tz`.
- `client/src/components/common/DateRangeFilter.tsx` — new: props `{ preset, dateFrom, dateTo, onPreset, onDateChange }`; renders 4 preset buttons + `from`/`to` date inputs; styling lifted from `SalesHistoryPage.tsx:150-202` (incl. `dateInputStyle`).

**Depends on**: none (consumed by Tasks 3 and 5)

**Acceptance**:
- REQ-AN-3: `getPresetDates` identical inputs/outputs vs `SalesHistoryPage.tsx:9-31`.
- REQ-AN-4: browser-TZ comment present in `datePresets.ts`.
- `DateRangeFilter` visually matches the current History filter (active-preset styles, dash-separated date inputs).
- `pnpm build:client` passes.

**Verification**: `pnpm build:client` (tsc -b typechecks). Visual confirmation via consumers in Tasks 4/5. TZ audit (read-only): confirm `api/index.ts:4` and `server/src/main.ts:6-8` still pin TZ before any import; no change expected.

**Out of scope**: do NOT refactor `SalesHistoryPage` in this task (Task 5); no `AnalyticsPage`; no timezone library; no backend changes.

## Task 3: Analytics page implementation

- [x] Implement AnalyticsPage, sales breakdown client contract, and period cards.

**Scope**: Build `AnalyticsPage` (default preset `month`): parallel fetch of `/sales/summary` + `/sales/breakdown` for the selected range; three period cards (`Ganancia`, `Ganancia neta`, `Costo total`, es-AR, no client recalc) + inline breakdown table with `Ver más` pagination and loading/empty/error states.

**Files**:
- `client/src/types/sale.types.ts` — modify: add `BreakdownItem` (`type`, `name`, `quantity`, `revenue`, `profit`) + `BreakdownResponse`.
- `client/src/services/sales.service.ts` — modify: add `getBreakdown({ dateFrom, dateTo, limit, offset })`.
- `client/src/pages/AnalyticsPage.tsx` — new: uses `datePresets` + `DateRangeFilter`; filter change resets `offset` to 0 and refetches both blocks; `Ver más` appends (`offset += limit`), hidden when `offset + loaded ≥ total`.

**Depends on**: Task 1 (breakdown endpoint), Task 2 (shared helpers)

**Acceptance**:
- REQ-AN-2: every preset/custom-range change refetches cards and table.
- REQ-AN-5 / SCN-AN-4: cards equal the exact `/sales/summary` fields via `toLocaleString('es-AR', ...)`; no client-side recomputation.
- REQ-AN-6 / SCN-AN-5: default view = top 10 by quantity; `type` renders `receta`/`bandeja`.
- REQ-AN-7 / SCN-AN-6: `Ver más` shows 10 → 20 → 24 rows, hidden after the final page.
- REQ-AN-8: filter change resets breakdown offset.
- REQ-AN-9 / SCN-AN-7, SCN-AN-8: loading states; empty range shows zero-value cards without errors; backend error is non-blocking and working parts stay usable.
- SCN-AN-1, SCN-AN-2, SCN-AN-3: preset/custom boundaries come from the shared helper.

**Verification**: `pnpm build:client`. Functional pass after Task 4 wiring (`pnpm dev` → `/analytics`): each card matches `curl /api/sales/summary` for the same range; future-dated range → empty state; stop the server → non-blocking error while cards persist.

**Out of scope**: route/nav wiring (Task 4); charts, exports, period comparisons; changes to `SalesHistoryPage`/`StockSalesPage` (Task 5); breakdown table as separate component (design decision: inline).

## Task 4: Route wiring and navigation

- [x] Register the direct-import analytics route and add the Analytics bottom-nav entry.

**Scope**: Register `/analytics` as a direct-import route inside `ProtectedRoute` (matching the 8 existing routes; NOT lazy — per updated REQ-AN-1 and design decision) and append the 9th bottom-nav entry.

**Files**:
- `client/src/App.tsx` — modify: import `AnalyticsPage`; add `<Route path="/analytics" element={<AnalyticsPage />} />` inside the `ProtectedRoute` group.
- `client/src/components/layout/BottomNav.tsx` — modify: import `MdBarChart`; append `{ path: '/analytics', icon: MdBarChart, label: 'Analytics' }` to `navItems`.

**Depends on**: Task 3

**Acceptance**:
- REQ-AN-1: `/analytics` renders `AnalyticsPage` via direct import, inside `ProtectedRoute`.
- Bottom nav shows 9 entries; existing `overflowX: auto` handles overflow (no nav refactor).

**Verification**: `pnpm dev` → login → tap `Analytics` → page renders; logged-out access to `/analytics` redirects to `/login`; nav scrolls horizontally with 9 entries.

**Out of scope**: page internals; changes to other routes; nav styling/layout changes.

## Task 5: Cleanup of SalesHistoryPage and StockSalesPage

- [x] Completed SalesHistoryPage and StockSalesPage cleanup.

**Scope**: Refactor `SalesHistoryPage` to import `getPresetDates` from `datePresets.ts` and replace its preset+date JSX with `<DateRangeFilter>` (merge `handlePreset`/`handleDateChange`); un-render `<ProfitMetrics>` from `StockSalesPage` and drop its now-dead stats plumbing. `ProfitMetrics.tsx` file and server `/sales/stats` remain untouched.

**Files**:
- `client/src/pages/SalesHistoryPage.tsx` — modify: remove inline helper (lines 9-31), `presets` array, preset/date JSX (149-202), `dateInputStyle`; import shared helper + `<DateRangeFilter>`.
- `client/src/pages/StockSalesPage.tsx` — modify: remove `ProfitMetrics` import (line 5) + JSX (line 139); remove dead `stats` state (29), `fetchStats` (69-76) + its useEffect + the `fetchStats()` call in `handleSaleSubmit` (110), `SaleStats` type import (14).
- `client/src/services/sales.service.ts` — modify: remove now-unused client `getStats()` method. (Server `/sales/stats` route, `getSaleStats` service, and `ProfitMetrics.tsx` file all stay.)

**Depends on**: Task 2 (helpers must exist first, otherwise History breaks)

**Acceptance**:
- REQ-AN-3: History imports the shared helper; inline copy is gone; pure refactor.
- SCN-AN-9: History presets/custom-range behave identically before and after.
- Proposal success criterion: Stock no longer renders `<ProfitMetrics>`; page otherwise unchanged; sell flow still refreshes stock lists without runtime errors after `fetchStats` removal.
- sales-profit delta: render removal only; component file + `/sales/stats` endpoint contract intact.

**Verification**: `pnpm build:client`; `pnpm dev` → Historial: spot-check each preset + custom range returns the same data as before the refactor; Stock: no earnings cards, create a sale → stock lists refresh, no console errors.

**Out of scope**: server changes; deleting `ProfitMetrics.tsx` or `/sales/stats`; any Analytics page changes.

## Review Workload Forecast

| Task | Files touched | Estimated lines |
|------|---------------|-----------------|
| 1 Backend breakdown | 2 | ~85 additions |
| 2 Shared helpers | 2 | ~130 additions |
| 3 Analytics page | 3 | ~260 additions |
| 4 Route wiring | 2 | ~4 additions |
| 5 Cleanup | 3 | ~12 additions / ~95 deletions |
| **Total** | **11 files** | **~590 changed lines (±15%)** |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

- The design's "~300 lines" counted new code only; it undercounts this repo's verbose inline-style UI convention (existing pages run 265-344 lines), so the realistic total is ~480-700 and exceeds the 400-line review budget.
- Delivery strategy is `ask-on-risk` → before apply, the user must choose: (a) chained PRs per the work-units table (85 / 240 / 264 lines, all under budget), or (b) single PR with explicit `size:exception` acceptance.
- No task exceeds ~270 changed lines individually; dependencies are acyclic (T1, T2 → T3 → T4; T2 → T5) and every intermediate state after each task compiles, so no mid-implementation build breakage.
