-- Add measurement_unit column to inventory_items for tracking units (Litres, Pieces (pcs), KG)
ALTER TABLE inventory_items
    ADD COLUMN measurement_unit VARCHAR(50) NOT NULL DEFAULT 'Pieces';

-- Optional: strict allowed values via CHECK constraint (commented out by default).
-- ALTER TABLE inventory_items
--     ADD CONSTRAINT chk_inventory_measurement_unit
--     CHECK (measurement_unit IN ('Litres', 'Pieces (pcs)', 'KG'));
