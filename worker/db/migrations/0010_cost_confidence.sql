-- Economics truth: distinguish known vs unpriced inference costs

ALTER TABLE inference_runs ADD COLUMN cost_confidence TEXT NOT NULL DEFAULT 'unpriced';
ALTER TABLE inference_runs ADD COLUMN pricing_version TEXT;
ALTER TABLE inference_runs ADD COLUMN cost_calculated_at TEXT;

UPDATE inference_runs
SET cost_confidence = 'estimated'
WHERE provider_cost_microusd > 0 AND usage_estimated = 1;

UPDATE inference_runs
SET cost_confidence = 'actual'
WHERE provider_cost_microusd > 0 AND (usage_estimated = 0 OR usage_estimated IS NULL);
