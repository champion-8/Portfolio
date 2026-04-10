# Thai Investment Dashboard

A comprehensive Next.js application for managing Thai investments including mutual funds, stocks, and cryptocurrencies.

## Features

- � User authentication with role-based access control (Admin/User)
- 👤 User profile management and password change
- 📊 Sync Thai mutual fund data from SEC API (Admin only)
- 💰 Fetch and store daily NAV (Net Asset Value) data
- 📈 Fetch real-time Thai stock prices from Yahoo Finance
- ₿ Fetch real-time cryptocurrency prices from Bitkub Exchange (Admin only)
- 🗄️ PostgreSQL database with Neon cloud
- ⚡ Built with Next.js 16 (App Router), TypeScript, and Tailwind CSS

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (Neon Serverless)
- **ORM**: Drizzle ORM
- **Stock Data**: Yahoo Finance API (yahoo-finance2)
- **Crypto Data**: Bitkub API
- **Linting**: ESLint

## Prerequisites

- Node.js 18+ and npm
- A Neon PostgreSQL database account ([Sign up here](https://neon.tech))

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set up Neon Database

1. Go to [Neon Console](https://console.neon.tech)
2. Create a new project
3. Copy your connection string

### 3. Configure Environment Variables

Update the `.env.local` file with your Neon connection string:

```env
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

### 4. Push Database Schema

Run the following command to create tables in your database:

```bash
npm run db:push
```

This will create six tables:
- `users` - User accounts with roles (ผู้ใช้งาน)
- `amcs` - Asset Management Companies (บลจ.)
- `funds` - Mutual Funds (กองทุนรวม)
- `nav_history` - Daily NAV history
- `stocks` - Thai Listed Companies (หุ้นไทย)
- `cryptos` - Cryptocurrencies from Bitkub

### 5. Create Admin User (Optional)

To create the first admin user, run:

```bash
npm run create-admin
```

This will create an admin account with:
- **Username**: `admin`
- **Password**: `admin123`
- **Email**: `admin@example.com`

**⚠️ IMPORTANT**: Change the password immediately after first login!

Alternatively, you can create a regular user account through the signup page and manually promote it to admin using SQL:

```sql
UPDATE users SET role = 'admin' WHERE username = 'yourusername';
```

Or use Drizzle Studio:
```bash
npm run db:studio
```

### 6. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Database Schema

### Users Table (ผู้ใช้งาน)
- `id` - Unique user ID (Primary Key)
- `username` - Username (Unique)
- `email` - Email address (Unique)
- `password_hash` - Hashed password
- `role` - User role ('admin' or 'user')
- `full_name` - Full name (optional)
- `created_at` - Account creation date
- `updated_at` - Last update date

### AMCs Table (บลจ.)
- `unique_id` - Unique identifier
- `name_th` - Thai name
- `name_en` - English name
- `last_upd_date` - Last update date

### Funds Table (กองทุน)
- `proj_id` - Project ID (Primary Key)
- `proj_name_th` - Thai fund name
- `proj_name_en` - English fund name
- `fund_status` - Fund status
- `amc_unique_id` - Reference to AMC
- `latest_nav_date` - Latest NAV date
- `latest_nav_value` - Latest NAV value
- `latest_net_asset` - Latest net asset value
- ... and more fields

### NAV History Table
- `id` - Composite key (proj_id + nav_date)
- `proj_id` - Reference to fund
- `nav_date` - NAV date
- `last_val` - NAV value
- `net_asset` - Net asset value
- `sell_price`, `buy_price` - Trading prices
- ... and more fields

### Stocks Table (หุ้นไทย)
- `symbol` - Stock symbol (Primary Key, e.g., "KBANK")
- `name_th` - Thai company name
- `market` - Market (SET or mai)
- `sector` - Business sector
- `industry` - Industry category
- `address` - Company address
- `postal_code`, `phone`, `fax`, `website` - Contact information
- `latest_price` - Latest stock price
- `latest_price_date` - Date of the latest price
- ... and more fields

### Cryptos Table (Cryptocurrency)
- `symbol` - Trading pair symbol (Primary Key, e.g., "THB_BTC")
- `base_symbol` - Base cryptocurrency (e.g., "BTC")
- `last` - Last traded price (THB)
- `highest_bid` - Highest bid price
- `lowest_ask` - Lowest ask price
- `percent_change` - 24h percentage change
- `base_volume` - 24h trading volume (crypto)
- `quote_volume` - 24h trading volume (THB)
- `high24hr`, `low24hr` - 24h high and low prices
- `last_updated` - Timestamp of last update

## API Routes

### Authentication Routes

#### 1. Sign Up - POST `/api/auth/signup`

Create a new user account (default role: 'user').

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "securepassword",
    "fullName": "John Doe"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Account created successfully",
  "user": {
    "id": "user_1234567890_abc123",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "user",
    "fullName": "John Doe"
  }
}
```

#### 2. Sign In - POST `/api/auth/signin`

Authenticate and create a session.

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "password": "securepassword"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Signed in successfully",
  "user": {
    "id": "user_1234567890_abc123",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "user",
    "fullName": "John Doe"
  }
}
```

#### 3. Sign Out - POST `/api/auth/signout`

End the current session.

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/signout
```

**Response:**
```json
{
  "success": true,
  "message": "Signed out successfully"
}
```

#### 4. Get Profile - GET `/api/auth/profile`

Get current user profile (requires authentication).

**Request:**
```bash
curl http://localhost:3000/api/auth/profile
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_1234567890_abc123",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "user",
    "fullName": "John Doe",
    "createdAt": "2024-03-15T10:30:00.000Z"
  }
}
```

#### 5. Update Profile - PATCH `/api/auth/profile`

Update user profile information (requires authentication).

**Request:**
```bash
curl -X PATCH http://localhost:3000/api/auth/profile \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newemail@example.com",
    "fullName": "John Smith"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "id": "user_1234567890_abc123",
    "username": "johndoe",
    "email": "newemail@example.com",
    "role": "user",
    "fullName": "John Smith"
  }
}
```

#### 6. Change Password - POST `/api/auth/change-password`

Change user password (requires authentication).

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "oldpassword",
    "newPassword": "newpassword123"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### Data Management Routes

#### 7. Sync Funds - POST `/api/sync-funds` (Admin Only)

Syncs all AMCs and their funds from SEC API to the database.

```bash
curl -X POST http://localhost:3000/api/sync-funds
```

**Response:**
```json
{
  "success": true,
  "message": "Funds synced successfully",
  "stats": {
    "amcs": 50,
    "funds": 1250
  }
}
```

#### 8. Import Stocks - POST `/api/import-stocks`

Imports Thai listed companies from uploaded Excel file to the database.

**Request:**
```bash
curl -X POST http://localhost:3000/api/import-stocks \
  -F "file=@/path/to/listedCompanies_th_TH.xls"
```

**Parameters:**
- `file` (multipart/form-data) - Excel file (.xls or .xlsx) containing company data

**Response:**
```json
{
  "success": true,
  "message": "Stock data imported successfully",
  "stats": {
    "total": 850,
    "inserted": 850,
    "errors": 0
  }
}
```

#### 9. Get Stock Price - POST `/api/get-stock-price`

Fetches real-time stock price from Yahoo Finance for a specific Thai stock and updates the database.

**Request:**
```bash
curl -X POST http://localhost:3000/api/get-stock-price \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "KBANK"
  }'
```

**Parameters:**
- `symbol` (required) - Stock symbol (e.g., "KBANK", "PTT", "AOT")

**Response:**
```json
{
  "success": true,
  "message": "Stock price updated successfully",
  "data": {
    "symbol": "KBANK",
    "price": 145.50,
    "priceDate": "2024-03-15T10:30:00.000Z",
    "currency": "THB",
    "previousClose": 144.00,
    "change": 1.50,
    "changePercent": 1.04
  }
}
```

**Note:** The API automatically appends `.BK` suffix for Yahoo Finance (e.g., KBANK becomes KBANK.BK)

#### 10. Sync All Stock Prices - POST `/api/sync-stock-prices` (Admin Only)

Fetches real-time prices for all stocks from Yahoo Finance and updates the database.

**Request:**
```bash
curl -X POST http://localhost:3000/api/sync-stock-prices \
  -H "Content-Type: application/json" \
  -d '{
    "limit": 10
  }'
```

**Parameters:**
- `limit` (optional) - Limit number of stocks to process (useful for testing). Omit to process all stocks.

**Response:**
```json
{
  "success": true,
  "message": "Stock prices sync completed",
  "stats": {
    "total": 850,
    "success": 830,
    "failed": 20
  },
  "errors": [
    {
      "symbol": "XYZ",
      "error": "No price data available"
    }
  ]
}
```

#### 11. Sync Crypto Prices - POST `/api/sync-crypto-prices` (Admin Only)

Fetches real-time cryptocurrency prices from Bitkub Exchange (THB pairs) and updates the database.

**Request:**
```bash
curl -X POST http://localhost:3000/api/sync-crypto-prices
```

**Response:**
```json
{
  "success": true,
  "message": "Crypto prices synced successfully",
  "stats": {
    "total": 150,
    "inserted": 150,
    "errors": 0
  }
}
```

**Get All Crypto Prices:**
```bash
curl http://localhost:3000/api/sync-crypto-prices
```

**Response:**
```json
{
  "success": true,
  "count": 150,
  "data": [
    {
      "symbol": "THB_BTC",
      "baseSymbol": "BTC",
      "last": 2580000,
      "percentChange": 1.25,
      "high24hr": 2590000,
      "low24hr": 2550000,
      "baseVolume": 12.5,
      "quoteVolume": 32250000
    }
  ]
}
```

#### 12. Sync All NAV - POST `/api/sync-all-nav` (Admin Only)

Fetches NAV data for all active funds from the database and saves to the database.

**Request:**
```bash
curl -X POST http://localhost:3000/api/sync-all-nav \
  -H "Content-Type: application/json" \
  -d '{
    "nav_date": "2024-03-15",
    "limit": 10
  }'
```

**Parameters:**
- `nav_date` (optional) - Date to fetch NAV for (YYYY-MM-DD format). Defaults to today.
- `limit` (optional) - Limit number of funds to process (useful for testing). Omit to process all active funds.

**Response:**
```json
{
  "success": true,
  "message": "NAV sync completed",
  "stats": {
    "total": 1250,
    "success": 1200,
    "failed": 50
  },
  "nav_date": "2024-03-15",
  "errors": [
    {
      "proj_id": "FUND123",
      "error": "HTTP 404: Not Found"
    }
  ]
}
```

#### 13. Get NAV - POST `/api/get-nav`

Fetches NAV data for a specific fund and saves it to the database.

**Request:**
```bash
curl -X POST http://localhost:3000/api/get-nav \
  -H "Content-Type: application/json" \
  -d '{
    "proj_id": "KFAFIX",
    "nav_date": "2024-03-15"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "NAV data saved successfully",
  "data": {
    "proj_id": "KFAFIX",
    "nav_date": "2024-03-15",
    "last_val": 10.5678,
    "net_asset": 1234567890
  }
}
```

#### 14. Get NAV History - GET `/api/get-nav?proj_id={proj_id}`

Retrieves NAV history for a fund (last 30 days).

```bash
curl http://localhost:3000/api/get-nav?proj_id=KFAFIX
```

#### 15. Get Crypto Symbols - GET `/api/crypto-symbols`

Fetches all available cryptocurrency trading pairs from Bitkub Exchange with full symbol information.

**Request:**
```bash
curl http://localhost:3000/api/crypto-symbols
```

**Response:**
```json
{
  "success": true,
  "count": 150,
  "data": [
    {
      "id": 1,
      "symbol": "THB_BTC",
      "baseSymbol": "BTC",
      "name": "Bitcoin"
    },
    {
      "id": 2,
      "symbol": "THB_ETH",
      "baseSymbol": "ETH",
      "name": "Ethereum"
    }
  ]
}
```

## Usage Guide

### Authentication

1. **Create Account**:
   - Visit [http://localhost:3000/signin](http://localhost:3000/signin)
   - Click "ยังไม่มีบัญชี? สร้างบัญชี" (Don't have an account? Sign up)
   - Fill in username, email, password, and optionally full name
   - New accounts are created with 'user' role by default
   - **Note**: To create an admin account, you'll need to manually update the role in the database

2. **Sign In**:
   - Visit [http://localhost:3000/signin](http://localhost:3000/signin)
   - Enter your username and password
   - Click "เข้าสู่ระบบ" (Sign In)

3. **Manage Profile**:
   - Click "โปรไฟล์" (Profile) in the top right corner
   - Update your email or full name
   - Change your password using the password change form
   - Sign out using the "ออกจากระบบ" (Sign Out) button

### Role-Based Access

- **Admin Users** (👑):
  - Can access all sync features (Sync Funds, Sync All Stock Prices, Sync Crypto Prices, Sync All NAV)
  - Can import stocks and fetch individual stock prices
  - Can fetch NAV for individual funds
  - Indicated by a crown icon (👑) in the dashboard

- **Regular Users** (👤):
  - Can import stocks and view stock data
  - Can fetch individual stock prices
  - Can fetch NAV for individual funds
  - **Cannot** access bulk sync operations (these are admin-only)

### Data Operations

1. **First Time Setup** (Admin Only):
   - Click "Sync Funds" to import all Thai funds from SEC
   - This will take a few minutes as it fetches data from all AMCs
   - Click "Import Stocks":
     - Select your Excel file (.xls or .xlsx) with Thai listed companies
     - Click "Import Stocks" button to upload and import the data

2. **Fetch Stock Prices**:
   - Click "Get Stock Price" to fetch a single stock price (e.g., KBANK)
   - (Admin) Click "Sync All Stock Prices" to fetch prices for all stocks from Yahoo Finance
   - Optionally set a limit (e.g., 10) for testing before running on all stocks
   - Prices are updated in the database with timestamp

3. **Fetch Crypto Prices** (Admin Only):
   - Click "Sync Crypto Prices" to fetch all cryptocurrency prices from Bitkub Exchange
   - All THB trading pairs (e.g., THB_BTC, THB_ETH) are automatically synced
   - Includes price, volume, 24h high/low, and percentage change

4. **Sync NAV for All Funds** (Admin Only):
   - Click "Sync All NAV" to fetch NAV for all active funds
   - Optionally set a limit (e.g., 10) for testing before running on all funds
   - This may take a while depending on the number of funds

5. **Fetch NAV Data for Single Fund**:
   - Enter a `proj_id` (e.g., "KFAFIX")
   - Optionally specify a date (defaults to today)
   - Click "Get NAV" to fetch and save NAV data

6. **Latest Data in Database**:
   - Stock prices are automatically updated in the `stocks` table with `latest_price` and `latest_price_date`
   - Crypto prices are stored in the `cryptos` table with real-time data from Bitkub
   - Fund NAV is automatically updated in the `funds` table with:
     - `latest_nav_date` - Date of the NAV
     - `latest_nav_value` - The NAV value
     - `latest_net_asset` - Net asset value

### Creating an Admin User

**Quick Method** - Use the create-admin script:
```bash
npm run create-admin
```

This creates an admin user with username `admin` and password `admin123`.

**Manual Method** - Promote an existing user to admin:

```sql
UPDATE users SET role = 'admin' WHERE username = 'yourusername';
```

Or use Drizzle Studio:
```bash
npm run db:studio
```
Then navigate to the `users` table and change the `role` field from 'user' to 'admin'.

## Database Commands

```bash
# Generate migration files
npm run db:generate

# Apply migrations
npm run db:migrate

# Push schema directly (for development)
npm run db:push

# Open Drizzle Studio (database GUI)
npm run db:studio
```

## SEC API Endpoints Used

1. **List AMCs**: `https://api.sec.or.th/FundFactsheet/fund/amc`
2. **Funds by AMC**: `https://api.sec.or.th/FundFactsheet/fund/amc/{unique_id}`
3. **Daily NAV**: `https://api.sec.or.th/FundDailyInfo/{proj_id}/dailynav/{nav_date}`

## Bitkub API Endpoints Used

1. **Market Ticker**: `https://api.bitkub.com/api/market/ticker` - Real-time cryptocurrency prices for all THB trading pairs
2. **Market Symbols**: `https://api.bitkub.com/api/market/symbols` - List of all available trading pairs with full cryptocurrency names

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run ESLint
npm run lint
```

## Project Structure

```
stocks3/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── signin/
│   │   │   │   └── route.ts      # Sign in API
│   │   │   ├── signout/
│   │   │   │   └── route.ts      # Sign out API
│   │   │   ├── signup/
│   │   │   │   └── route.ts      # Sign up API
│   │   │   ├── profile/
│   │   │   │   └── route.ts      # Get/update profile API
│   │   │   └── change-password/
│   │   │       └── route.ts      # Change password API
│   │   ├── sync-funds/
│   │   │   └── route.ts          # Sync funds from SEC API (Admin)
│   │   ├── get-nav/
│   │   │   └── route.ts          # Get NAV for a fund
│   │   ├── sync-all-nav/
│   │   │   └── route.ts          # Sync all funds NAV (Admin)
│   │   ├── import-stocks/
│   │   │   └── route.ts          # Import stocks from Excel
│   │   ├── get-stock-price/
│   │   │   └── route.ts          # Get single stock price
│   │   ├── sync-stock-prices/
│   │   │   └── route.ts          # Sync all stock prices (Admin)
│   │   ├── sync-crypto-prices/
│   │   │   └── route.ts          # Sync crypto prices (Admin)
│   │   └── crypto-symbols/
│   │       └── route.ts          # Get crypto symbol information
│   ├── signin/
│   │   └── page.tsx              # Sign in/Sign up page
│   ├── profile/
│   │   └── page.tsx              # User profile page
│   ├── layout.tsx
│   └── page.tsx                  # Main dashboard (role-aware)
├── lib/
│   ├── auth.ts                   # Authentication utilities
│   └── db/
│       ├── schema.ts             # Database schema (6 tables)
│       └── index.ts              # Database connection
├── drizzle.config.ts             # Drizzle configuration
├── .env.local                    # Environment variables
└── package.json
```

## Notes

- **Authentication**: Sessions are stored in HTTP-only cookies for security
- **Password Hashing**: Passwords are hashed using SHA-256 (for production, consider using bcrypt)
- **Role-Based Access**: Admin users have access to all sync operations; regular users can only view and fetch individual data
- **Default Role**: New signups automatically get 'user' role; promote to 'admin' via database update
- The sync operation includes a small delay between AMC requests to avoid rate limiting
- NAV data is stored in both the `nav_history` table (historical data) and the `funds` table (latest value)
- Date format for API requests: `YYYY-MM-DD`
- All dates are stored as timestamps in the database

## License

MIT

