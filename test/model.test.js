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

test('BMI uses latest weight and height, preserves absent height and avoids adult categories for Junior', async () => {
  const { bmi } = await import('../public/model.js');
  const p = { ...person('Example', 90, 80), height: 180 };
  assert.ok(Math.abs(bmi(p).value - 24.691358) < 0.00001);
  assert.equal(bmi(p).category, 'Normal');
  assert.equal(bmi(person('Example',80,79)), null);
  assert.match(bmi({ ...p, category: 'Junior' }).category, /Junior/);
  assert.equal(validateParticipant({ ...p, height: 0 }), false);
});
test('lab records and PDF attachments roundtrip; incomplete pressure and unsafe attachment formats rejected', async () => {
  const { recordHealth } = await import('../public/model.js');
  const p = person('Example',80,78);
  const entry = { date:'2025-01-10',sleep:null,activity:null,water:null,notes:'',labs:{glucose:5.5,systolic:120,diastolic:80,hdl:1.2,ldl:2.6,uricAcid:350,creatinine:85},glucoseContext:'Puasa',attachments:[{name:'result.pdf',type:'application/pdf',size:5,data:'data:application/pdf;base64,JVBERi0='}] };
  const result = recordHealth(p,entry);
  assert.equal(validateParticipant(JSON.parse(JSON.stringify(result))),true);
  assert.throws(()=>recordHealth(p,{...entry,labs:{systolic:120}}));
  assert.throws(()=>recordHealth(p,{...entry,labs:{systolic:80,diastolic:120}}));
  assert.throws(()=>recordHealth(p,{...entry,attachments:[{...entry.attachments[0],type:'text/html'}]}));
  assert.throws(()=>recordHealth(p,{...entry,labs:{glucose:-1}}));
  assert.equal(recordHealth(result,{...entry,attachments:[]}).health[0].attachments.length,0);
});
