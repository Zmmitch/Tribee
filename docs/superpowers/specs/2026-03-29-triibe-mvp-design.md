# Triibe MVP Design Spec

**Date:** 2026-03-29
**Status:** Approved
**Phase:** 1 (MVP)
**Scope:** User auth, trip creation, group invites, destination voting, shared itinerary, expense splitting

---

## 1. Product Overview

Triibe is a group travel planning mobile app (iOS & Android) that takes trips from idea to itinerary to boarding pass. The MVP covers the core planning loop: create a trip, invite friends, vote on destinations, build a shared itinerary, split expenses, and store travel documents.

### MVP Features

- **Authentication** — email/password, magic links, Google OAuth, Apple OAuth (Supabase Auth)
- **Trip creation** — creates a trip and auto-generates a persistent group entity
- **Group invites** — shareable deep links with expirable tokens + email invites
- **Destination voting** — ranked-choice polls with budget filters and auto-resolution deadlines
- **Shared itinerary** — drag-and-drop day planner with conflict detection and live updates
- **Expense splitting (Triibe Tab)** — flexible splits (equal, percentage, exact, by attendee) with min-transaction settlement engine
- **Document vault (The Vault)** — file storage with expiry alerts for passports, visas, insurance

### Out of Scope for MVP

- Multi-currency support (Phase 2)
- Flight/hotel search integration (Phase 2)
- Social layer: group discovery, link-up requests, The Watering Hole (Phase 3)
- Phone/SMS authentication
- Contacts integration
- CRDT-based concurrent editing
- Username search / in-app user discovery

---

## 2. Architecture

### Approach: Monolith-First

Single Node.js API server (Fastify) with Supabase as the backend platform. All business logic organized into 5 bounded contexts as isolated modules within one deployable unit. Supabase handles auth, PostgreSQL, Realtime WebSockets, and file storage.

### System Layers

```
React Native App (Expo)
  ├── iOS + Android
  ├── React Navigation (stack + tabs)
  ├── Zustand (client state)
  ├── React Query (server state + cache)
  └── Supabase JS Client (auth, realtime, storage)
        │
        ▼ HTTPS + WSS
Node.js API Server (Fastify)
  ├── src/modules/identity/    (Identity & Access)
  ├── src/modules/trips/       (Trip Planning)
  ├── src/modules/voting/      (Voting)
  ├── src/modules/expenses/    (Triibe Tab)
  └── src/modules/vault/       (The Vault)
        │
        ▼ Supabase JS Client
Supabase Platform
  ├── Auth (email, magic link, Google, Apple OAuth)
  ├── PostgreSQL (RLS-enforced)
  ├── Realtime (WebSocket subscriptions + Presence)
  └── Storage (document files)
```

### 5 Bounded Contexts

| Context | Module | Responsibility |
|---------|--------|----------------|
| Identity & Access | `identity/` | Auth, profiles, groups, membership, invite tokens |
| Trip Planning | `trips/` | Trips, itinerary items, scheduling, conflict detection, activity log |
| Voting | `voting/` | Polls, ranked-choice ballots, budget filters, auto-resolution |
| Expenses | `expenses/` | Expenses, flexible splits, balances, min-transaction settlement |
| Documents | `vault/` | File storage, document sharing, expiry alerts |

### Module Internal Structure

Each module follows the same pattern:

```
modules/<name>/
  ├── routes.ts          # HTTP endpoint definitions
  ├── service.ts         # Business logic
  ├── repository.ts      # Database queries
  ├── types.ts           # Domain types and interfaces
  └── events.ts          # Domain events emitted
```

Plus domain-specific files (e.g., `settlement.ts`, `ranked-choice.ts`, `conflict-detector.ts`).

### Module Communication Rules

**Allowed:**
- Import another module's `types.ts`
- Listen to another module's domain events via the in-process event bus
- Call another module's service through a typed interface

**Forbidden:**
- Import another module's `repository.ts`
- Direct database queries across module boundaries
- Shared mutable state between modules

### Codebase Layout

