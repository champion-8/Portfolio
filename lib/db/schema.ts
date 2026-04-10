import { pgTable, text, timestamp, doublePrecision, varchar } from 'drizzle-orm/pg-core';

// Asset Management Companies (บลจ.)
export const amcs = pgTable('amcs', {
  uniqueId: varchar('unique_id', { length: 255 }).primaryKey(),
  nameTh: text('name_th').notNull(),
  nameEn: text('name_en'),
  lastUpdDate: timestamp('last_upd_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Funds (กองทุน)
export const funds = pgTable('funds', {
  projId: varchar('proj_id', { length: 255 }).primaryKey(),
  regisId: varchar('regis_id', { length: 255 }),
  regisDate: timestamp('regis_date'),
  cancelDate: timestamp('cancel_date'),
  projNameTh: text('proj_name_th').notNull(),
  projNameEn: text('proj_name_en'),
  projAbbrName: varchar('proj_abbr_name', { length: 255 }),
  fundStatus: varchar('fund_status', { length: 100 }),
  amcUniqueId: varchar('amc_unique_id', { length: 255 }).references(() => amcs.uniqueId),
  permitUsInvestment: varchar('permit_us_investment', { length: 10 }),
  investCountryFlag: text('invest_country_flag'),
  lastUpdDate: timestamp('last_upd_date'),
  
  // Latest NAV data
  latestNavDate: timestamp('latest_nav_date'),
  latestNavValue: doublePrecision('latest_nav_value'),
  latestNetAsset: doublePrecision('latest_net_asset'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Daily NAV History
export const navHistory = pgTable('nav_history', {
  id: varchar('id', { length: 500 }).primaryKey(), // combination of proj_id and nav_date
  projId: varchar('proj_id', { length: 255 }).notNull().references(() => funds.projId),
  navDate: timestamp('nav_date').notNull(),
  classAbbrName: varchar('class_abbr_name', { length: 255 }),
  netAsset: doublePrecision('net_asset'),
  lastVal: doublePrecision('last_val'),
  previousVal: doublePrecision('previous_val'),
  
  // AMC Info (storing first entry if multiple)
  sellPrice: doublePrecision('sell_price'),
  buyPrice: doublePrecision('buy_price'),
  sellSwapPrice: doublePrecision('sell_swap_price'),
  buySwapPrice: doublePrecision('buy_swap_price'),
  remarkTh: text('remark_th'),
  remarkEn: text('remark_en'),
  
  lastUpdDate: timestamp('last_upd_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Amc = typeof amcs.$inferSelect;
export type Fund = typeof funds.$inferSelect;
export type NavHistory = typeof navHistory.$inferSelect;

// Thai Listed Companies (หุ้นไทย)
export const stocks = pgTable('stocks', {
  symbol: varchar('symbol', { length: 50 }).primaryKey(),
  nameTh: text('name_th').notNull(),
  market: varchar('market', { length: 10 }), // SET or mai
  sector: text('sector'), // ประเภทธุรกิจ
  industry: text('industry'), // หมวดอุตสาหกรรม
  address: text('address'),
  postalCode: varchar('postal_code', { length: 10 }),
  phone: varchar('phone', { length: 50 }),
  fax: varchar('fax', { length: 50 }),
  website: text('website'),
  
  // Latest price data
  latestPrice: doublePrecision('latest_price'),
  latestPriceDate: timestamp('latest_price_date'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Stock = typeof stocks.$inferSelect;

// Cryptocurrencies
export const cryptos = pgTable('cryptos', {
  symbol: varchar('symbol', { length: 50 }).primaryKey(), // e.g., THB_BTC
  baseSymbol: varchar('base_symbol', { length: 20 }), // e.g., BTC
  name: text('name'), // Full name, e.g., "Bitcoin"
  id: varchar('id', { length: 20 }),
  
  // Latest price data
  last: doublePrecision('last'),
  lowestAsk: doublePrecision('lowest_ask'),
  highestBid: doublePrecision('highest_bid'),
  percentChange: doublePrecision('percent_change'),
  baseVolume: doublePrecision('base_volume'),
  quoteVolume: doublePrecision('quote_volume'),
  high24hr: doublePrecision('high24hr'),
  low24hr: doublePrecision('low24hr'),
  change: doublePrecision('change'),
  isFrozen: varchar('is_frozen', { length: 10 }),
  
  lastUpdated: timestamp('last_updated'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Crypto = typeof cryptos.$inferSelect;

// Users (ผู้ใช้งาน)
export const users = pgTable('users', {
  id: varchar('id', { length: 255 }).primaryKey(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('user'), // 'admin' or 'user'
  fullName: text('full_name'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// User Portfolio (พอร์ตการลงทุนของผู้ใช้)
export const userPortfolio = pgTable('user_portfolio', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  assetType: varchar('asset_type', { length: 20 }).notNull(), // 'fund', 'stock', 'crypto'
  assetId: varchar('asset_id', { length: 255 }).notNull(), // projId for funds, symbol for stocks/cryptos
  assetName: text('asset_name').notNull(), // ชื่อสินทรัพย์
  
  quantity: doublePrecision('quantity').notNull(), // จำนวนหน่วยที่ถือ
  avgBuyPrice: doublePrecision('avg_buy_price').notNull(), // ราคาทุนเฉลี่ย
  totalCost: doublePrecision('total_cost').notNull(), // มูลค่าทุนรวม
  
  notes: text('notes'), // หมายเหตุ
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type UserPortfolio = typeof userPortfolio.$inferSelect;
export type NewUserPortfolio = typeof userPortfolio.$inferInsert;
