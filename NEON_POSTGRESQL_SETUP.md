# TrackWise Neon PostgreSQL Setup Guide

Neon is a serverless PostgreSQL platform with a generous free tier. This guide walks through setting up your TrackWise database on Neon.

## Prerequisites

- A Neon account (free at https://neon.tech)
- PostgreSQL client tools (`psql`) installed locally to run the schema
  - Download from: https://www.postgresql.org/download/windows/
  - Or via Chocolatey: `choco install postgresql16`

## Step 1: Create a Neon Project

1. Log in to [Neon Console](https://console.neon.tech)
2. Click **"New Project"**
3. Configure:
   - **Project name**: `trackwise-prod` (or your preference)
   - **Region**: Choose a region close to your Render deployment (e.g., `AWS US East (N. Virginia)` if Render is in Virginia)
   - **Compute size**: `0.5 CU` (free tier)
4. Click **"Create Project"**

Neon will provision your database in ~30 seconds. You'll see a connection string:

```
postgres://username:password@your-db-name.neon.tech/trackwise
```

## Step 2: Apply the TrackWise Schema

### Option A: Using the Automated Script (Recommended)

Run this PowerShell command in the project directory:

```powershell
.\deploy-database.ps1 -NeonConnectionString "postgres://username:password@your-db-name.neon.tech/trackwise" -LoadSampleData
```

The script will:
- ✓ Test the connection to Neon
- ✓ Apply all custom types and functions
- ✓ Create all tables (multi-tenant schema)
- ✓ Load sample data (if `-LoadSampleData` flag is used)

### Option B: Manual SQL Execution

1. Copy your Neon connection string from the Neon dashboard
2. Connect via `psql`:
   ```powershell
   psql "postgres://username:password@your-db-name.neon.tech/trackwise"
   ```
3. Run the schema files in order:
   ```sql
   \i database/types_and_functions.sql
   \i database/schema.sql
   ```
4. Optionally load sample data:
   ```sql
   \i database/sample_data.sql
   ```

### Option C: Using Neon SQL Editor (Web)

1. In Neon Console, go to **"SQL Editor"**
2. Open `database/schema.sql` in your editor
3. Copy all contents and paste into the SQL Editor
4. Click **"Run"**
5. Repeat for `types_and_functions.sql` first if needed
6. Run `sample_data.sql` for demo data

## Step 3: Verify the Schema

After applying the schema, verify the tables were created:

```powershell
psql "postgres://username:password@your-db-name.neon.tech/trackwise" -c "\dt"
```

You should see these tables:
- `businesses`
- `users`
- `categories`
- `inventory_items`
- `transactions`
- `pending_approvals`
- `history`
- `reports`

## Step 4: Configure Environment Variables

### For Backend (Render / Production Server)

Create or update `.env` (local) or set in Render dashboard:

```bash
# Production mode
NODE_ENV=production
PORT=3001

# Neon database URL (with SSL enabled)
DATABASE_URL=postgres://username:password@your-db-name.neon.tech/trackwise?sslmode=require

# JWT Secrets (generate secure values)
JWT_SECRET=<run: openssl rand -base64 64>
JWT_REFRESH_SECRET=<run: openssl rand -base64 64>

# Token expiry (optional)
JWT_EXPIRY=7d
JWT_REFRESH_EXPIRY=30d

# Allowed CORS origin (your frontend URL)
CORS_ORIGIN=https://your-frontend.onrender.com
```

### For Frontend (Vite Build)

Set in Render environment (or `.env.production` before building):

```bash
VITE_API_URL=https://your-backend.onrender.com/api
```

## Step 5: SSL Configuration

Neon requires SSL connections. The application is already configured with:

```typescript
ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined
```

This disables certificate verification because Neon's SSL certificate is valid, but some environments may require stricter SSL settings. If you encounter SSL errors, try adding `?sslmode=require` to your `DATABASE_URL`.

## Step 6: Rebuild and Deploy

```bash
# Build the production bundle
npm run build

# Start the server locally for testing
NODE_ENV=production DATABASE_URL="postgres://..." npm run server

# If working, commit and push to trigger Render deployment
git add .
git commit -m "Configure Neon PostgreSQL for production"
git push origin main
```

## Connection String Format

Your Neon connection string should look like:

```
postgres://apkaxoqmlqnxaocknfqk:password@aws-us-east-1.pooler.neon.tech/trackwise?sslmode=require
```

**Important components:**
- `username` = your Neon role/user name
- `password` = your Neon password
- `your-db-name.neon.tech` = your Neon host
- `trackwise` = database name (Neon creates this by default)
- `?sslmode=require` = forces SSL (recommended)

If `?sslmode=require` causes issues, remove it — the server already enables SSL programmatically.

## Troubleshooting

### Error: `password authentication failed for user "apkaxoqmlqnxaocknfqk"`
- Check the password in your connection string
- Reset the password in Neon dashboard if needed
- Neon passwords can contain special characters — ensure they're URL-encoded if issues arise

### Error: `SSL SYSCALL error: EOF detected`
- Neon connections may idle out. Solution: enable connection pooling or use Neon's connection string with `-pooler` in the hostname
- Neon provides a separate **pooler** connection string — use that for production

### Error: `timeout expired`
- Neon may be rate-limiting. Free tier has connection limits
- Consider using Neon's connection pooling (via pgBouncer)

### Local `psql` not found
- Add PostgreSQL to PATH: `C:\Program Files\PostgreSQL\16\bin`
- Or use full path: `"C:\Program Files\PostgreSQL\16\bin\psql.exe" "postgres://..."`

### `database/schema.sql` / `deploy-database.ps1` not found errors
- Ensure you're running commands from the project root directory
- Use `cd C:\Users\wisdo\Desktop\projects\trackwise-feature-specifications`

## Neon Features to Leverage

- **Branching**: Create preview branches for testing schema changes
- **Automatic Backups**: Included free, point-in-time recovery
- **Read Replicas**: Scale reads if needed (future enhancement)
- **Connection Pooler**: Enable pgBouncer in Neon settings for high-concurrency apps

## Cleanup

To delete the Neon database:
1. Go to Neon Console
2. Select your project
3. Settings → **Delete Project**

**Warning:** This permanently deletes all data.

## Need Help?

- Neon Docs: https://neon.tech/docs
- TrackWise Database Schema: `database/schema.sql`
- Multi-tenancy details: `database/README.md`