```
src/
├── app/                          # App bootstrap, middleware, config
│   ├── server.ts
│   ├── middleware/
│   └── config/
├── modules/                      # Bounded contexts
│   ├── identity/
│   ├── trips/
│   ├── voting/
│   ├── expenses/
│   └── vault/
├── shared/                       # Cross-cutting (no business logic)
│   ├── supabase.ts               # Supabase client init
│   ├── event-bus.ts              # In-process event bus
│   ├── auth-middleware.ts        # JWT verification
│   └── errors.ts                 # Shared error types
└── mobile/                       # React Native app
    ├── navigation/
    ├── screens/
    ├── components/
    ├── hooks/
    ├── stores/
    └── services/
```

---

## 3. Data Model

### 3.1 Identity & Access

**profiles** — extends Supabase auth.users

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | → auth.users(id) ON DELETE CASCADE |
| display_name | text | NOT NULL |
| avatar_url | text | |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

**groups** — persistent entity, auto-created with first trip

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | DEFAULT gen_random_uuid() |
| name | text | NOT NULL |
| avatar_url | text | |
| created_by | uuid | → profiles(id) |
| created_at | timestamptz | DEFAULT now() |

**group_members** — membership with roles

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | DEFAULT gen_random_uuid() |
| group_id | uuid | → groups(id) ON DELETE CASCADE |
| user_id | uuid | → profiles(id) ON DELETE CASCADE |
| role | text | CHECK ('admin','member') DEFAULT 'member' |
| joined_at | timestamptz | DEFAULT now() |
| | | UNIQUE(group_id, user_id) |

**invite_tokens** — expirable, single-use deep link tokens

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | DEFAULT gen_random_uuid() |
| trip_id | uuid | → trips(id) ON DELETE CASCADE |
| group_id | uuid | → groups(id) ON DELETE CASCADE |
| invited_by | uuid | → profiles(id) |
| invited_email | text | NULL if link-only |
| token | text | UNIQUE NOT NULL |
| expires_at | timestamptz | NOT NULL |
| used_at | timestamptz | NULL until redeemed |
| used_by | uuid | → profiles(id) |
| created_at | timestamptz | DEFAULT now() |

### 3.2 Trip Planning

**trips** — core planning entity, belongs to a group

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | DEFAULT gen_random_uuid() |
| group_id | uuid | → groups(id) ON DELETE CASCADE |
| name | text | NOT NULL |
| description | text | |
| destination | text | Set after voting resolves |
| start_date | date | |
| end_date | date | |
| currency | text | DEFAULT 'USD' |
| status | text | CHECK ('planning','confirmed','active','completed','cancelled') DEFAULT 'planning' |
| created_by | uuid | → profiles(id) |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

**itinerary_items** — ordered activities within a trip

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | DEFAULT gen_random_uuid() |
| trip_id | uuid | → trips(id) ON DELETE CASCADE |
| title | text | NOT NULL |
| description | text | |
| category | text | CHECK ('transport','accommodation','activity','food','other') |
| location | text | |
| start_time | timestamptz | |
| end_time | timestamptz | |
| sort_order | float8 | NOT NULL DEFAULT 0 |
| day_number | integer | Which day of trip (1-indexed) |
| created_by | uuid | → profiles(id) |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

**activity_log** — change tracking for realtime feed

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | DEFAULT gen_random_uuid() |
| trip_id | uuid | → trips(id) ON DELETE CASCADE |
| user_id | uuid | → profiles(id) |
| action | text | NOT NULL |
| entity_type | text | |
| entity_id | uuid | |
| metadata | jsonb | DEFAULT '{}' |
| created_at | timestamptz | DEFAULT now() |

### 3.3 Voting

**polls** — ranked-choice polls with auto-resolution

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | DEFAULT gen_random_uuid() |
| trip_id | uuid | → trips(id) ON DELETE CASCADE |
| title | text | NOT NULL |
| poll_type | text | CHECK ('destination','activity','date','custom') |
| status | text | CHECK ('open','resolved','cancelled') DEFAULT 'open' |
| deadline | timestamptz | Auto-resolve after this time |
| resolved_option_id | uuid | → poll_options(id) |
| budget_min | numeric(12,2) | |
| budget_max | numeric(12,2) | |
| created_by | uuid | → profiles(id) |
| created_at | timestamptz | DEFAULT now() |

