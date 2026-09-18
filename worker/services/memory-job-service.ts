import { ERROR_CODES } from '../lib/error-codes';
import { logEvent } from '../lib/structured-log';
import {
  createMemoryJob,
  markMemoryJobCompleted,
  markMemoryJobFailed,
} from '../repositories/memory-job-repository';
import { extractAndPersistMemories } from './memory-service';
import type { PersonyEnv } from '../types/env';

export async function runMemoryExtractionJob(
  env: PersonyEnv,
  db: D1Database,
  input: {
    userId: string;
    personaId: string;
    conversationId: string;
    userMessageId: string;
    userText: string;
    assistantText?: string;
    jobId: string;
  }
): Promise<void> {
  try {
    await extractAndPersistMemories(
      env,
      db,
      input.userId,
      input.personaId,
      input.conversationId,
      input.userMessageId,
      input.userText,
      input.assistantText
    );
    await markMemoryJobCompleted(db, input.jobId);
    logEvent('memory.completed', {
      memoryJobId: input.jobId,
      conversationId: input.conversationId,
      userMessageId: input.userMessageId,
    });
  } catch (err) {
    const errorCode =
      err instanceof Error ? err.message.slice(0, 200) : ERROR_CODES.MEMORY_PROCESSING_FAILED;
    await markMemoryJobFailed(db, input.jobId, errorCode);
    logEvent('memory.failed', {
      memoryJobId: input.jobId,
      conversationId: input.conversationId,
      userMessageId: input.userMessageId,
      errorCode,
    });
  }
}

export function scheduleMemoryExtraction(
  env: PersonyEnv,
  db: D1Database,
  executionCtx: Pick<ExecutionContext, 'waitUntil'> | undefined,
  input: {
    userId: string;
    personaId: string;
    conversationId: string;
    userMessageId: string;
    userText: string;
    assistantText?: string;
  }
): void {
  void createMemoryJob(db, input).then((jobId) => {
    const task = runMemoryExtractionJob(env, db, { ...input, jobId });
    if (executionCtx?.waitUntil) {
      executionCtx.waitUntil(task);
    } else {
      void task;
    }
    logEvent('memory.scheduled', {
      memoryJobId: jobId,
      conversationId: input.conversationId,
      userMessageId: input.userMessageId,
    });
  });
}
