-- Run once against an existing database (schema.sql already has this).
-- The date an invoice's payment is due; NULL means due upon receipt.

ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS due_date DATE;
