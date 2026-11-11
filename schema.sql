DROP TABLE IF EXISTS invoice_items;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS customers;

-- Status can be 'active', 'disabled', 'deleted'
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    region TEXT,
    postal_code TEXT,
    country TEXT,
    org_id TEXT NOT NULL DEFAULT 'org001a',
    status TEXT NOT NULL DEFAULT 'active'
);

-- Status can be 'active', 'disabled', 'deleted'
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    org_id TEXT NOT NULL DEFAULT 'org001a',
    status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
    -- A manual total that replaces the computed one; NULL means computed.
    total_override DECIMAL(10, 2),
    status TEXT NOT NULL DEFAULT 'draft',
    org_id TEXT NOT NULL DEFAULT 'org001a',
    -- The date payment is due; NULL means due upon receipt.
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    -- NULL for a one-off line item, which is named by description instead.
    product_id UUID REFERENCES products(id),
    description TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL
); 
