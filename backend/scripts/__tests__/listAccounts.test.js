import { describe, it, expect, vi } from 'vitest';
import { listAccounts, formatAccountsTable, SAFE_USER_FIELDS } from '../listAccounts.js';

const SENSITIVE = ['password', 'resetToken', 'resetTokenExpiry', 'resetTokenUsed', 'resetRequestIP', 'passwordResetCount'];

/**
 * Fake models expose only read methods; any write (save, update*, delete*,
 * create, insert*) would throw "is not a function".
 */
const buildModels = () => {
  const select = vi.fn();
  const sort = vi.fn();
  const users = [
    // Includes sensitive fields to prove the output mapping drops them too
    { _id: 'u2', email: 'new@example.com', firstName: 'New', lastName: 'Person', createdAt: new Date('2026-09-20T10:00:00Z'), lastLogin: new Date('2026-09-27T08:30:00Z'), password: '$2a$12$hash', resetToken: 'tok' },
    { _id: 'u1', email: 'owner@example.com', firstName: 'Own', lastName: 'Er', createdAt: new Date('2026-01-02T09:00:00Z'), lastLogin: null }
  ];
  const query = {
    select: (fields) => { select(fields); return query; },
    sort: (order) => { sort(order); return query; },
    lean: async () => users
  };
  const models = {
    UserModel: { find: vi.fn(() => query) },
    GroceryListModel: { aggregate: vi.fn(async () => [{ _id: 'u1', lists: 12, items: 87 }]) },
    ReceiptModel: { aggregate: vi.fn(async () => [{ _id: 'u1', receipts: 5 }, { _id: 'u2', receipts: 1 }]) }
  };
  return { models, select, sort };
};

describe('listAccounts', () => {
  it('reads only safe user fields', async () => {
    const { models, select } = buildModels();
    await listAccounts(models);
    const projection = select.mock.calls[0][0].split(' ');
    expect(projection.sort()).toEqual([...SAFE_USER_FIELDS].sort());
    SENSITIVE.forEach((field) => expect(projection).not.toContain(field));
  });

  it('never outputs sensitive fields, even if a document contains them', async () => {
    const { models } = buildModels();
    const accounts = await listAccounts(models);
    const output = JSON.stringify(accounts) + formatAccountsTable(accounts);
    expect(output).not.toContain('$2a$12$hash');
    expect(output).not.toContain('tok');
    accounts.forEach((account) => {
      expect(Object.keys(account).sort()).toEqual(['email', 'groceryLists', 'lastLoginAt', 'listItems', 'name', 'receipts', 'signedUpAt']);
    });
  });

  it('lists newest first with per-user usage counts', async () => {
    const { models, sort } = buildModels();
    const accounts = await listAccounts(models);
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(accounts).toEqual([
      { email: 'new@example.com', name: 'New Person', signedUpAt: new Date('2026-09-20T10:00:00Z'), lastLoginAt: new Date('2026-09-27T08:30:00Z'), groceryLists: 0, listItems: 0, receipts: 1 },
      { email: 'owner@example.com', name: 'Own Er', signedUpAt: new Date('2026-01-02T09:00:00Z'), lastLoginAt: null, groceryLists: 12, listItems: 87, receipts: 5 }
    ]);
  });

  it('only runs read queries', async () => {
    const { models } = buildModels();
    await listAccounts(models);
    expect(Object.keys(models.UserModel)).toEqual(['find']);
    expect(models.GroceryListModel.aggregate.mock.calls[0][0].every((stage) => Object.keys(stage)[0] === '$group')).toBe(true);
    expect(models.ReceiptModel.aggregate.mock.calls[0][0].every((stage) => Object.keys(stage)[0] === '$group')).toBe(true);
  });

  it('formats a readable table', async () => {
    const { models } = buildModels();
    const table = formatAccountsTable(await listAccounts(models));
    expect(table.split('\n')[0]).toMatch(/^Email\s+Name\s+Signed up \(UTC\)/);
    expect(table).toContain('owner@example.com');
    expect(table).toContain('2 account(s)');
    expect(formatAccountsTable([])).toBe('No accounts found.');
  });
});
