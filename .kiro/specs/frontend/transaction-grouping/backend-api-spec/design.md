# Design Document: Backend API for Transaction Grouping

## Overview

This document defines the backend API design for transaction grouping, expense splitting, and saved members features. The API follows the existing Money Mind backend conventions: Express with TypeScript, MongoDB with Mongoose, JWT-based auth via `accessToken` header, and `{ output: <data> }` response shape.

## Architecture

```
Routes                              Controllers                              Services                              Models
──────                              ───────────                              ────────                              ──────
/transaction-groups/*  →  transaction-groups.controller.ts  →  transaction-groups.service.ts  →  transaction-group.model.ts
/members/*             →  members.controller.ts             →  members.service.ts             →  saved-member.model.ts
```

All routes are protected by the existing auth middleware that extracts `userId` from the `accessToken` header.

## Data Models

### TransactionGroup (`models/transaction-group.model.ts`)

```typescript
import mongoose, { Schema, model, Document, Types } from 'mongoose';

export interface IMember {
  _id: Types.ObjectId; // Reference to SavedMember
  name: string;
  share: number;
  paid: number;
  percentage: number;
}

export type SplitType =
  | 'EQUAL_INCLUDE_PAYER'
  | 'EQUAL_EXCLUDE_PAYER'
  | 'CUSTOM_AMOUNTS'
  | 'PERCENTAGE_SPLIT'
  | 'LOAN'
  | 'ITEMIZED';

export interface ITransactionGroupModel extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  clientId: string;
  name: string;
  involvedParty: string;
  members: IMember[];
  notes: string;
  transactionIds: string[];
  splitType: SplitType;
  splitConfig: Record<string, unknown> | null;
}

const transactionGroupSchema = new Schema<ITransactionGroupModel>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Client-generated UUID — used for offline sync matching
    clientId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    involvedParty: {
      type: String,
      default: '',
      trim: true,
    },
    members: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: 'SavedMember', required: true },
        name: { type: String, required: true, trim: true },
        share: { type: Number, default: 0, min: 0 },
        paid: { type: Number, default: 0, min: 0 },
        percentage: { type: Number, default: 0, min: 0, max: 100 },
      },
    ],
    notes: {
      type: String,
      default: '',
    },
    transactionIds: [
      {
        type: String,
      },
    ],
    splitType: {
      type: String,
      enum: [
        'EQUAL_INCLUDE_PAYER',
        'EQUAL_EXCLUDE_PAYER',
        'CUSTOM_AMOUNTS',
        'PERCENTAGE_SPLIT',
        'LOAN',
        'ITEMIZED',
      ],
      default: 'EQUAL_INCLUDE_PAYER',
    },
    splitConfig: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound index for user + clientId uniqueness
transactionGroupSchema.index({ userId: 1, clientId: 1 }, { unique: true });

const TransactionGroup = model<ITransactionGroupModel>('TransactionGroup', transactionGroupSchema);
export { TransactionGroup };
```

### SavedMember (`models/saved-member.model.ts`)

```typescript
import mongoose, { Schema, model, Document, Types } from 'mongoose';

export interface ISavedMemberModel extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
}

const savedMemberSchema = new Schema<ISavedMemberModel>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound index for unique member names per user (case-insensitive)
savedMemberSchema.index(
  { userId: 1, name: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

const SavedMember = model<ISavedMemberModel>('SavedMember', savedMemberSchema);
export { SavedMember };
```

## API Endpoints

### Transaction Groups

#### POST /transaction-groups/create

Creates a new transaction group.

**Request Body:**

```json
{
  "clientId": "uuid-from-frontend",
  "name": "Goa Trip",
  "involvedParty": "Alice, Bob, Charlie",
  "members": [
    { "_id": "saved_member_id_1", "name": "Alice", "share": 10000, "paid": 20000, "percentage": 0 },
    { "_id": "saved_member_id_2", "name": "Bob", "share": 10000, "paid": 7000, "percentage": 0 },
    { "_id": "saved_member_id_3", "name": "Charlie", "share": 10000, "paid": 3000, "percentage": 0 }
  ],
  "notes": "Trip expenses Dec 2025",
  "transactionIds": ["txn_abc123", "txn_def456"],
  "splitType": "CUSTOM_AMOUNTS",
  "splitConfig": null
}
```

