# PostgreSQL Local Setup - Quick Reference

## Prerequisites
- Windows 10 or later
- PostgreSQL 14 or higher installed
- PowerShell 5.0 or higher

## Installation

### 1. Download PostgreSQL
https://www.postgresql.org/download/windows/

### 2. Run Setup Script
```powershell
.\setup-local-postgres.ps1 -PostgresPassword "YOUR_POSTGRES_PASSWORD"
```

## Connection String
```
postgresql://trackwise_admin:trackwise_secure_123@localhost:5432/trackwise
```

## Quick Commands

```powershell
# Check PostgreSQL status
Get-Service postgres*

# (Optional) Connect as superuser
psql -U postgres -h localhost -d postgres

# Connect to database
psql -U trackwise_admin -h localhost -d trackwise

# List tables
psql -U trackwise_admin -h localhost -d trackwise -c "\dt"

# Verify schema was applied
psql -U trackwise_admin -h localhost -d trackwise -f "./database/verify_setup.sql"

# Backup database
pg_dump -U trackwise_admin trackwise > backup.sql

# Restore database
psql -U trackwise_admin trackwise < backup.sql
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| PostgreSQL not found | Download from https://www.postgresql.org |
| Connection refused | Check PostgreSQL service: `Get-Service postgres*` |
| Command not found | Add PostgreSQL to PATH or restart PowerShell |
| Database exists error | Drop and recreate: `psql -U postgres -c "DROP DATABASE trackwise;"` |

## Multi-Tenancy Guarantee

✓ Each business has a unique `tenant_id`
✓ All queries filtered by `tenant_id`
✓ No cross-tenant data leaks possible
✓ Foreign key constraints enforce isolation

## Files

- `setup-local-postgres.ps1` - Automated setup script
- `database/schema.sql` - Database schema
- `database/sample_data.sql` - Sample test data
- `POSTGRESQL_SETUP.md` - Detailed setup guide
