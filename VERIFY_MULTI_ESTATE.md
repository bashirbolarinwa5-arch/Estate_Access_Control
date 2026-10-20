# ✅ Multi-Estate Verification Checklist

Run this after deploying the multi-estate backend and running
`migration-multi-estate.sql`. Every step lists the expected result —
do not move on until it matches.

Login uses the browser UI (Platform Owner dropdown for SUPER_ADMIN).

---

## A. Setup (as SUPER_ADMIN)

- [ ] 1. Log in as SUPER_ADMIN → lands on **/super-admin/admins** (Estate Administrators).
- [ ] 2. **Estates → Create Estate**: name `Estate A`, code `ESTA`. → Appears in the list as **Active**.
- [ ] 3. Create a second estate: name `Estate B`, code `ESTB`. → Two rows, both Active.
- [ ] 4. Try creating an estate with a duplicate code (`ESTB`) → error "Estate code already exists".
- [ ] 5. **Estate Admins → Create Admin**: username `adminA`, estate **Estate A**. → Appears in the table with estate "Estate A".
- [ ] 6. Create `adminB` for **Estate B** the same way.

## B. Estate-level setup (as each estate admin)

- [ ] 7. Log out, log in as `adminA` (dropdown **Administrator**) → lands on estate dashboard; sidebar shows only admin modules.
- [ ] 8. **Residents → Add Resident**: create `residentA1` (belonging to Estate A's admin). Repeat a second resident if desired.
- [ ] 9. Log out, log in as `adminB` → create `residentB1` for Estate B.

## C. Data isolation

- [ ] 10. Logged in as `adminA`: add a visitor for `residentA1` and create a visit; approve it as the resident; check the visitor in/out as required. Everything should behave exactly like pre-refactor EstateFlow.
- [ ] 11. Log out → log in as `adminB`.
  - **Residents** list: shows **only `residentB1`** — `residentA1` invisible.
  - **Visitors / Visits**: only Estate B records — none of Estate A's.
- [ ] 12. As `adminB`, create a walk-in visit for a resident: the resident dropdown only lists Estate B residents.
- [ ] 13. Data-isolation spot check via API (optional): copy `adminA`'s JWT, then call `GET /visit` with it — only Estate A visits return; there is no endpoint that returns another estate's data (single-record fetches verify estate ownership server-side).

## D. Access codes cannot cross estates

- [ ] 14. As `adminA`/`residentA1`, note a visit's access code (e.g. `ABC123`).
- [ ] 15. Log in as a **Security** user of Estate B (create one via `adminB` first) and try to check in code `ABC123` → error **"Access code not found"**. Same message as a genuinely wrong code — no cross-estate probing.

## E. Deactivated estate blocks login

- [ ] 16. Log in as SUPER_ADMIN → **Estates → Deactivate `Estate B`** (confirm).
- [ ] 17. Log out, try to log in as `adminB` → rejected: **"This estate has been deactivated. Please contact the platform administrator."** No JWT, no dashboard.
- [ ] 18. Same rejection for a SECURITY or RESIDENT user of Estate B.
- [ ] 19. An already-logged-in Estate B token (if any) fails every estate call (service-layer estate checks) — and after this change, new logins are impossible.
- [ ] 20. **Estates → Activate `Estate B`** → `adminB` can log in again immediately. All Estate B data intact.

## F. Platform view

- [ ] 21. As SUPER_ADMIN, **Estates**: both estates listed with correct admin/resident/security headcounts.
- [ ] 22. **System Activity**: login events from BOTH estates visible.
- [ ] 23. Log in as `adminA` → **Activity Logs**: only Estate A's events (platform-level/system events from before estates are visible to SUPER_ADMIN only).
- [ ] 24. Platform dashboard cards: Estates (total/active), Admins, Residents, Security Personnel, Visitors, Visits all plausible.

## G. Regression (existing functionality preserved)

- [ ] 25. Resident portal: profile, my visitors, planned visit creation, approve/reject of PENDING visits.
- [ ] 26. Security: walk-in registration → resident approval → check-in → check-out lifecycle.
- [ ] 27. Reports page (`/reports`) shows only the estate's visits.
- [ ] 28. Login dropdown roles still match account roles (wrong role picked → clear error).

---

**When every box is ticked, the platform is deployment-ready.**