**poll_options** — choices within a poll

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | DEFAULT gen_random_uuid() |
| poll_id | uuid | → polls(id) ON DELETE CASCADE |
| title | text | NOT NULL |
| description | text | |
| metadata | jsonb | DEFAULT '{}' |
| created_by | uuid | → profiles(id) |
| created_at | timestamptz | DEFAULT now() |

**ballots** — one per user per poll

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | DEFAULT gen_random_uuid() |
| poll_id | uuid | → polls(id) ON DELETE CASCADE |
| user_id | uuid | → profiles(id) ON DELETE CASCADE |
| submitted_at | timestamptz | DEFAULT now() |
| | | UNIQUE(poll_id, user_id) |

**ballot_rankings** — ranked choices within a ballot

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | DEFAULT gen_random_uuid() |
| ballot_id | uuid | → ballots(id) ON DELETE CASCADE |
| option_id | uuid | → poll_options(id) ON DELETE CASCADE |
| rank | integer | NOT NULL (1 = first choice) |
| | | UNIQUE(ballot_id, option_id) |

### 3.4 Expenses (Triibe Tab)

**expenses** — who paid what

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | DEFAULT gen_random_uuid() |
| trip_id | uuid | → trips(id) ON DELETE CASCADE |
| paid_by | uuid | → profiles(id) |
| title | text | NOT NULL |
| amount | numeric(12,2) | NOT NULL |
| category | text | CHECK ('transport','accommodation','food','activity','shopping','other') |
| split_type | text | CHECK ('equal','percentage','exact','by_attendee') DEFAULT 'equal' |
| receipt_url | text | Optional photo via Supabase Storage |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

**expense_splits** — how each expense is divided

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | DEFAULT gen_random_uuid() |
| expense_id | uuid | → expenses(id) ON DELETE CASCADE |
| user_id | uuid | → profiles(id) ON DELETE CASCADE |
| amount | numeric(12,2) | NOT NULL (computed share) |
| percentage | numeric(5,2) | If split_type = 'percentage' |
| | | UNIQUE(expense_id, user_id) |

**settlements** — computed min-transaction payouts

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | DEFAULT gen_random_uuid() |
| trip_id | uuid | → trips(id) ON DELETE CASCADE |
| group_id | uuid | → groups(id) ON DELETE CASCADE |
| from_user | uuid | → profiles(id) |
| to_user | uuid | → profiles(id) |
| amount | numeric(12,2) | NOT NULL |
| status | text | CHECK ('pending','paid','confirmed') DEFAULT 'pending' |
| paid_at | timestamptz | |
| confirmed_at | timestamptz | |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

### 3.5 Documents (The Vault)

**documents** — files stored in Supabase Storage

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | DEFAULT gen_random_uuid() |
| trip_id | uuid | → trips(id) ON DELETE CASCADE |
| uploaded_by | uuid | → profiles(id) |
| title | text | NOT NULL |
| doc_type | text | CHECK ('passport','visa','insurance','booking','ticket','other') |
| storage_path | text | NOT NULL |
| file_name | text | NOT NULL |
| file_size | integer | |
| mime_type | text | |
| expires_at | date | For expiry alerts |
| metadata | jsonb | DEFAULT '{}' |
| created_at | timestamptz | DEFAULT now() |

**document_shares** — who can see each document

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | DEFAULT gen_random_uuid() |
| document_id | uuid | → documents(id) ON DELETE CASCADE |
| share_scope | text | CHECK ('group','individual') NOT NULL |
| shared_with | uuid | → profiles(id) ON DELETE CASCADE, required when scope = 'individual' |
| created_at | timestamptz | DEFAULT now() |

Indexes on document_shares:
- `CREATE UNIQUE INDEX idx_doc_shares_individual ON document_shares(document_id, shared_with) WHERE share_scope = 'individual';`
- `CREATE UNIQUE INDEX idx_doc_shares_group ON document_shares(document_id) WHERE share_scope = 'group';` (one group share per doc)