**Response (201):**

```json
{
    "output": {
        "_id": "mongo_object_id",
        "clientId": "uuid-from-frontend",
        "userId": "user_object_id",
        "name": "Goa Trip",
        "involvedParty": "Alice, Bob, Charlie",
        "members": [...],
        "notes": "Trip expenses Dec 2025",
        "transactionIds": ["txn_abc123", "txn_def456"],
        "splitType": "CUSTOM_AMOUNTS",
        "splitConfig": null,
        "createdAt": "2025-12-15T10:00:00.000Z",
        "updatedAt": "2025-12-15T10:00:00.000Z"
    }
}
```

**Validation:**

- `name` required, non-empty
- `clientId` required, must be unique per user
- `members[].name` required, non-empty
- `members[]._id` required, must reference a valid SavedMember
- `members[].share` and `members[].paid` must be >= 0
- `splitType` must be one of the enum values

---

#### GET /transaction-groups/list

Returns all groups for the authenticated user.

**Response (200):**

```json
{
    "output": [
        {
            "_id": "...",
            "clientId": "...",
            "name": "Goa Trip",
            "involvedParty": "Alice, Bob, Charlie",
            "members": [...],
            "notes": "...",
            "transactionIds": [...],
            "splitType": "CUSTOM_AMOUNTS",
            "splitConfig": null,
            "createdAt": "...",
            "updatedAt": "..."
        }
    ]
}
```

---

#### GET /transaction-groups/:id

Returns a single group by MongoDB `_id` or `clientId`.

**Response (200):** Same shape as create response.

**Response (404):**

```json
{ "error": "NotFound", "message": "Group not found" }
```

---

#### PUT /transaction-groups/update/:id

Updates a group. Accepts partial updates.

**Request Body (partial):**

```json
{
  "name": "Goa Trip 2025",
  "members": [
    { "_id": "saved_member_id_1", "name": "Alice", "share": 10000, "paid": 20000 },
    { "_id": "saved_member_id_2", "name": "Bob", "share": 10000, "paid": 10000 }
  ]
}
```

**Response (200):** Returns the full updated group.

---

#### DELETE /transaction-groups/delete/:id

Deletes a group by `_id` or `clientId`.

**Response (200):**

```json
{ "output": { "message": "Group deleted successfully" } }
```

---

#### PUT /transaction-groups/:id/add-transactions

Appends transaction IDs to a group (deduplicates).

**Request Body:**

```json
{
  "transactionIds": ["txn_ghi789", "txn_jkl012"]
}
```

**Response (200):** Returns the full updated group.

---

#### PUT /transaction-groups/:id/remove-transaction

Removes a single transaction ID from a group.

**Request Body:**

```json
{
  "transactionId": "txn_abc123"
}
```

**Response (200):** Returns the full updated group.

---

#### PUT /transaction-groups/sync

Bulk upsert groups from offline storage.

**Request Body:**

```json
{
    "groups": [
        {
            "clientId": "uuid-1",
            "name": "Trip",
            "members": [...],
            "transactionIds": [...],
            "splitType": "EQUAL_INCLUDE_PAYER",
            "updatedAt": "2025-12-15T10:00:00.000Z"
        }
    ]
}
```

**Response (200):**

```json
{
    "output": {
        "synced": 3,
        "created": 1,
        "updated": 2,
        "groups": [...]
    }
}
```

**Conflict resolution:** Last-write-wins based on `updatedAt`. If the incoming `updatedAt` is newer than the server's, the server record is overwritten.

---

### Saved Members

#### POST /members/create

**Request Body:**

```json
{ "name": "Alice" }
```

**Response (201):**

```json
{
  "output": {
    "_id": "mongo_object_id",
    "name": "Alice",
    "createdAt": "2025-12-15T10:00:00.000Z"
  }
}
```

**Validation:**

- `name` required, non-empty, trimmed
- Duplicate names per user rejected (case-insensitive) → 400

