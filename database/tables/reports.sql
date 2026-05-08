-- Reports table (for saved/generated reports)
CREATE TABLE reports (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES businesses(tenant_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'sales', 'inventory', 'financial', 'custom'
    parameters JSONB, -- Report parameters/filters
    data JSONB, -- Generated report data
    generated_by VARCHAR(100) NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE, -- For cached reports
    is_template BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT valid_expiry CHECK (expires_at IS NULL OR expires_at > generated_at)
);

-- Indexes
CREATE INDEX idx_reports_tenant_id ON reports(tenant_id);
CREATE INDEX idx_reports_type ON reports(type);
CREATE INDEX idx_reports_generated_at ON reports(generated_at);