### 3.6 Row-Level Security

All data access scoped through group membership via a single helper function:

```sql
CREATE FUNCTION is_group_member(p_group_id uuid) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

**Per-table policies:**

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| profiles | Own + co-members | Auto (DB trigger on auth.users insert creates profile row) | Own only | — |
| groups | Member | Authenticated | Admin | — |
| group_members | Co-member | Admin or via invite | Admin | Admin |
| invite_tokens | Inviter | Admin | Any (redeem) | — |
| trips | Member (via group) | Member | Member | Admin |
| itinerary_items | Member (via trip→group) | Member | Member | Creator or admin |
| activity_log | Member (via trip→group) | Member | — | — |
| polls | Member (via trip→group) | Member | Creator or admin | Creator or admin |
| poll_options | Member | Member (poll open) | — | Creator (poll open) |
| ballots | Own only | Own (poll open) | Own (poll open) | — |
| ballot_rankings | Own only | Own ballot | Own ballot | — |
| expenses | Member (via trip→group) | Member | Creator | Creator |
| expense_splits | Member | Expense creator | Expense creator | Expense creator |
| settlements | from_user or to_user | System only | to_user (confirm) | — |
| documents | Uploader or shared | Member | Uploader | Uploader |
| document_shares | Doc uploader | Doc uploader | — | Doc uploader |

### 3.7 Indexes

```sql
-- Identity
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE UNIQUE INDEX idx_group_members_pair ON group_members(group_id, user_id);
CREATE UNIQUE INDEX idx_invite_tokens_token ON invite_tokens(token);

-- Trips
CREATE INDEX idx_trips_group ON trips(group_id);
CREATE INDEX idx_itinerary_trip_day ON itinerary_items(trip_id, day_number, sort_order);
CREATE INDEX idx_activity_log_trip ON activity_log(trip_id, created_at DESC);

-- Voting
CREATE INDEX idx_polls_trip ON polls(trip_id, status);
CREATE UNIQUE INDEX idx_ballots_pair ON ballots(poll_id, user_id);

-- Expenses
CREATE INDEX idx_expenses_trip ON expenses(trip_id);
CREATE INDEX idx_splits_expense ON expense_splits(expense_id);
CREATE INDEX idx_splits_user ON expense_splits(user_id, expense_id);
CREATE INDEX idx_settlements_trip ON settlements(trip_id, status);

