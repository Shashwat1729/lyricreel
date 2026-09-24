import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanSongTitle, mergeTranscriptions, parseArtistAndTrack, parseLRC, syncedLinesToWordTimestamps } from '../src/services/lyrics';

test('parseLRC handles fractions, multi-stamps and enhanced tags', () => {
  const lines = parseLRC('[ar:Someone]\n[00:01.50]Hello world\n[00:10.00][00:20.5]Chorus <00:10.20>line\n[00:30.00]\n');
  assert.deepEqual(lines, [
    { time: 1.5, text: 'Hello world' },
    { time: 10, text: 'Chorus line' },
    { time: 20.5, text: 'Chorus line' },
  ]);
});

test('syncedLinesToWordTimestamps stays inside the line and is ordered', () => {
  const words = syncedLinesToWordTimestamps([{ time: 1, text: 'a longer line' }, { time: 3, text: 'next' }]);
  assert.equal(words.length, 4);
  assert.equal(words[0].start, 1);
  for (let i = 1; i < words.length; i++) assert.ok(words[i].start >= words[i - 1].end);
  assert.ok(words[2].end <= 3);
});

test('cleanSongTitle and parseArtistAndTrack strip video noise', () => {
  assert.equal(cleanSongTitle('Firework (Official Music Video) [HD]'), 'Firework');
  assert.equal(cleanSongTitle('Song ft. Other Artist'), 'Song');
  assert.deepEqual(parseArtistAndTrack('Katy Perry - Firework (Official Music Video)'), { artist: 'Katy Perry', track: 'Firework' });
  assert.deepEqual(parseArtistAndTrack('Firework', 'KatyPerryVEVO'), { artist: 'KatyPerry', track: 'Firework' });
});

test('mergeTranscriptions keeps lyric text with whisper timing', () => {
  const lyrics = [
    { word: 'Hello', start: 1, end: 1.4 },
    { word: 'darkness,', start: 1.5, end: 2 },
    { word: 'my', start: 2.1, end: 2.3 },
    { word: 'old', start: 2.4, end: 2.6 },
    { word: 'friend', start: 2.7, end: 3 },
  ];
  const whisper = [
    { word: 'hello', start: 1.3, end: 1.6 },
    { word: 'darknes', start: 1.8, end: 2.4 },
    { word: 'old', start: 2.8, end: 3.0 },
    { word: 'friend', start: 3.1, end: 3.6 },
  ];
  const { words, matchRatio } = mergeTranscriptions(whisper, lyrics);
  assert.equal(matchRatio, 0.8);
  assert.deepEqual(words.map((w) => w.word), ['Hello', 'darkness,', 'my', 'old', 'friend']);
  assert.equal(words[0].start, 1.3);
  assert.equal(words[4].start, 3.1);
  assert.ok(words[2].start >= words[1].end && words[2].end <= words[3].start);
});

test('mergeTranscriptions falls back to lyrics when alignment is poor', () => {
  const lyrics = [{ word: 'one', start: 0, end: 1 }, { word: 'two', start: 1, end: 2 }, { word: 'three', start: 2, end: 3 }];
  const whisper = [{ word: 'banana', start: 0, end: 1 }];
  const { words } = mergeTranscriptions(whisper, lyrics);
  assert.deepEqual(words, lyrics);
});
