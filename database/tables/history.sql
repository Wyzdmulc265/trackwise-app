-- History/Audit log table
CREATE TABLE history (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES businesses(tenant_id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- 'user', 'inventory_item', 'transaction', 'category', 'approval'
    entity_id TEXT NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'approve', 'reject'
    old_values JSONB, -- Previous values (for updates)
    new_values JSONB, -- New values (for creates/updates)
    changed_by VARCHAR(100) NOT NULL, -- username who made the change
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- Indexes
CREATE INDEX idx_history_tenant_id ON history(tenant_id);
CREATE INDEX idx_history_entity ON history(entity_type, entity_id);
CREATE INDEX idx_history_changed_at ON history(changed_at);