-- Documents
CREATE INDEX idx_documents_trip ON documents(trip_id);
CREATE INDEX idx_documents_expiry ON documents(expires_at) WHERE expires_at IS NOT NULL;
```

### 3.8 Realtime Subscriptions

**Database change subscriptions** (Supabase Realtime, scoped to trip via RLS):

- `itinerary_items` — live itinerary updates
- `activity_log` — change feed
- `polls` / `ballots` — vote progress
- `expenses` — new expense alerts
- `settlements` — payment confirmations

**Presence channel** (Supabase Presence API, no DB table):

- Channel per trip: `trip:{trip_id}`
- Tracks who is currently viewing the trip
- Broadcast typing/editing indicators

---

## 4. API Routes

### 4.1 Identity & Access — `/api/v1/`

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/signup | Email/password signup via Supabase Auth |
| POST | /auth/login | Email/password or magic link |
| POST | /auth/oauth | Google / Apple OAuth redirect |
| POST | /auth/refresh | Refresh token rotation |
| GET | /profile | Own profile |
| PATCH | /profile | Update display_name, avatar |
| GET | /groups | My groups |
| GET | /groups/:id/members | Group member list |
| POST | /invites | Create invite token (+ optional email) |
| POST | /invites/redeem | Redeem token → auto-join trip + group |

### 4.2 Trip Planning — `/api/v1/trips`

| Method | Path | Description |
|--------|------|-------------|
| POST | /trips | Create trip (auto-creates group) |
| GET | /trips | My trips (via group membership) |
| GET | /trips/:id | Trip detail + metadata |
| PATCH | /trips/:id | Update name, dates, status |
| GET | /trips/:id/itinerary | Ordered items by day |
| POST | /trips/:id/itinerary | Add item |
| PATCH | /trips/:tripId/itinerary/:id | Update item |
| PATCH | /trips/:tripId/itinerary/:id/reorder | Move item (new float8 sort_order) |
| DELETE | /trips/:tripId/itinerary/:id | Remove item |
| GET | /trips/:id/activity | Paginated activity feed |

### 4.3 Voting — `/api/v1/trips/:tripId/polls`

| Method | Path | Description |
|--------|------|-------------|
| POST | /polls | Create poll with options + deadline |
| GET | /polls | Trip's polls (open + resolved) |
| GET | /polls/:id | Poll detail + vote count + my ballot |
| POST | /polls/:id/options | Add option (while poll open) |
| POST | /polls/:id/vote | Submit ranked ballot |
| PUT | /polls/:id/vote | Update ballot (server-side deadline enforcement: reject if deadline passed) |
| POST | /polls/:id/resolve | Manual resolve (admin) or auto via cron |

### 4.4 Expenses — `/api/v1/trips/:tripId/expenses`

| Method | Path | Description |
|--------|------|-------------|
| POST | /expenses | Add expense + splits |
| GET | /expenses | Trip's expenses |
| GET | /expenses/:id | Expense detail + splits |
| PATCH | /expenses/:id | Update amount, splits, category |
| DELETE | /expenses/:id | Remove expense (recalculates settlements) |
| GET | /balances | Per-user net balances for trip |
| GET | /settlements | Computed min-transaction settlements |
| PATCH | /settlements/:id | Mark as paid / confirm received |

### 4.5 Documents — `/api/v1/trips/:tripId/documents`

| Method | Path | Description |
|--------|------|-------------|
| POST | /documents | Upload file → Supabase Storage + metadata |
| GET | /documents | Trip's documents (filtered by access). `?expiring=true` for docs expiring within 30 days |
| GET | /documents/:id | Metadata + signed download URL |
| DELETE | /documents/:id | Remove (uploader only) |
| POST | /documents/:id/share | Share with user or whole group |

---

## 5. Business Logic

### 5.1 Ranked-Choice Voting (Instant Runoff)

1. Count first-choice votes for each option
2. If any option has >50% of votes → winner
3. Otherwise, eliminate option with fewest first-choice votes
4. Redistribute eliminated option's votes to each ballot's next-ranked choice
5. Repeat until majority reached or one option remains

**Triggers:** Manual resolve by group admin, or automatic resolution via scheduled job when `polls.deadline` passes.

**Server-side enforcement:** Both POST and PUT to `/polls/:id/vote` must reject with 400 if `poll.deadline < now()` or `poll.status != 'open'`.

### 5.2 Min-Transaction Settlement

1. For each user in the trip, compute: `total_paid - total_owed = net_balance`
2. Partition users into creditors (positive balance) and debtors (negative balance)
3. Sort creditors descending, debtors ascending (by absolute value)
4. Match largest debtor with largest creditor
5. Transfer `min(|debt|, credit)`, reduce both balances
6. Repeat until all net balances are zero

**Trigger:** Recalculate all settlements for the trip whenever an expense is created, updated, or deleted. Existing settlements with status `paid` or `confirmed` are preserved; only `pending` settlements are replaced.

### 5.3 Itinerary Conflict Detection

On itinerary item create or update (when both start_time and end_time are set):

1. Query items on the same trip and day_number where time ranges overlap: `existing.start_time < new.end_time AND existing.end_time > new.start_time`
2. Return conflicts as warnings in the API response (not blockers)
3. Mobile app displays conflict badge on overlapping items

### 5.4 Document Expiry Alerts

Daily scheduled job:

1. Query documents where `expires_at` is within 30 days from now and `expires_at IS NOT NULL`
2. Check alert thresholds: 30 days, 14 days, 7 days, 1 day before expiry
3. For each threshold crossed since last check, send push notification to document owner
4. Track last alert sent as `last_alert_days` integer in `documents.metadata` (e.g., `{"last_alert_days": 14}`) to prevent duplicates — only send when current threshold < last_alert_days

---

## 6. Mobile App

### 6.1 Navigation Structure

```
AuthStack
  ├── LoginScreen
  ├── SignupScreen
  └── MagicLinkConfirmScreen

