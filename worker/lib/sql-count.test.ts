import { describe, expect, it } from 'vitest';
import { toSqlCount } from './sql-count';

describe('toSqlCount', () => {
  it('coerces bigint counts for JSON-safe responses', () => {
    expect(toSqlCount({ count: BigInt(7) })).toBe(7);
    expect(toSqlCount({ count: 3 })).toBe(3);
    expect(toSqlCount(null)).toBe(0);
  });
});
