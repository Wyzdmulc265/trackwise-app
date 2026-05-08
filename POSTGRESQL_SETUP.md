# TrackWise PostgreSQL Setup Guide for Windows

This guide helps you set up PostgreSQL locally for development.

## Option 1: Download Directly from EnterpriseDB

1. Download PostgreSQL 16 from: https://www.postgresql.org/download/windows/
2. Run the installer and follow the setup wizard
3. During installation:
   - Default port: 5432
   - Default username: postgres
   - **Save the password you set for the postgres user**
   - Accept default locations

## Option 2: PostgreSQL via Chocolatey

If you have Chocolatey installed, run in PowerShell (as Administrator):

```powershell
choco install postgresql16
```

## Option 3: Manual Download

1. Visit https://www.postgresql.org/download/
2. Select Windows and download the latest version
3. Run the installer

## After Installation

### 1. Verify PostgreSQL is Running

```powershell
# Check if PostgreSQL service is running
Get-Service postgres*

# Connect to test
psql -U postgres
```

### 2. Create TrackWise Database and User

Run these commands in PowerShell:

```powershell
# Set the connection string
$connectionString = "Server=localhost;Port=5432;User Id=postgres;Password=YOUR_PASSWORD"

# Create database and user
psql -U postgres -h localhost -c "CREATE DATABASE trackwise;"
psql -U postgres -h localhost -c "CREATE USER trackwise_admin WITH ENCRYPTED PASSWORD 'trackwise_secure_123';"
psql -U postgres -h localhost -c "GRANT ALL PRIVILEGES ON DATABASE trackwise TO trackwise_admin;"
```

### 3. Load the Schema

```powershell
# Apply schema to the database
psql -U trackwise_admin -h localhost -d trackwise -f ".\database\schema.sql"

# Load sample data (optional)
psql -U trackwise_admin -h localhost -d trackwise -f ".\database\sample_data.sql"
```

## Connection Details for Your App

- **Host**: localhost
- **Port**: 5432
- **Database**: trackwise
- **Username**: trackwise_admin
- **Password**: trackwise_secure_123
- **Connection String**: `postgresql://trackwise_admin:trackwise_secure_123@localhost:5432/trackwise`

## Verify Setup

Connect to the database and list tables:

```powershell
psql -U trackwise_admin -h localhost -d trackwise -c "\dt"
```

You should see:
- businesses
- users
- categories
- inventory_items
- transactions
- pending_approvals
- history
- reports

## Troubleshooting

### PostgreSQL service not found
- Install PostgreSQL directly from: https://www.postgresql.org/download/windows/
- Ensure the PostgreSQL service is running (check Services on Windows)

### Connection refused on port 5432
- Verify PostgreSQL is running: `Get-Service postgres*`
- Check that port 5432 is not blocked by firewall
- Start PostgreSQL if stopped: `Start-Service postgres*`

### psql command not found
- Add PostgreSQL to PATH environment variable
- Path is typically: `C:\Program Files\PostgreSQL\16\bin`
- Restart PowerShell after updating PATH

## Next Steps

1. Configure your backend application to use the connection string
2. Create additional databases for different tenants/environments
3. Set up automated backups
4. Consider using pgAdmin 4 for GUI management (available via winget)
