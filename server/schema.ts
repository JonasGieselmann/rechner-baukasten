import { pgTable, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  role: text('role').notNull().default('user'), // 'super_admin' or 'user'
  approved: boolean('approved').notNull().default(false), // Must be approved by admin
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});

export const funnel = pgTable('funnel', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull().default(''),
  status: text('status').notNull().default('draft'),
  config: jsonb('config').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const lead = pgTable('lead', {
  id: text('id').primaryKey(),
  funnelId: text('funnel_id')
    .notNull()
    .references(() => funnel.id, { onDelete: 'cascade' }),
  name: text('name'),
  email: text('email'),
  phone: text('phone'),
  businessName: text('business_name'),
  websiteUrl: text('website_url'),
  instagramHandle: text('instagram_handle'),
  gmbUrl: text('gmb_url'),
  answers: jsonb('answers').notNull().default({}),
  scores: jsonb('scores').notNull().default({}),
  recommendation: text('recommendation'),
  kalkuPotential: jsonb('kalku_potential'),
  scrapeData: jsonb('scrape_data'),
  scrapeStatus: text('scrape_status').notNull().default('pending'),
  pdfUrl: text('pdf_url'),
  source: text('source'),
  status: text('status').notNull().default('new'),
  utm: jsonb('utm'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
