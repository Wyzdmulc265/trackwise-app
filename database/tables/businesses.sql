-- Businesses table (tenant information)
CREATE TABLE businesses (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL UNIQUE, -- Unique identifier for each business/tenant
    name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    contact VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_businesses_tenant_id ON businesses(tenant_id);

-- Trigger for updated_at
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
