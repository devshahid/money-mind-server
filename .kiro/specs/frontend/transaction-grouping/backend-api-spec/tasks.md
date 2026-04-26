# Implementation Plan: Backend API for Transaction Grouping

## Overview

Implement the backend REST API for transaction groups, expense splitting, and saved members. Follows the existing Money Mind backend patterns: Express routes, controller classes, service classes, Mongoose models — all in TypeScript.

## Tasks

- [x] 1. Create Mongoose models
  - [x] 1.1 Create `models/transaction-group.model.ts`
    - Schema: userId (ObjectId, ref User, required, indexed), clientId (String, required, unique), name (String, required, trim), involvedParty (String, default ""), members (Array of { \_id (ObjectId, ref SavedMember), name, share, paid, percentage }), notes (String), transactionIds (Array of String), splitType (String, enum), splitConfig (Mixed)
    - Enable timestamps (createdAt, updatedAt)
    - Compound unique index on { userId, clientId }
    - _Requirements: 1.9, 1.10_

  - [x] 1.2 Create `models/saved-member.model.ts`
    - Schema: userId (ObjectId, ref User, required, indexed), name (String, required, trim)
    - Enable timestamps
    - Compound unique index on { userId, name } with case-insensitive collation
    - _Requirements: 3.6_

- [x] 2. Create route files
  - [x] 2.1 Create `routes/transaction-groups.route.ts`
    - POST `/create` → transactionGroupsController.create
    - GET `/list` → transactionGroupsController.list
    - GET `/:id` → transactionGroupsController.getById
    - PUT `/update/:id` → transactionGroupsController.update
    - DELETE `/delete/:id` → transactionGroupsController.delete
    - PUT `/:id/add-transactions` → transactionGroupsController.addTransactions
    - PUT `/:id/remove-transaction` → transactionGroupsController.removeTransaction
    - PUT `/sync` → transactionGroupsController.syncGroups
    - All routes protected by auth middleware
    - _Requirements: 1.1-1.6_

  - [x] 2.2 Create `routes/members.route.ts`
    - POST `/create` → membersController.createMember
    - GET `/list` → membersController.listMembers
    - DELETE `/delete/:id` → membersController.deleteMember
    - All routes protected by auth middleware
    - _Requirements: 3.1-3.3_

  - [x] 2.3 Register routes in `routes/index.ts`
    - Mount `/api/v1/transaction-groups` → transactionGroupsRoute
    - Mount `/api/v1/members` → membersRoute

- [x] 3. Implement group controller and service
  - [x] 3.1 `create` in `controllers/transaction-groups.controller.ts`, `createGroup` in `services/transaction-groups.service.ts` — Validate required fields, extract userId from token, create document, return with `{ output: group }`
    - Validate: name non-empty, clientId present, members[].\_id must reference valid SavedMember, members[].name non-empty, share/paid >= 0, splitType in enum
    - _Requirements: 1.1, 1.6, 1.7, 1.8, 1.9, 6.1_

  - [x] 3.2 `listGroups` — Find all groups where userId matches, sort by updatedAt desc
    - _Requirements: 1.2, 1.7_

  - [x] 3.3 `getGroup` — Find by \_id or clientId, verify userId ownership
    - _Requirements: 1.3, 1.7, 6.3_

  - [x] 3.4 `updateGroup` — Find by \_id or clientId, verify ownership, apply partial update, save
    - Validate same rules as create for any provided fields
    - Mongoose timestamps auto-update updatedAt
    - _Requirements: 1.4, 1.10, 2.1, 2.2, 2.3, 2.4_

  - [x] 3.5 `deleteGroup` — Find by \_id or clientId, verify ownership, delete
    - _Requirements: 1.5_

  - [x] 3.6 `addTransactions` — Find group, append transactionIds (deduplicate), save
    - _Requirements: 4.1, 4.3, 4.4_

  - [x] 3.7 `removeTransaction` — Find group, filter out transactionId, save
    - _Requirements: 4.2, 4.3, 4.4_

  - [x] 3.8 `syncGroups` — For each group in request: upsert by { userId, clientId }, last-write-wins on updatedAt, return full list
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 4. Implement member controller and service
  - [x] 4.1 `createMember` in `controllers/members.controller.ts`, service in `services/members.service.ts` — Validate name non-empty, check uniqueness (case-insensitive), create, return
    - _Requirements: 3.1, 3.4, 3.5, 3.6_

  - [x] 4.2 `listMembers` — Find all by userId, sort by name asc
    - _Requirements: 3.2_

  - [x] 4.3 `deleteMember` — Find by \_id, verify ownership, delete
    - _Requirements: 3.3, 3.7_

- [x] 5. Add validation middleware (optional)
  - [x] 5.1 Create reusable validation helpers for group and member payloads
    - Validate member array structure (each member must have \_id referencing SavedMember)
    - Validate splitType enum
    - Validate numeric fields (share, paid, percentage)
    - _Requirements: 6.1_

- [x] 6. Testing
  - [x] 6.1 Write integration tests for group CRUD endpoints
  - [x] 6.2 Write integration tests for member CRUD endpoints
  - [x] 6.3 Write tests for sync endpoint (create, update, conflict resolution)
  - [x] 6.4 Write tests for auth enforcement (401 without token)
  - [x] 6.5 Write tests for validation errors (400 responses)
  - [x] 6.6 Write tests for ownership enforcement (404 for other user's data)

## File Structure (Expected)

```
src/
├── models/
│   ├── transaction-group.model.ts    # Mongoose model + ITransactionGroupModel interface
│   └── saved-member.model.ts         # Mongoose model + ISavedMemberModel interface
├── controllers/
│   ├── transaction-groups.controller.ts  # Group CRUD + sync (extends ResponseHandler)
│   └── members.controller.ts             # Member CRUD (extends ResponseHandler)
├── services/
│   ├── transaction-groups.service.ts     # Group business logic
│   └── members.service.ts               # Member business logic
├── routes/
│   ├── transaction-groups.route.ts       # Group route definitions
│   ├── members.route.ts                  # Member route definitions
│   └── index.ts                          # Route aggregator (add new mounts here)
├── middlewares/
│   └── auth/
│       └── authHandler.ts                # Existing auth middleware
└── app.ts                                # Express app setup
```

## Notes

- The `clientId` field maps to the frontend's `id` (crypto.randomUUID). This allows offline-created groups to sync without ID conflicts.
- The `_id` (MongoDB ObjectId) is the server's primary key. The frontend should store both `_id` and `clientId` after sync.
- Members in groups reference `SavedMember` documents via `_id`. The `name` field is denormalized for display. Deleting a saved member does not cascade-remove it from existing groups.
- The sync endpoint uses last-write-wins. For a single-user app this is sufficient. Multi-device conflict resolution can be enhanced later.
