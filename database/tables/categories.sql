-- Categories table
CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES businesses(tenant_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type transaction_type NOT NULL,
    is_custom BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_category_name_per_tenant UNIQUE (tenant_id, name)
);

-- Indexes
CREATE INDEX idx_categories_tenant_id ON categories(tenant_id);
CREATE INDEX idx_categories_type ON categories(type);

-- Trigger for updated_at
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
