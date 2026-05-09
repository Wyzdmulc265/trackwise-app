# TODO

## Gross Profit / Profit / Inventory Cost Fix

- [x] Step 1: Fix server inventory `cogs` updates during transaction lifecycle (create/update/delete) for `sale` operations.
- [x] Step 2: Fix approval execution logic (`server/routes/approvals.ts`) to apply the same `cogs` updates for approved transaction actions.
- [x] Step 3: Ensure inventory price/cost fields are not missing from API responses/TS types (smoke check).
- [x] Step 4: Align `src/components/Reports.tsx` profit/gross profit computations with `Dashboard` (consistent `cogs` approach).
- [ ] Step 5: Run typecheck/build + quick runtime sanity checks (create purchase -> sale -> verify dashboard/report numbers).

