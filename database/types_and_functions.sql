-- Custom types and functions for TrackWise database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE transaction_type AS ENUM ('sale', 'purchase', 'expense');
CREATE TYPE user_role AS ENUM ('Admin', 'Accountant', 'Viewer');
CREATE TYPE approval_kind AS ENUM ('transaction', 'inventory');
CREATE TYPE approval_action AS ENUM ('create', 'update', 'delete');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';