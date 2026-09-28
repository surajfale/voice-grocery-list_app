import 'dotenv/config';
import '../utils/dnsFix.js';
import { pathToFileURL } from 'url';
import mongoose from 'mongoose';
import User from '../models/User.js';
import GroceryList from '../models/GroceryList.js';
import Receipt from '../models/Receipt.js';

/**
 * Read-only account listing: every account, newest first, with how much each
 * one is actually used (grocery lists, list items, receipts).
 *
 * Usage (with the app's normal MONGODB_URI):
 *   pnpm --filter backend accounts:list          # table
 *   pnpm --filter backend accounts:list -- --json
 *
 * Never reads passwords, password hashes or reset tokens, and never writes:
 * only find/aggregate queries, and the connection disables Mongoose's
 * automatic index/collection creation.
 */

// The only user fields this tool reads. Password and reset-token fields are
// deliberately absent, so they never leave the database.
export const SAFE_USER_FIELDS = Object.freeze(['email', 'firstName', 'lastName', 'createdAt', 'lastLogin']);

const toCountMap = (rows) => new Map(rows.map((row) => [String(row._id), row]));

/**
 * @param {object} [models] - Injectable for tests
 * @returns {Promise<Array<{ email: string, name: string, signedUpAt: Date|null, lastLoginAt: Date|null, groceryLists: number, listItems: number, receipts: number }>>}
 */
export const listAccounts = async ({
  UserModel = User,
  GroceryListModel = GroceryList,
  ReceiptModel = Receipt
} = {}) => {
  const [users, listCounts, receiptCounts] = await Promise.all([
    UserModel.find({}).select(SAFE_USER_FIELDS.join(' ')).sort({ createdAt: -1 }).lean(),
    GroceryListModel.aggregate([
      { $group: { _id: '$userId', lists: { $sum: 1 }, items: { $sum: { $size: { $ifNull: ['$items', []] } } } } }
    ]),
    ReceiptModel.aggregate([{ $group: { _id: '$userId', receipts: { $sum: 1 } } }])
  ]);

  const lists = toCountMap(listCounts);
  const receipts = toCountMap(receiptCounts);

  // Build rows from named fields only, so nothing else could slip through
  return users.map((user) => {
    const id = String(user._id);
    return {
      email: user.email,
      name: [user.firstName, user.lastName].filter(Boolean).join(' '),
      signedUpAt: user.createdAt || null,
      lastLoginAt: user.lastLogin || null,
      groceryLists: lists.get(id)?.lists || 0,
      listItems: lists.get(id)?.items || 0,
      receipts: receipts.get(id)?.receipts || 0
    };
  });
};

const formatDate = (value) => (value ? new Date(value).toISOString().replace('T', ' ').slice(0, 16) : '—');

/**
 * Plain-text table for a terminal.
 * @param {Array} accounts - listAccounts() rows
 * @returns {string}
 */
export const formatAccountsTable = (accounts) => {
  if (!accounts.length) {
    return 'No accounts found.';
  }
  const header = ['Email', 'Name', 'Signed up (UTC)', 'Last login (UTC)', 'Lists', 'Items', 'Receipts'];
  const rows = accounts.map((a) => [
    a.email, a.name, formatDate(a.signedUpAt), formatDate(a.lastLoginAt),
    String(a.groceryLists), String(a.listItems), String(a.receipts)
  ]);
  const widths = header.map((title, column) => Math.max(title.length, ...rows.map((row) => row[column].length)));
  const line = (cells) => cells.map((cell, column) => cell.padEnd(widths[column])).join('  ');
  return [
    line(header),
    line(widths.map((width) => '-'.repeat(width))),
    ...rows.map(line),
    '',
    `${accounts.length} account(s)`
  ].join('\n');
};

const main = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set. Run this with the app\'s normal environment.');
  }
  const asJson = process.argv.slice(2).includes('--json');

  // Read-only: don't let Mongoose build indexes or create collections
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false, autoCreate: false });
  try {
    const accounts = await listAccounts();
    console.log(asJson ? JSON.stringify(accounts, null, 2) : formatAccountsTable(accounts));
  } finally {
    await mongoose.disconnect();
  }
};

const invokedDirectly = (() => {
  if (!process.argv[1]) {
    return false;
  }
  try {
    return import.meta.url === pathToFileURL(process.argv[1]).href;
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  main().catch((error) => {
    console.error('Listing accounts failed:', error.message || error);
    mongoose.disconnect().finally(() => {
      // eslint-disable-next-line no-process-exit -- CLI entrypoint: exit non-zero once the DB connection is closed
      process.exit(1);
    });
  });
}
