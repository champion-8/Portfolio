# Quick Setup Instructions

## ✅ What's Been Created

Your Next.js project with Thai SEC fund management is ready! Here's what was set up:

### Project Structure
```
stocks3/
├── app/
│   ├── api/
│   │   ├── sync-funds/route.ts   ✅ API to sync funds from SEC
│   │   └── get-nav/route.ts      ✅ API to get fund NAV data
│   ├── layout.tsx
│   └── page.tsx                  ✅ UI for testing APIs
├── lib/
│   └── db/
│       ├── schema.ts             ✅ Database schema (3 tables)
│       └── index.ts              ✅ Database connection
├── drizzle.config.ts             ✅ Drizzle ORM config
├── .env.local                    ⚠️  Needs your Neon connection string
└── package.json                  ✅ With database scripts
```

### Database Tables Created
1. **amcs** - บลจ. (Asset Management Companies)
2. **funds** - กองทุนรวม (Mutual Funds) with latest NAV columns
3. **nav_history** - Daily NAV history

## 🚀 Next Steps

### 1. Set Up Neon Database (5 minutes)

1. Go to https://console.neon.tech
2. Sign up or log in
3. Click "Create Project"
4. Copy your connection string (looks like: `postgresql://user:password@ep-xxx.region.neon.tech/dbname?sslmode=require`)

### 2. Update Environment Variable

Open `.env.local` and replace with your connection string:

```env
DATABASE_URL=postgresql://user:password@ep-xxx.region.neon.tech/dbname?sslmode=require
```

### 3. Create Database Tables

```bash
npm run db:push
```

This will create all three tables in your Neon database.

### 4. Start the Development Server

```bash
npm run dev
```

Open http://localhost:3000

### 5. Test the APIs

1. **Click "Sync Funds"** - This will:
   - Fetch all AMCs from SEC
   - Fetch all funds under each AMC
   - Save to your database
   - Takes ~2-5 minutes depending on number of funds

2. **Click "Import Stocks"** - This will:
   - Allow you to select an Excel file (.xls or .xlsx)
   - Parse Thai listed companies data from the file
   - Save all companies to the stocks table
   - Display import statistics

3. **Enter a proj_id and click "Get NAV"** - This will:
   - Fetch NAV data for that specific fund
   - Save to nav_history table
   - Update the funds table with latest NAV and date

## 📋 Example Fund IDs to Test

After syncing, you can try these common Thai funds:
- `KFAFIX` - K-FIX
- `TMBGQG` - TMB Global Quality Growth
- `ONEAM-GLOBAL` - One Asset Management Global

## 🔧 Useful Commands

```bash
# View database in GUI
npm run db:studio

# Generate migration files
npm run db:generate

# Run linter
npm run lint
```

## 📚 API Documentation

### Sync All Funds
POST `/api/sync-funds`

### Get Fund NAV
POST `/api/get-nav`
```json
{
  "proj_id": "KFAFIX",
  "nav_date": "2024-03-15"  // optional, defaults to today
}
```

### Get NAV History
GET `/api/get-nav?proj_id=KFAFIX`

## ❓ Troubleshooting

**Database connection error?**
- Make sure your Neon connection string is correct in `.env.local`
- Check that the database exists in Neon console

**API returns 404?**
- Make sure you ran `npm run db:push` first
- Check that tables exist in your database (use `npm run db:studio`)

**Sync takes too long?**
- This is normal! There are many funds to sync
- The API includes delays to avoid rate limiting
- You can monitor progress in the terminal

## 🎉 You're All Set!

Your Thai SEC Fund Manager is ready to use. Happy coding! 🚀