MainTabs (bottom tab navigator)
  ├── TripsTab          → Trip list
  ├── ActivityTab       → Cross-trip activity feed
  └── ProfileTab        → Settings, account

TripStack (pushed from TripsTab)
  ├── TripDashboard     → Trip overview + presence indicators
  ├── Itinerary         → Drag-and-drop day planner
  ├── Polls             → Active + resolved polls
  ├── PollDetail        → Vote / view results
  ├── Expenses          → Expense list + balances summary
  ├── AddExpense        → Add expense with split picker
  ├── Settlements       → Who owes who + pay/confirm actions
  ├── Vault             → Document list
  ├── UploadDoc         → Camera / file picker
  ├── Members           → Group members + roles
  └── InviteFlow        → Share link / send email invite
```

### 6.2 State Management

| Layer | Tool | Purpose |
|-------|------|---------|
| Client state | Zustand | Auth state, active trip, UI state |
| Server state | React Query (@tanstack/react-query) | API data, caching, optimistic updates |
| Realtime | Supabase Realtime | Live subscriptions per trip, presence |

### 6.3 Key Libraries

| Library | Purpose |
|---------|---------|
| expo | Build and deploy toolchain |
| @supabase/supabase-js | Auth, DB, Realtime, Storage |
| @tanstack/react-query | Server state management |
| zustand | Client state |
| react-native-draggable-flatlist | Itinerary drag-and-drop (built on reanimated) |
| react-native-reanimated | Animations |
| react-native-gesture-handler | Touch gestures |
| expo-linking | Deep link handling (universal links / app links) |
| expo-document-picker | File uploads |
| expo-camera | Receipt / document photos |
| expo-notifications | Push notifications |

### 6.4 Deep Linking

Invite links use universal links (iOS) and app links (Android) that survive app installation:

- Format: `https://triibe.app/invite/{token}`
- If app installed: opens directly to invite redemption flow
- If app not installed: redirects to app store, token preserved via deferred deep link
- After signup via invite: auto-join trip + group with no extra step

### 6.5 Realtime Integration

On entering a trip screen:

1. Subscribe to Supabase Realtime channel `trip:{trip_id}` for DB changes
2. Join presence channel to broadcast current user's online status
3. React Query cache is invalidated/updated on realtime events for instant UI updates
4. On leaving trip screen: unsubscribe from channel

---

## 7. Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Mobile | React Native (Expo) |
| API Server | Node.js (Fastify) |
| Database | PostgreSQL (Supabase-hosted) |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime |
| File Storage | Supabase Storage |
| State (client) | Zustand |
| State (server) | React Query |
| Deep Links | expo-linking + universal/app links |

---

## 8. Design Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth provider | Supabase Auth (email, magic link, Google, Apple) | Built-in, no extra infra. Phone auth can be added later without restructuring. |
| Group/trip model | Hybrid — trip auto-creates persistent group | Avoids upfront "create group" friction. Groups persist for Phase 3 social features. |
| Expense splitting | Flexible splits + min-transaction settlement, single currency | Covers real group travel scenarios. Multi-currency deferred to Phase 2 with clean hooks. |
| Realtime model | Supabase Realtime (live updates, last-write-wins) + presence | Free with Supabase, covers collaborative-but-not-simultaneous planning. No CRDTs needed. |
| Invite flow | Deep links + email invites, no contacts/username search | Works cross-platform, no privacy-sensitive permissions. Growth features deferred. |
| Backend architecture | Monolith-first with DDD module boundaries | Fastest MVP path. Module boundaries enable future extraction if needed. |
| Sort order | float8 | Allows inserting between items (e.g., 1.5 between 1 and 2) without rebalancing. |
| Document sharing | Explicit share_scope column ('group','individual') | Unambiguous for RLS policies vs. relying on NULL semantics. |
