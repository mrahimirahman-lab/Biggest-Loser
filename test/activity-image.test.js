import test from 'node:test';
import assert from 'node:assert/strict';
import { validateActivityFile, prepareActivityImage } from '../public/activity-image.js';

test('activity uploads accept exactly 10 MB and reject larger or empty files', () => {
  assert.doesNotThrow(() => validateActivityFile({ type: 'image/jpeg', size: 10 * 1024 * 1024 }));
  assert.throws(() => validateActivityFile({ type: 'image/jpeg', size: 10 * 1024 * 1024 + 1 }), /10 MB/);
  assert.throws(() => validateActivityFile({ type: 'image/png', size: 0 }), /10 MB/);
});

test('activity uploads retain PNG, JPG and WEBP support and reject unsupported formats', () => {
  for (const type of ['image/png', 'image/jpeg', 'image/webp']) {
    assert.doesNotThrow(() => validateActivityFile({ type, size: 100 }));
  }
  assert.throws(() => validateActivityFile({ type: 'image/svg+xml', size: 100 }), /PNG, JPG atau WEBP/);
  assert.throws(() => validateActivityFile(undefined), /PNG, JPG atau WEBP/);
});

test('oversize files are rejected before image decoding or storage work', async () => {
  await assert.rejects(prepareActivityImage({ type: 'image/png', size: 10 * 1024 * 1024 + 1 }), /10 MB/);
});
