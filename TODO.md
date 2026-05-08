# TODO

## Step 1: Fix approvals pending endpoint
- [ ] Add explicit route `GET /api/approvals/pending` (or equivalent) in `server/routes/approvals.ts`.
- [ ] Ensure it filters `pending_approvals` by `tenant_id` and `status = 'pending'` and returns `approvals` + `count` like the list endpoint.

## Step 2: Fix refresh token duplicate key on refresh
- [ ] Update `server/utils/tokens.ts` `storeRefreshToken()` to avoid inserting duplicate `refresh_tokens.token`.
- [ ] Implement one of: revoke/replace prior record for that user, and/or `INSERT ... ON CONFLICT (token) DO UPDATE`.
- [ ] Verify no 23505 duplicate key occurs during repeated `/api/auth/refresh` calls.

## Step 3: Smoke test
- [x] Restart dev server (to be done).

- [ ] Call `GET /api/approvals/pending` and confirm 200 (requires valid access token / session).

- [ ] Trigger refresh flow and confirm 200 and no 23505.


