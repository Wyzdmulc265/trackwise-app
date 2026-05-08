-- Sample data for TrackWise database
-- This file contains sample data for development and testing

-- Note: Replace the tenant_id values with actual UUIDs from your businesses table

-- Sample business (tenant)
-- INSERT INTO businesses (tenant_id, name, owner_name, contact) VALUES
-- ('550e8400-e29b-41d4-a716-446655440000', 'Sample Business', 'John Doe', 'john@sample.com');

-- Sample users
-- INSERT INTO users (tenant_id, owner_name, username, business_name, contact, password_hash, role) VALUES
-- ('550e8400-e29b-41d4-a716-446655440000', 'John Doe', 'admin', 'Sample Business', 'john@sample.com', '$2b$10$example.hash.here', 'Admin'),
-- ('550e8400-e29b-41d4-a716-446655440000', 'Jane Smith', 'accountant', 'Sample Business', 'jane@sample.com', '$2b$10$example.hash.here', 'Accountant'),
-- ('550e8400-e29b-41d4-a716-446655440000', 'Bob Viewer', 'viewer', 'Sample Business', 'bob@sample.com', '$2b$10$example.hash.here', 'Viewer');

-- Default categories
-- INSERT INTO categories (tenant_id, name, type, is_custom) VALUES
-- ('550e8400-e29b-41d4-a716-446655440000', 'Product Sales', 'sale', false),
-- ('550e8400-e29b-41d4-a716-446655440000', 'Service Revenue', 'sale', false),
-- ('550e8400-e29b-41d4-a716-446655440000', 'Inventory Purchase', 'purchase', false),
-- ('550e8400-e29b-41d4-a716-446655440000', 'Equipment Purchase', 'purchase', false),
-- ('550e8400-e29b-41d4-a716-446655440000', 'Rent', 'expense', false),
-- ('550e8400-e29b-41d4-a716-446655440000', 'Utilities', 'expense', false),
-- ('550e8400-e29b-41d4-a716-446655440000', 'Salaries', 'expense', false),
-- ('550e8400-e29b-41d4-a716-446655440000', 'Marketing', 'expense', false);

-- Sample inventory items
-- INSERT INTO inventory_items (tenant_id, name, sku, unit_cost, unit_price, quantity, low_stock_threshold) VALUES
-- ('550e8400-e29b-41d4-a716-446655440000', 'Widget A', 'WIDGET-A-001', 10.50, 25.99, 100, 10),
-- ('550e8400-e29b-41d4-a716-446655440000', 'Widget B', 'WIDGET-B-002', 15.75, 35.50, 50, 5),
-- ('550e8400-e29b-41d4-a716-446655440000', 'Gadget X', 'GADGET-X-003', 8.25, 19.99, 75, 15);

-- Sample transactions
-- INSERT INTO transactions (tenant_id, type, date, category, amount, description, item_id, quantity, created_by) VALUES
-- ('550e8400-e29b-41d4-a716-446655440000', 'sale', CURRENT_DATE, 'Product Sales', 51.98, 'Sold 2 Widget A', (SELECT id FROM inventory_items WHERE sku = 'WIDGET-A-001' AND tenant_id = '550e8400-e29b-41d4-a716-446655440000'), 2, 'admin'),
-- ('550e8400-e29b-41d4-a716-446655440000', 'purchase', CURRENT_DATE - INTERVAL '1 day', 'Inventory Purchase', 1050.00, 'Purchased 100 Widget A', (SELECT id FROM inventory_items WHERE sku = 'WIDGET-A-001' AND tenant_id = '550e8400-e29b-41d4-a716-446655440000'), 100, 'accountant'),
-- ('550e8400-e29b-41d4-a716-446655440000', 'expense', CURRENT_DATE - INTERVAL '2 days', 'Rent', 2500.00, 'Monthly office rent', NULL, NULL, 'admin');

-- Sample report
-- INSERT INTO reports (tenant_id, name, type, parameters, data, generated_by, is_template) VALUES
-- ('550e8400-e29b-41d4-a716-446655440000', 'Monthly Sales Report', 'sales',
--  '{"start_date": "2024-01-01", "end_date": "2024-01-31"}',
--  '{"total_sales": 5198.00, "total_transactions": 45, "top_products": ["Widget A", "Gadget X"]}',
--  'admin', false);

-- Query examples for testing multi-tenancy
-- SELECT * FROM users WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000';
-- SELECT * FROM inventory_items WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000';
-- SELECT * FROM transactions WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000' ORDER BY date DESC LIMIT 10;

-- Performance test queries
-- SELECT COUNT(*) FROM transactions WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000' AND date >= CURRENT_DATE - INTERVAL '30 days';
-- SELECT SUM(amount) as total_sales FROM transactions WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000' AND type = 'sale' AND date >= CURRENT_DATE - INTERVAL '30 days';
-- SELECT * FROM inventory_items WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000' AND quantity <= low_stock_threshold;