---

#### GET /members/list

**Response (200):**

```json
{
  "output": [
    { "_id": "...", "name": "Alice", "createdAt": "..." },
    { "_id": "...", "name": "Bob", "createdAt": "..." }
  ]
}
```

Sorted by `name` ascending.

---

#### DELETE /members/delete/:id

**Response (200):**

```json
{ "output": { "message": "Member deleted successfully" } }
```

---

## Field Mapping: Frontend ↔ Backend

| Frontend (ITransactionGroup) | Backend (TransactionGroup) | Notes                                                              |
| ---------------------------- | -------------------------- | ------------------------------------------------------------------ |
| `id` (crypto.randomUUID)     | `clientId`                 | Client-generated UUID, used for sync matching                      |
| —                            | `_id`                      | Server-generated MongoDB ObjectId                                  |
| —                            | `userId`                   | Extracted from auth token, not sent by client                      |
| `name`                       | `name`                     | Required, non-empty                                                |
| `involvedParty`              | `involvedParty`            | Auto-generated from member names                                   |
| `members[]`                  | `members[]`                | Array of { \_id (ref SavedMember), name, share, paid, percentage } |
| `notes`                      | `notes`                    | Optional                                                           |
| `transactionIds[]`           | `transactionIds[]`         | Array of transaction `_id` strings                                 |
| `splitType`                  | `splitType`                | Enum string, optional                                              |
| `splitConfig`                | `splitConfig`              | Mixed/JSON, optional                                               |
| `createdAt`                  | `createdAt`                | ISO string, set by Mongoose timestamps                             |
| `updatedAt`                  | `updatedAt`                | ISO string, set by Mongoose timestamps                             |

| Frontend (IMember) | Backend (members[]) | Notes                                     |
| ------------------ | ------------------- | ----------------------------------------- |
| `_id`              | `_id`               | ObjectId ref to SavedMember, required     |
| `name`             | `name`              | Denormalized from SavedMember for display |
| `share`            | `share`             | Number >= 0                               |
| `paid`             | `paid`              | Number >= 0                               |
| `percentage`       | `percentage`        | Number 0-100, optional                    |

| Frontend (ISavedMember) | Backend (SavedMember) | Notes                              |
| ----------------------- | --------------------- | ---------------------------------- |
| `_id`                   | `_id`                 | MongoDB ObjectId                   |
| `name`                  | `name`                | Unique per user (case-insensitive) |
| `createdAt`             | `createdAt`           | ISO string                         |

## Frontend Integration Changes Needed

When the backend APIs are ready, the frontend needs these changes:

1. **Create `src/services/groupService.ts`** — API calls for group CRUD using axiosClient
2. **Create `src/services/memberService.ts`** — API calls for member CRUD using axiosClient
3. **Update `src/store/groupSlice.ts`** — Replace IndexedDB thunks with API thunks (or add sync logic)
4. **Create `src/store/memberSlice.ts`** — New slice with `fetchMembers`, `createMember`, `deleteMember` thunks
5. **Update `src/store/index.ts`** — Register `memberReducer`
6. **Update `src/components/GroupDialog.tsx`** — Accept `savedMembers` prop for autocomplete
7. **Update `src/pages/TransactionLogs.tsx`** — Fetch members on mount, pass to GroupDialog

The IndexedDB layer can remain as an offline cache with sync-on-demand, following the same pattern as `edited_transactions`.

## Error Handling

| Status | When                          | Response Shape                                 |
| ------ | ----------------------------- | ---------------------------------------------- |
| 201    | Resource created              | `{ output: <resource> }`                       |
| 200    | Success                       | `{ output: <data> }`                           |
| 400    | Validation error              | `{ error: "ValidationError", message: "..." }` |
| 401    | Missing/invalid token         | `{ error: "Unauthorized", message: "..." }`    |
| 404    | Resource not found            | `{ error: "NotFound", message: "..." }`        |
| 409    | Duplicate (e.g., member name) | `{ error: "Conflict", message: "..." }`        |
| 500    | Server error                  | `{ error: "InternalError", message: "..." }`   |
