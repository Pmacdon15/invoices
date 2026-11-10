-- Run once against an existing database (schema.sql already has these).
-- Adds what the MCP server and the app need for customer contact details,
-- one-off line items and a manual invoice total.

ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS address_line1 TEXT,
    ADD COLUMN IF NOT EXISTS address_line2 TEXT,
    ADD COLUMN IF NOT EXISTS city TEXT,
    ADD COLUMN IF NOT EXISTS region TEXT,
    ADD COLUMN IF NOT EXISTS postal_code TEXT,
    ADD COLUMN IF NOT EXISTS country TEXT;

ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS total_override DECIMAL(10, 2);

ALTER TABLE invoice_items
    ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE invoice_items
    ALTER COLUMN product_id DROP NOT NULL;
