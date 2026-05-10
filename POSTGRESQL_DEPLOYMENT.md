# TrackWise - PostgreSQL Deployment

This is the TrackWise application configured for deployment with PostgreSQL database.

## Architecture

- **Frontend**: React + Vite (client-side application)
- **Backend**: Node.js + Express server
- **Database**: PostgreSQL (Neon or self-hosted)
- **Authentication**: JWT-based with username/business name
- **Deployment**: Server + static frontend

## Setup Instructions

### 1. Database Setup

Use Neon PostgreSQL (recommended) or your own PostgreSQL instance:

**Neon PostgreSQL:**
- Go to [neon.tech](https://neon.tech)
- Create a new project
- Get your connection string

**Local PostgreSQL:**
- Install PostgreSQL locally
- Create a database named `trackwise`

### 2. Database Schema

Run the SQL files in the `database/` folder in order:

```bash
# Connect to your database
psql "your-connection-string"

# Run schema files
\i database/schema.sql
\i database/types_and_functions.sql
\i database/tables/users.sql
\i database/tables/businesses.sql
\i database/tables/categories.sql
\i database/tables/inventory_items.sql
\i database/tables/transactions.sql
\i database/tables/reports.sql
\i database/tables/history.sql
\i database/tables/pending_approvals.sql

# Run migrations if any
\i database/migrations/001_add_refresh_tokens.sql
\i database/migrations/002_add_inventory_cogs.sql
\i database/migrations/003_add_inventory_measurement_unit.sql
```

### 3. Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Server Environment Variables
JWT_SECRET=your-32-character-jwt-secret-here
JWT_REFRESH_SECRET=your-32-character-jwt-refresh-secret-here
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
DATABASE_URL=postgresql://username:password@host:5432/database

# Client Environment Variables (for development)
# API_BASE_URL=http://localhost:3000
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Development

```bash
# Start server (with auto-restart)
npm run dev

# In another terminal, serve frontend (optional for development)
npm run dev:client
```

### 6. Production Build

```bash
# Build frontend
npm run build

# Start production server
npm start
```

## Deployment Options

### Vercel + Neon (Recommended)

1. **Database**: Use Neon PostgreSQL
2. **Backend**: Deploy server to Vercel
3. **Frontend**: Deploy static build to Vercel

### Railway + PostgreSQL

1. **Database**: Railway PostgreSQL
2. **Full-stack**: Deploy entire app to Railway

### Docker

Use the provided Docker setup for containerized deployment.

## Database Schema Overview

### Core Tables
- `users`: User accounts with business association
- `businesses`: Business entities (multi-tenant)
- `categories`: Transaction categories (sale/purchase/expense)
- `inventory_items`: Product inventory
- `transactions`: Financial transactions
- `pending_approvals`: Approval workflow for changes
- `history`: Audit trail
- `reports`: Saved reports

### Key Features
- **Multi-tenancy**: Via `tenant_id` (business key)
- **Row Level Security**: Users only see their business data
- **Audit Trail**: All changes tracked in history
- **Approval Workflow**: Changes can require admin approval
- createdAt (string)

### categories
- name (string)
- type (string)
- isCustom (boolean)
- businessKey (string)
- createdAt (string)

### inventory
- name (string)
- sku (string)
- unitCost (number)
- unitPrice (number)
- quantity (number)
- lowStockThreshold (number)
- salesCount (number)
- revenue (number)
- cogs (number)
- measurementUnit (string)
- businessKey (string)
- createdAt (string)

### transactions
- type (string)
- date (string)
- category (string)
- amount (number)
- description (string)
- itemId (string)
- quantity (number)
- businessKey (string)
- createdAt (string)

### approvals
- kind (string)
- action (string)
- payload (object)
- businessKey (string)
- createdAt (string)

## Notes

- Approvals workflow is simplified; in production, consider using Appwrite Functions for complex logic.
- User creation for additional users may require Appwrite Functions for security.
- File storage not implemented; add if needed.

## Development

```bash
npm install
npm run dev
```