-- Run once against an existing database (schema.sql already has these).
-- Sequential, human-readable invoice numbers per organization (INV-0042),
-- with a prefix each organization can change.

-- Per-organization settings: the invoice number prefix, and the last number
-- handed out. Creating an invoice bumps last_invoice_number with an upsert,
-- whose row lock makes concurrent creates take turns.
CREATE TABLE IF NOT EXISTS org_settings (
    org_id TEXT PRIMARY KEY,
    invoice_prefix TEXT NOT NULL DEFAULT 'INV',
    last_invoice_number INTEGER NOT NULL DEFAULT 0
);

-- Each invoice keeps the prefix it was numbered with, so changing the prefix
-- doesn't renumber invoices that were already issued.
ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS invoice_number INTEGER,
    ADD COLUMN IF NOT EXISTS invoice_prefix TEXT NOT NULL DEFAULT 'INV';

-- Number the existing invoices 1, 2, 3, ... per organization, oldest first,
-- after any that already have a number (so running this again is harmless).
WITH numbered AS (
    SELECT
        i.id,
        COALESCE(
            (SELECT MAX(n.invoice_number) FROM invoices n WHERE n.org_id = i.org_id),
            0
        ) + ROW_NUMBER() OVER (PARTITION BY i.org_id ORDER BY i.created_at, i.id) AS invoice_number
    FROM invoices i
    WHERE i.invoice_number IS NULL
)
UPDATE invoices
SET invoice_number = numbered.invoice_number
FROM numbered
WHERE invoices.id = numbered.id;

ALTER TABLE invoices
    ALTER COLUMN invoice_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS invoices_org_id_invoice_number_key
    ON invoices (org_id, invoice_number);

-- Start each organization's counter after its highest number.
INSERT INTO org_settings (org_id, last_invoice_number)
SELECT org_id, MAX(invoice_number) FROM invoices GROUP BY org_id
ON CONFLICT (org_id) DO UPDATE
    SET last_invoice_number = GREATEST(
        org_settings.last_invoice_number,
        EXCLUDED.last_invoice_number
    );
