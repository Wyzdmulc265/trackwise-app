-- Pending approvals table (for approval workflow)
CREATE TABLE pending_approvals (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES businesses(tenant_id) ON DELETE CASCADE,
    kind approval_kind NOT NULL,
    action approval_action NOT NULL,
    payload JSONB NOT NULL, -- Flexible payload for different approval types
    target_id TEXT, -- ID of the target record (transaction or inventory item)
    target_snapshot JSONB, -- Snapshot of the target record before change
    requested_by VARCHAR(100) NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status approval_status NOT NULL DEFAULT 'pending',
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,

    CONSTRAINT valid_target_id CHECK (
        (kind = 'transaction' AND target_id IS NOT NULL) OR
        (kind = 'inventory' AND target_id IS NOT NULL) OR
        (action = 'create' AND target_id IS NULL)
    )
);

-- Indexes
CREATE INDEX idx_pending_approvals_tenant_id ON pending_approvals(tenant_id);
CREATE INDEX idx_pending_approvals_status ON pending_approvals(status);
CREATE INDEX idx_pending_approvals_requested_by ON pending_approvals(requested_by);
