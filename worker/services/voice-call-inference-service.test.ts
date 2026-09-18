import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_BATTERY_CONFIG } from '../billing/battery-config';
import { findInferenceRunById } from '../repositories/inference-run-repository';
import { ensureEnergyWallet } from './energy-service';
import {
  beginVoiceCallInference,
  completeVoiceCallInference,
  failVoiceCallInference,
} from './voice-call-inference-service';
import { createTestD1 } from '../test/sqlite-d1';

const migrationsDir = join(process.cwd(), 'worker/db/migrations');

describe('voice-call-inference-service', () => {
  it('creates voice_call run, prices duration as estimated COGS, and completes', async () => {
    const db = createTestD1(migrationsDir);
    const userId = 'user-voice';
    const runId = 'voice-run-1';
    await ensureEnergyWallet(db, userId, DEFAULT_BATTERY_CONFIG);

    const begin = await beginVoiceCallInference(db, {
      runId,
      userId,
      personaId: 'persona-1',
      personaVersion: 1,
    });
    expect(begin.runId).toBe(runId);
    expect(begin.reservedUnits).toBeGreaterThan(0);

    const streaming = await findInferenceRunById(db, runId);
    expect(streaming?.operationType).toBe('voice_call');
    expect(streaming?.status).toBe('streaming');
    expect(streaming?.energyReserved).toBeGreaterThan(0);

    await completeVoiceCallInference(db, userId, runId, 120_000);

    const completed = await findInferenceRunById(db, runId);
    expect(completed?.status).toBe('completed');
    expect(completed?.usageEstimated).toBe(true);
    expect(completed?.costConfidence).toBe('estimated');
    expect(completed?.providerCostMicrousd).toBe(160_000);
    expect(completed?.latencyMs).toBe(120_000);
    expect(completed?.energyCharged).toBeGreaterThan(0);

    const breakdown = JSON.parse(completed?.costBreakdownJson ?? '{}') as {
      estimateSource?: string;
      durationMs?: number;
    };
    expect(breakdown.estimateSource).toBe('session_duration');
    expect(breakdown.durationMs).toBe(120_000);
  });

  it('marks failed voice call and releases reserved energy', async () => {
    const db = createTestD1(migrationsDir);
    const userId = 'user-voice-fail';
    const runId = 'voice-run-fail';
    await ensureEnergyWallet(db, userId, DEFAULT_BATTERY_CONFIG);

    await beginVoiceCallInference(db, {
      runId,
      userId,
      personaId: 'persona-1',
      personaVersion: 1,
    });

    await failVoiceCallInference(db, userId, runId, 'VOICE_CALL_ABORTED');

    const failed = await findInferenceRunById(db, runId);
    expect(failed?.status).toBe('failed');
    expect(failed?.errorCode).toBe('VOICE_CALL_ABORTED');
  });
});
