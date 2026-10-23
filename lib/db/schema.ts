import { pgTable, serial, varchar, text, integer, boolean, timestamp, unique, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Accounts table (Simplified - Admin or Team)
export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  accountType: varchar('account_type', { length: 16 }).notNull(),
  teamName: varchar('team_name', { length: 255 }),
  activeSessionId: varchar('active_session_id', { length: 128 }),
  activeSessionExpiresAt: timestamp('active_session_expires_at'),
  score: integer('score').default(0),
  lastSolveTime: timestamp('last_solve_time'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// A team is the scoring identity. Accounts may be individual participants;
// legacy `team` accounts are retained for backwards-compatible sign-in.
export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  ownerAccountId: integer('owner_account_id').references(() => accounts.id, { onDelete: 'set null' }),
  score: integer('score').notNull().default(0),
  lastSolveTime: timestamp('last_solve_time'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const teamMembers = pgTable('team_members', {
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  accountId: integer('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }).unique(),
  role: varchar('role', { length: 16 }).notNull().default('member'),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
}, (table) => ({
  teamAccount: unique().on(table.teamId, table.accountId),
}));

// Categories table
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  displayOrder: integer('display_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// Challenges table
export const challenges = pgTable('challenges', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  categoryId: integer('category_id').references(() => categories.id, { onDelete: 'cascade' }),
  points: integer('points').notNull(),
  flag: varchar('flag', { length: 500 }).notNull(),
  additionalFlags: text('additional_flags'), // NEW: Store as JSON array of alternative flags
  maxAttempts: integer('max_attempts'),
  isVisible: boolean('is_visible').default(true),
  author: varchar('author', { length: 255 }),
  displayOrder: integer('display_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Challenge attachments table
export const challengeAttachments = pgTable('challenge_attachments', {
  id: serial('id').primaryKey(),
  challengeId: integer('challenge_id').references(() => challenges.id, { onDelete: 'cascade' }),
  filename: varchar('filename', { length: 255 }).notNull(),
  fileUrl: varchar('file_url', { length: 500 }).notNull(),
  storageKey: varchar('storage_key', { length: 500 }),
  contentType: varchar('content_type', { length: 255 }),
  fileSize: integer('file_size'),
  uploadedAt: timestamp('uploaded_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Hints table
export const hints = pgTable('hints', {
  id: serial('id').primaryKey(),
  challengeId: integer('challenge_id').references(() => challenges.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  cost: integer('cost').default(0),
  displayOrder: integer('display_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// Hint unlocks table
export const hintUnlocks = pgTable('hint_unlocks', {
  id: serial('id').primaryKey(),
  hintId: integer('hint_id').references(() => hints.id, { onDelete: 'cascade' }),
  accountId: integer('account_id').references(() => accounts.id, { onDelete: 'cascade' }),
  teamName: varchar('team_name', { length: 255 }),
  teamId: integer('team_id').references(() => teams.id, { onDelete: 'set null' }),
  unlockedAt: timestamp('unlocked_at').defaultNow(),
}, (table) => ({
  uniqueAccountHint: unique().on(table.hintId, table.accountId),
}));

// Solves table
export const solves = pgTable('solves', {
  id: serial('id').primaryKey(),
  challengeId: integer('challenge_id').references(() => challenges.id, { onDelete: 'cascade' }),
  accountId: integer('account_id').references(() => accounts.id, { onDelete: 'cascade' }),
  // Snapshot the team identity at solve time for clear historical reporting.
  teamName: varchar('team_name', { length: 255 }),
  teamId: integer('team_id').references(() => teams.id, { onDelete: 'set null' }),
  solvedAt: timestamp('solved_at').defaultNow(),
}, (table) => ({
  uniqueAccountChallenge: unique().on(table.challengeId, table.accountId),
}));

// Submissions table
export const submissions = pgTable('submissions', {
  id: serial('id').primaryKey(),
  challengeId: integer('challenge_id').references(() => challenges.id, { onDelete: 'cascade' }),
  accountId: integer('account_id').references(() => accounts.id, { onDelete: 'cascade' }),
  // Snapshot the team identity at submission time; account_id remains canonical.
  teamName: varchar('team_name', { length: 255 }),
  teamId: integer('team_id').references(() => teams.id, { onDelete: 'set null' }),
  // SHA-256 digest of the submitted flag; plaintext submissions are never stored.
  submittedFlag: varchar('submitted_flag', { length: 500 }).notNull(),
  isCorrect: boolean('is_correct').notNull(),
  submittedAt: timestamp('submitted_at').defaultNow(),
});

// Competition config table
export const competitionConfig = pgTable('competition_config', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 255 }).notNull().unique(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Audit logs table
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id').references(() => accounts.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 255 }).notNull(),
  entityType: varchar('entity_type', { length: 100 }),
  entityId: integer('entity_id'),
  details: jsonb('details'),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const accountsRelations = relations(accounts, ({ many }) => ({
  solves: many(solves),
  submissions: many(submissions),
  hintUnlocks: many(hintUnlocks),
  auditLogs: many(auditLogs),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  challenges: many(challenges),
}));

export const challengesRelations = relations(challenges, ({ one, many }) => ({
  category: one(categories, {
    fields: [challenges.categoryId],
    references: [categories.id],
  }),
  attachments: many(challengeAttachments),
  hints: many(hints),
  solves: many(solves),
  submissions: many(submissions),
}));

export const hintsRelations = relations(hints, ({ one, many }) => ({
  challenge: one(challenges, {
    fields: [hints.challengeId],
    references: [challenges.id],
  }),
  unlocks: many(hintUnlocks),
}));

export const hintUnlocksRelations = relations(hintUnlocks, ({ one }) => ({
  hint: one(hints, {
    fields: [hintUnlocks.hintId],
    references: [hints.id],
  }),
  account: one(accounts, {
    fields: [hintUnlocks.accountId],
    references: [accounts.id],
  }),
}));

export const solvesRelations = relations(solves, ({ one }) => ({
  challenge: one(challenges, {
    fields: [solves.challengeId],
    references: [challenges.id],
  }),
  account: one(accounts, {
    fields: [solves.accountId],
    references: [accounts.id],
  }),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  challenge: one(challenges, {
    fields: [submissions.challengeId],
    references: [challenges.id],
  }),
  account: one(accounts, {
    fields: [submissions.accountId],
    references: [accounts.id],
  }),
}));
