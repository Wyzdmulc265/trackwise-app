# TrackWise PostgreSQL Database Setup

This project uses PostgreSQL as the database backend with a **multi-tenant architecture** to ensure complete data isolation between different businesses.

## Quick Start

### 1. Install PostgreSQL

Download and install PostgreSQL 14+ from: https://www.postgresql.org/download/windows/

**During installation, save the password you set for the `postgres` user!**

### 2. Run Setup Script

Open PowerShell and run:

```powershell
cd C:\Users\wisdo\Desktop\projects\trackwise-feature-specifications\ (1)
.\setup-local-postgres.ps1 -PostgresPassword "your_postgres_password"
```

Replace `your_postgres_password` with the password you set during PostgreSQL installation.

The script will:
- ✓ Test PostgreSQL connection
- ✓ Create the `trackwise` database
- ✓ Create `trackwise_admin` user
- ✓ Grant necessary privileges
- ✓ Load the database schema
- ✓ Optionally load sample data

### 3. Verify Setup

```powershell
# Connect to the database
psql -U trackwise_admin -h localhost -d trackwise

# List all tables
\dt

# Exit
\q
```

## Database Connection

**Connection String:**
```
postgresql://trackwise_admin:trackwise_secure_123@localhost:5432/trackwise
```

**Details:**
- Host: `localhost`
- Port: `5432`
- Database: `trackwise`
- Username: `trackwise_admin`
- Password: `trackwise_secure_123`

## Files Structure

```
database/
├── schema.sql                 # Complete database schema
├── types_and_functions.sql    # Custom types and utility functions
└── tables/
    ├── businesses.sql         # Tenant/business information
    ├── users.sql              # User accounts
    ├── categories.sql         # Transaction categories
    ├── inventory_items.sql    # Inventory management
    ├── transactions.sql       # Financial transactions
    ├── pending_approvals.sql  # Approval workflow
    ├── history.sql            # Audit logging
    └── reports.sql            # Saved/generated reports

infrastructure/
├── postgresql.bicep           # Azure PostgreSQL Flexible Server template
└── postgresql.parameters.json # Deployment parameters
```

## Database Features

### Multi-Tenancy
- All tables include `tenant_id` UUID column
- Foreign key constraints ensure tenant isolation
- Row Level Security (RLS) enabled for additional security
- Unique constraints scoped to tenant (e.g., SKU uniqueness per tenant)

### Data Integrity
- Check constraints for positive values and valid data
- Foreign key relationships with appropriate cascade actions
- UUID primary keys for global uniqueness
- Audit trail with history table

### Performance
- Comprehensive indexing strategy
- Optimized indexes for common query patterns
- Partial indexes for low-stock alerts

### Approval Workflow
- Flexible JSONB payload for different approval types
- Status tracking with timestamps
- Audit trail for all changes

## Deployment

### Azure Infrastructure
1. Update `postgresql.parameters.json` with your admin password
2. Deploy using Azure CLI:
   ```bash
   az deployment group create \
     --resource-group your-resource-group \
     --template-file infrastructure/postgresql.bicep \
     --parameters infrastructure/postgresql.parameters.json
   ```

### Database Schema
1. Connect to your PostgreSQL instance
2. Run the schema files in order:
   ```sql
   -- 1. Types and functions
   \i database/types_and_functions.sql

   -- 2. Tables (in dependency order)
   \i database/tables/businesses.sql
   \i database/tables/users.sql
   \i database/tables/categories.sql
   \i database/tables/inventory_items.sql
   \i database/tables/transactions.sql
   \i database/tables/pending_approvals.sql
   \i database/tables/history.sql
   \i database/tables/reports.sql
   ```

   Or run the complete schema:
   ```sql
   \i database/schema.sql
   ```

## Security Considerations

- **Network Security**: Deploy PostgreSQL in a virtual network with restricted access
- **Authentication**: Use Azure AD integration for production
- **Encryption**: Enable SSL/TLS for all connections
- **Backup**: Configure automated backups with geo-redundancy
- **Monitoring**: Set up Azure Monitor for performance and security alerts

## Application Integration

The database schema supports the React application's data models with proper relationships and constraints. The multi-tenant design ensures each business operates in complete isolation while sharing the same database infrastructure.

### Tenant Context
Applications must:
1. Set the `tenant_id` context for all queries
2. Implement proper authentication and authorization
3. Handle tenant-specific business logic
4. Maintain audit trails for all changes

### Default Data
Consider seeding default categories for new tenants:
- Sales: "Product Sales", "Service Revenue"
- Purchases: "Inventory Purchase", "Equipment"
- Expenses: "Rent", "Utilities", "Salaries", "Marketing"