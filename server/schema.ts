import { pgTable, text, timestamp, boolean, jsonb, integer } from 'drizzle-orm/pg-core';

export const appSetting = pgTable('app_setting', {
  key: text('key').primaryKey(),
  value: text('value'),
  encrypted: boolean('encrypted').notNull().default(false),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  role: text('role').notNull().default('user'),
  approved: boolean('approved').notNull().default(false),
  phone: text('phone'),
  businessName: text('business_name'),
  websiteUrl: text('website_url'),
  instagramHandle: text('instagram_handle'),
  gmbUrl: text('gmb_url'),
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

// Custom calculator metadata (files stored in S3)
export const customCalculator = pgTable('custom_calculator', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  slug: text('slug').notNull().unique(),
  s3Prefix: text('s3_prefix').notNull(),
  width: text('width').notNull().default('100%'),
  height: text('height').notNull().default('800px'),
  active: boolean('active').notNull().default(true),
  fileCount: integer('file_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
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
  userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
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
  emailSentAt: timestamp('email_sent_at'),
  emailError: text('email_error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Auditable consent log (DSGVO Art. 7 Abs. 1: Nachweisbarkeit der Einwilligung).
// Either userId (registrierte Nutzer) or leadId (anonyme Funnel-Leads) is set.
export const consent = pgTable('consent', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
  leadId: text('lead_id').references(() => lead.id, { onDelete: 'set null' }),
  type: text('type').notNull(), // 'privacy' | 'terms' | 'marketing'
  textVersion: text('text_version').notNull(),
  grantedAt: timestamp('granted_at').notNull().defaultNow(),
  withdrawnAt: timestamp('withdrawn_at'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Email opt-in / unsubscribe state, keyed by email so it covers both
// anonymous leads and registered users. doiToken confirms double opt-in,
// token is the stable unsubscribe handle embedded in every marketing mail.
export const emailSubscription = pgTable('email_subscription', {
  email: text('email').primaryKey(),
  token: text('token').notNull().unique(),
  doiToken: text('doi_token'),
  status: text('status').notNull().default('pending'), // 'pending' | 'confirmed' | 'unsubscribed'
  confirmedAt: timestamp('confirmed_at'),
  unsubscribedAt: timestamp('unsubscribed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
