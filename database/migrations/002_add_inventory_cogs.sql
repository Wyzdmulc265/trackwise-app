-- Add cogs column to inventory_items for tracking cost of goods sold
ALTER TABLE inventory_items
    ADD COLUMN IF NOT EXISTS cogs DECIMAL(15,2) NOT NULL DEFAULT 0;
