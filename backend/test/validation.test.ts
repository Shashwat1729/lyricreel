import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isUuid, resolveUpload, sanitizeWords } from '../src/lib/validation';
import { extractVideoId } from '../src/services/youtube';

test('extractVideoId accepts the common YouTube URL shapes', () => {
  const id = 'dQw4w9WgXcQ';
  for (const url of [
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?v=${id}&list=PL123&t=10`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://music.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}?si=abc`,
    `https://www.youtube.com/shorts/${id}`,
    `youtube.com/watch?v=${id}`,
    id,
  ]) {
    assert.equal(extractVideoId(url), id, url);
  }
});

test('extractVideoId rejects other hosts and garbage', () => {
  for (const bad of ['https://evil.com/watch?v=dQw4w9WgXcQ', 'https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ', 'not a url', '', 'https://youtube.com/watch?v=short']) {
    assert.throws(() => extractVideoId(bad), bad);
  }
});

test('sanitizeWords validates, trims and sorts', () => {
  const out = sanitizeWords([{ word: ' b ', start: 2, end: 3 }, { word: 'a', start: 1, end: 0.5 }, { word: '  ', start: 4, end: 5 }]);
  assert.deepEqual(out, [{ word: 'a', start: 1, end: 1 }, { word: 'b', start: 2, end: 3 }]);
  assert.equal(typeof sanitizeWords([]), 'string');
  assert.equal(typeof sanitizeWords([{ word: 'x', start: 'a', end: 1 }]), 'string');
  assert.equal(typeof sanitizeWords([{ word: 'x', start: NaN, end: 1 }]), 'string');
});

test('resolveUpload only accepts generated names', () => {
  assert.equal(resolveUpload('../etc/passwd'), null);
  assert.equal(resolveUpload('../../0b8d6a2e-3c5f-4d0e-9a1b-2c3d4e5f6a7b.mp3'), null);
  assert.equal(resolveUpload('0b8d6a2e-3c5f-4d0e-9a1b-2c3d4e5f6a7b.exe'), null);
  assert.equal(isUuid('0b8d6a2e-3c5f-4d0e-9a1b-2c3d4e5f6a7b'), true);
  assert.equal(isUuid('nope'), false);
});
