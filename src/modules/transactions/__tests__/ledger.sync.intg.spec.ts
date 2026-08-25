/// <reference types="jest" />

/**
 * Ledger Sync — real end-to-end integration tests.
 *
 * Unlike ledger.controller.intg.spec.ts (which mocks LedgerService), these
 * tests drive the FULL stack: the Express app, the auth middleware, the
 * asyncHandler transaction wrapper, and a real (in-memory replica-set) MongoDB.
 *
 * This is the path that shipped a production bug the previous test setup could
 * not catch:
 *   1. asyncHandler opens a multi-document transaction on every request, which
 *      only works on a replica set — the standalone memory server used before
 *      never exercised it.
 *   2. The sync endpoint read entries with an unscoped `find({})`, returning
 *      every user's entries. The cross-user isolation test below locks that in.
 */

import request from 'supertest';
import { Express } from 'express';
import { Types } from 'mongoose';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearDatabase,
} from '../../../__tests__/helpers/database.helper';
import { User } from '../../users/models/user.model';
import { UserLogin } from '../../users/models/user-logins.model';
import { Ledger, LedgerEntry } from '../models/ledger.model';
import jwtHandler from '../../../shared/core/jwtHandler';

const SYNC_URL = '/api/v1/ledgers/sync';

interface TestUser {
  userId: Types.ObjectId;
  token: string;
}

const createUser = async (email: string): Promise<TestUser> => {
  const user = await User.create({
    email,
    password: 'password123',
    fullName: 'Test User',
    role: 'USER',
  });
  const token = jwtHandler.createJwtToken({
    email: user.email,
    userId: user._id,
    userType: 'USER',
  });
  await UserLogin.create({ userId: user._id, email: user.email, accessToken: token });
  return { userId: user._id, token };
};

