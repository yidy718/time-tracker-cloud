-- Add PO number and invoice number fields to tasks table
-- Run this SQL in your Supabase SQL Editor

BEGIN;

-- Add financial tracking fields to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS po_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100);

-- Add comments to the columns
COMMENT ON COLUMN tasks.po_number IS 'Purchase Order number for this task';
COMMENT ON COLUMN tasks.invoice_number IS 'Invoice number associated with this task';

-- Create index for searching by PO/Invoice numbers
CREATE INDEX IF NOT EXISTS idx_tasks_po_number ON tasks(po_number) WHERE po_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_invoice_number ON tasks(invoice_number) WHERE invoice_number IS NOT NULL;

COMMIT;

-- Display current tasks with financial fields
SELECT 
  t.title,
  t.po_number,
  t.invoice_number,
  e.first_name || ' ' || e.last_name as assigned_to,
  o.name as organization
FROM tasks t
LEFT JOIN employees e ON t.assigned_to = e.id
LEFT JOIN organizations o ON t.organization_id = o.id
WHERE t.po_number IS NOT NULL OR t.invoice_number IS NOT NULL
ORDER BY t.created_at DESC;