-- Pricing Catalog 2.0: link inference to versioned pricing rows

ALTER TABLE inference_runs ADD COLUMN pricing_entry_id TEXT;
