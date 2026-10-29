import test from 'node:test';
import assert from 'node:assert/strict';
import { metrics, leaderboard, recordWeight, validateParticipant, validDate } from '../public/model.js';
const person = (name, initial, latest) => ({ id: name, name, entries: [{ date: '2025-01-01', weight: initial }, { date: '2025-01-08', weight: latest }] });
test('ranking compares percentage, not absolute loss; weight gain is negative', () => {
  const a = person('Aina', 100, 95), b = person('Badrul', 60, 56), c = person('Chong', 80, 82);
  assert.deepEqual(leaderboard([a, c, b]).map(p => p.name), ['Badrul', 'Aina', 'Chong']);
  assert.equal(metrics(c).percent, -2.5);
});
test('historical entries remain chronological and same-date updates replace the entry', () => {
  let p = person('Aina', 100, 95);
  p = recordWeight(p, '2025-01-04', 98);
  assert.equal(metrics(p).current, 95);
  p = recordWeight(p, '2025-01-08', 94);
  assert.equal(p.entries.length, 3);
  assert.equal(metrics(p).current, 94);
  assert.equal(metrics(p).percent, 6);
  assert.equal(validateParticipant(p), true);
});
test('reject invalid weight, impossible dates, future dates and entries before start', () => {
  const p = person('Aina', 100, 95);
  for (const weight of [0, -1, 501, Infinity, NaN]) assert.throws(() => recordWeight(p, '2025-01-09', weight));
  for (const date of ['2025-02-30', '2099-01-01', '2024-12-31']) assert.throws(() => recordWeight(p, date, 90));
  assert.equal(validDate('2024-02-29'), true);
});
test('stored data validation rejects corrupted and unordered records', () => {
  assert.equal(validateParticipant(null), false);
  assert.equal(validateParticipant({ id: 'x', name: 'X', entries: [] }), false);
  const p = person('Aina', 100, 95);
  p.entries.reverse(); assert.equal(validateParticipant(p), false);
});

test('JSON import validates category and never overwrites existing participants', async () => {
  const { parseImport, mergeImport } = await import('../public/model.js');
  const p = { ...person('Example', 80, 78), category: 'Junior' };
  assert.equal(parseImport([p]).length, 1);
  assert.throws(() => parseImport([{ ...p, category: 'invalid' }]));
  assert.throws(() => parseImport([p, p]));
  assert.throws(() => mergeImport([p], [p]));
  assert.equal(mergeImport([], [p]).length, 1);
});

test('health records validate optional values and replace same-date entries without losing weight history', async () => {
  const { recordHealth } = await import('../public/model.js');
  const p = person('Example', 80, 78);
  const entry = { date: '2025-01-09', sleep: 7.5, activity: 30, water: 2, notes: 'Berjalan' };
  const result = recordHealth(p, entry);
  assert.equal(validateParticipant(result), true);
  assert.deepEqual(result.entries, p.entries);
  assert.equal(recordHealth(result, { ...entry, sleep: 8 }).health.length, 1);
  assert.equal(recordHealth(result, { ...entry, sleep: 8 }).health[0].sleep, 8);
  assert.throws(() => recordHealth(p, { ...entry, sleep: 25 }));
  assert.throws(() => recordHealth(p, { ...entry, activity: 1.5 }));
  assert.throws(() => recordHealth(p, { date: entry.date, sleep: null, water: null, activity: null, notes: '' }));
  assert.equal(validateParticipant({ ...p, health: [{ ...entry, water: -1 }] }), false);
});
