# TrackWise Vercel Deployment Guide

## Prerequisites

- [x] GitHub account with repository pushed
- [x] Vercel account (https://vercel.com)
- [x] PostgreSQL database (Azure or other managed service)
- [x] Production secrets generated (JWT_SECRET, JWT_REFRESH_SECRET)

## Step 1: Prepare Production Secrets

Generate strong secrets for production (don't use development placeholders).

```bash
# Generate JWT_SECRET (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate JWT_REFRESH_SECRET (32+ characters)  
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Save these values securely - you'll need them in Vercel dashboard.

## Step 2: Set Up PostgreSQL Database

### Option A: Azure Database for PostgreSQL (Recommended - Already have Bicep infrastructure)

```bash
# Using the existing Bicep template
az group create --name trackwise-prod --location eastus

az deployment group create \
  --name trackwise-db \
  --resource-group trackwise-prod \
  --template-file infrastructure/postgresql.bicep \
  --parameters infrastructure/postgresql.parameters.json

# Get connection string
az postgres flexible-server show-connection-string \
  --server-name <your-server-name> \
  --admin-user trackwise_admin
```

### Option B: Managed PostgreSQL Service (Railway, Supabase, etc.)

Use their provided connection string.

## Step 3: Test Build Locally

**Important**: Verify your app builds and runs correctly before deploying.

```bash
# Clean install
rm -r node_modules dist
npm install

# Build both frontend and backend
npm run build

# Test production start
npm start

# Should output:
# TrackWise API server running on port 3001
# Health check: http://localhost:3001/health

# In another terminal, test health endpoint
curl http://localhost:3001/health
# Should return: {"status":"healthy","timestamp":"...","uptime":...}
```

**If build fails**: Fix errors before proceeding to Vercel.

## Step 4: Create Vercel Project

### 4.1 Link GitHub Repository

1. Go to https://vercel.com/dashboard
2. Click "New Project"
3. Select "Import Git Repository"
4. Choose `Wyzdmulc265/trackwise-app`
5. Click "Import"

### 4.2 Configure Project Settings

- **Project Name**: `trackwise` (or your preference)
- **Framework Preset**: Select "Other" (Vite + Node.js backend)
- **Root Directory**: `.` (default)
- **Build Command**: `npm run build` (should auto-detect)
- **Output Directory**: `dist` (should auto-detect from vite.config.ts)
- **Install Command**: `npm install` (default)

### 4.3 Add Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

```
NODE_ENV = production

JWT_SECRET = [generated-secret-from-step-1]

JWT_REFRESH_SECRET = [generated-secret-from-step-1]

DATABASE_URL = postgresql://user:password@host:port/database
  Example: postgresql://trackwise_admin:secure_pass@myserver.postgres.database.azure.com:5432/trackwise

CORS_ORIGIN = https://trackwise-production.vercel.app
  (Replace with your actual Vercel domain or custom domain)

JWT_EXPIRY = 15

JWT_REFRESH_EXPIRY = 10080

VITE_API_URL = https://trackwise-production.vercel.app/api
  (Must match your deployment URL)

PORT = 3001
```

**⚠️ IMPORTANT**: 
- Use **only 1 origin** if not using custom domain
- Format: `https://your-app.vercel.app` (no trailing slash)
- Update `CORS_ORIGIN` and `VITE_API_URL` after first deployment when you know your Vercel URL

## Step 5: Database Initialization

After first deployment, initialize the production database:

### 5.1 From Your Local Machine

```bash
# Test connection
psql $DATABASE_URL < database/schema.sql

# Optional: Add sample data
psql $DATABASE_URL < database/sample_data.sql

# Verify schema
psql $DATABASE_URL < database/verify_setup.sql
```

### 5.2 OR From a Vercel Function (Automated)

Create `api/seed.ts`:

```typescript
import { query } from '../server/db/client.js';
import fs from 'fs';
import path from 'path';

export default async (req, res) => {
  if (process.env.NODE_ENV !== 'production') {
    return res.status(403).json({ error: 'Only for production' });
  }

  if (req.headers.authorization !== `Bearer ${process.env.SEED_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const schema = fs.readFileSync(
      path.join(process.cwd(), 'database', 'schema.sql'),
      'utf-8'
    );
    
    await query(schema);
    
    return res.json({ success: true, message: 'Database initialized' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
```

## Step 6: Deploy to Vercel

### 6.1 Deploy from Dashboard

1. Click "Deploy" button in Vercel dashboard
2. Wait for build to complete (usually 2-5 minutes)
3. Check deployment logs for errors

### 6.2 OR Deploy from CLI

```bash
npm install -g vercel

vercel --prod
```

## Step 7: Verify Production Deployment

```bash
# Health check
curl https://trackwise-production.vercel.app/health

# Test login (should work if DB initialized)
curl -X POST https://trackwise-production.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123"}'

# Check logs in Vercel dashboard
# Settings → Functions → View logs
```

## Step 8: Configure Custom Domain (Optional)

1. Vercel Dashboard → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update `CORS_ORIGIN` and `VITE_API_URL` to your custom domain

## Troubleshooting

### Build Fails on Vercel

Check build logs in Vercel dashboard. Common issues:

```
Error: Cannot find module 'server/index.ts'
→ Fix: Ensure build command includes: npm run build

Error: DATABASE_URL not set
→ Fix: Add DATABASE_URL to environment variables in Vercel dashboard
```

### Application Errors After Deploy

```bash
# Check function logs
vercel logs [project-name]

# Common issues:
# - DATABASE_URL format incorrect → verify PostgreSQL connection string
# - CORS_ORIGIN not updated → update to actual Vercel URL
# - JWT_SECRET not strong enough → regenerate 32+ char secret
```

### Database Connection Timeout

```
Error: connect ECONNREFUSED at PostgreSQL server
→ Fix: 
  1. Verify DATABASE_URL in Vercel environment variables
  2. Check if PostgreSQL server firewall allows Vercel IPs
  3. For Azure: Add Vercel IP to firewall rules
```

### Rate Limiting Issues

Current limits:
- Global: 100 requests per 15 minutes
- Auth: 5 attempts per 15 minutes

Adjust in `server/index.ts` based on production traffic.

## Monitoring & Maintenance

### Health Monitoring

Set up monitoring for `/health` endpoint:
- Vercel Analytics
- External monitoring (e.g., UptimeRobot)
- Sentry for error tracking

### Database Backups

```bash
# Automated backups in Azure
# Set in Azure Portal → PostgreSQL → Backup

# Manual backup
pg_dump $DATABASE_URL > backup.sql

# Restore from backup
psql $DATABASE_URL < backup.sql
```

### View Production Logs

```bash
# Vercel CLI
vercel logs trackwise --prod

# Or in Vercel Dashboard:
# Settings → Functions → View logs
```

## Security Checklist

- [x] Environment variables configured in Vercel (not in code)
- [x] HTTPS enforced (automatic with Vercel)
- [x] CORS properly configured for production domain
- [x] JWT secrets are strong (32+ characters)
- [x] Rate limiting enabled
- [x] Helmet security headers configured
- [x] Database connection is encrypted
- [x] .env file not committed to git
- [x] `.gitignore` includes node_modules and sensitive files

## Rollback Procedure

If deployment causes issues:

```bash
# Vercel Dashboard → Deployments → Select previous deployment → Promote to Production

# OR via CLI:
vercel promote [deployment-url] --prod
```

## Next Steps

1. ✅ Complete steps 1-7 above
2. 🔒 Set up monitoring and alerting
3. 📊 Configure analytics
4. 🔄 Set up continuous deployment from GitHub
5. 🚀 Schedule production launch
6. 📋 Create runbook for common issues

---

## Support & Resources

- [Vercel Documentation](https://vercel.com/docs)
- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html)
- [Azure Database for PostgreSQL](https://learn.microsoft.com/en-us/azure/postgresql/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