describe('Ledger Sync API (Integration)', () => {
  let app: Express;
  let user: TestUser;

  beforeAll(async () => {
    await connectTestDatabase();
    const appModule = await import('../../../app');
    app = appModule.default;
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
    user = await createUser('owner@example.com');
  });

  it('creates a locally-created ledger on the server through the transactional path', async () => {
    const now = new Date().toISOString();
    const clientId = 'ledger-client-1';

    const response = await request(app)
      .put(SYNC_URL)
      .set('accessToken', user.token)
      .send({
        ledgers: [{ clientId, partyName: 'Alice', createdAt: now, updatedAt: now }],
        entries: [],
        deletedLedgerIds: [],
        deletedEntryIds: [],
      })
      .expect(200);

    expect(response.body.status).toBe(true);
    expect(response.body.output.created).toBe(1);
    expect(response.body.output.ledgers).toHaveLength(1);
    expect(response.body.output.ledgers[0].partyName).toBe('Alice');

    // The write must have actually committed (transaction on a replica set).
    const persisted = await Ledger.findOne({ userId: user.userId, clientId });
    expect(persisted).not.toBeNull();
    expect(persisted?.partyName).toBe('Alice');
  });

  it('syncs a ledger and its entry, returning the entry in canonical state', async () => {
    const now = new Date().toISOString();
    const clientId = 'ledger-client-2';

    const response = await request(app)
      .put(SYNC_URL)
      .set('accessToken', user.token)
      .send({
        ledgers: [{ clientId, partyName: 'Bob', createdAt: now, updatedAt: now }],
        entries: [
          {
            id: 'entry-1',
            ledgerId: clientId,
            transactionId: 'tx-1',
            direction: 'i_paid',
            amount: 500,
            createdAt: now,
          },
        ],
        deletedLedgerIds: [],
        deletedEntryIds: [],
      })
      .expect(200);

    expect(response.body.output.entries).toHaveLength(1);
    expect(response.body.output.entries[0].transactionId).toBe('tx-1');
    expect(response.body.output.entries[0].amount).toBe(500);
  });

  it("does NOT leak another user's entries in the sync response (isolation)", async () => {
    const now = new Date().toISOString();

    // Another user with their own ledger + entry, created directly in the DB.
    const other = await createUser('intruder@example.com');
    await Ledger.create({
      userId: other.userId,
      clientId: 'other-ledger',
      partyName: 'Other Party',
      createdAt: now,
      updatedAt: now,
    });
    await LedgerEntry.create({
      id: 'other-entry',
      userId: other.userId,
      ledgerId: 'other-ledger',
      transactionId: 'other-tx',
      direction: 'they_paid',
      amount: 999,
      createdAt: now,
    });

    // Our user syncs only their own ledger + entry.
    const response = await request(app)
      .put(SYNC_URL)
      .set('accessToken', user.token)
      .send({
        ledgers: [{ clientId: 'my-ledger', partyName: 'Mine', createdAt: now, updatedAt: now }],
        entries: [
          {
            id: 'my-entry',
            ledgerId: 'my-ledger',
            transactionId: 'my-tx',
            direction: 'i_paid',
            amount: 100,
            createdAt: now,
          },
        ],
        deletedLedgerIds: [],
        deletedEntryIds: [],
      })
      .expect(200);

    const returnedEntryIds = response.body.output.entries.map((e: { id: string }) => e.id);
    const returnedLedgerClientIds = response.body.output.ledgers.map(
      (l: { clientId: string }) => l.clientId
    );

    expect(returnedEntryIds).toContain('my-entry');
    expect(returnedEntryIds).not.toContain('other-entry');
    expect(returnedLedgerClientIds).toContain('my-ledger');
    expect(returnedLedgerClientIds).not.toContain('other-ledger');

    // The other user's data must remain untouched in the DB.
    const otherStillThere = await LedgerEntry.findOne({ id: 'other-entry' });
    expect(otherStillThere).not.toBeNull();
  });

  it("does NOT let an attacker DELETE another user's entry via deletedEntryIds", async () => {
    const now = new Date().toISOString();

    // Victim (our `user`) owns a ledger + entry.
    await Ledger.create({
      userId: user.userId,
      clientId: 'victim-ledger',
      partyName: 'Victim',
      createdAt: now,
      updatedAt: now,
    });
    await LedgerEntry.create({
      id: 'victim-entry',
      userId: user.userId,
      ledgerId: 'victim-ledger',
      transactionId: 'victim-tx',
      direction: 'i_paid',
      amount: 250,
      createdAt: now,
    });

    // Attacker tries to delete the victim's entry by passing its id.
    const attacker = await createUser('attacker@example.com');
    const response = await request(app)
      .put(SYNC_URL)
      .set('accessToken', attacker.token)
      .send({
        ledgers: [],
        entries: [],
        deletedLedgerIds: [],
        deletedEntryIds: ['victim-entry'],
      })
      .expect(200);

    // Nothing should have been deleted for the attacker.
    expect(response.body.output.deleted).toBe(0);

    // The victim's entry must still exist and belong to the victim.
    const survivor = await LedgerEntry.findOne({ id: 'victim-entry' });
    expect(survivor).not.toBeNull();
    expect(survivor?.userId).toBe(user.userId.toString());
  });

  it("does NOT let an attacker OVERWRITE another user's entry via a colliding id", async () => {
    const past = new Date(Date.now() - 3_600_000).toISOString();
    const future = new Date(Date.now() + 3_600_000).toISOString();

    // Victim owns a ledger + entry with amount 250.
    await Ledger.create({
      userId: user.userId,
      clientId: 'victim-ledger-2',
      partyName: 'Victim',
      createdAt: past,
      updatedAt: past,
    });
    await LedgerEntry.create({
      id: 'shared-id',
      userId: user.userId,
      ledgerId: 'victim-ledger-2',
      transactionId: 'victim-tx-2',
      direction: 'i_paid',
      amount: 250,
      createdAt: past,
    });

    // Attacker syncs an entry that reuses the victim's entry id, with a newer
    // createdAt (which would win a last-write-wins overwrite) and a different
    // amount. It targets a ledger the attacker legitimately owns.
    //
    // The upsert lookup is scoped by userId, so the attacker never matches the
    // victim's row and cannot take the update (overwrite) branch. It falls to
    // the create branch, where the globally-unique `id` index rejects the
    // colliding id — so the write is refused rather than silently overwriting
    // the victim. Either way the victim's entry is guaranteed untouched, which
    // is the property under test; the request itself is rejected (non-200).
    const attacker = await createUser('attacker2@example.com');
    const response = await request(app)
      .put(SYNC_URL)
      .set('accessToken', attacker.token)
      .send({
        ledgers: [
          { clientId: 'attacker-ledger', partyName: 'Atk', createdAt: past, updatedAt: past },
        ],
        entries: [
          {
            id: 'shared-id',
            ledgerId: 'attacker-ledger',
            transactionId: 'attacker-tx',
            direction: 'they_paid',
            amount: 9999,
            createdAt: future,
          },
        ],
        deletedLedgerIds: [],
        deletedEntryIds: [],
      });

    // The colliding globally-unique id must not be accepted as an overwrite.
    expect(response.status).not.toBe(200);

    // The victim's entry must be completely untouched.
    const victimEntry = await LedgerEntry.findOne({ id: 'shared-id', userId: user.userId });
    expect(victimEntry).not.toBeNull();
    expect(victimEntry?.amount).toBe(250);
    expect(victimEntry?.direction).toBe('i_paid');
    expect(victimEntry?.ledgerId).toBe('victim-ledger-2');
  });

  it('rejects an unauthenticated sync request', async () => {
    await request(app)
      .put(SYNC_URL)
      .send({ ledgers: [], entries: [], deletedLedgerIds: [], deletedEntryIds: [] })
      .expect((res) => {
        expect(res.status).not.toBe(200);
      });
  });
});
