import { describe, it, expect } from '@jest/globals';
import { relativeAgeToIso, braveDate } from '../../src/utils/relative-age.js';

const NOW = Date.parse('2026-11-16T12:00:00Z');

describe('relativeAgeToIso', () => {
  it('parses hours, days and weeks', () => {
    expect(relativeAgeToIso('3 hours ago', NOW)).toBe('2026-11-16T09:00:00.000Z');
    expect(relativeAgeToIso('2 days ago', NOW)).toBe('2026-11-14T12:00:00.000Z');
    expect(relativeAgeToIso('1 week ago', NOW)).toBe('2026-11-09T12:00:00.000Z');
  });
  it('handles yesterday and unknown text', () => {
    expect(relativeAgeToIso('yesterday', NOW)).toBe('2026-11-15T12:00:00.000Z');
    expect(relativeAgeToIso('sometime', NOW)).toBeNull();
    expect(relativeAgeToIso(undefined, NOW)).toBeNull();
  });
});

describe('braveDate', () => {
  it('prefers an ISO page_age', () => {
    expect(braveDate({ page_age: '2026-11-10T08:00:00', age: '3 hours ago' }, NOW)).toBe('2026-11-10T08:00:00.000Z');
  });
  it('falls back to the relative age, then null', () => {
    expect(braveDate({ age: '5 hours ago' }, NOW)).toBe('2026-11-16T07:00:00.000Z');
    expect(braveDate({}, NOW)).toBeNull();
  });
});
