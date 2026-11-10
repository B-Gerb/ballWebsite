import assert from 'node:assert/strict';
import test from 'node:test';
import { activeBoosts, boostForItem, formatDuration } from '../src/shops/boosts.js';

test('no active boosts when nothing has been bought', () => {
  assert.deepEqual(activeBoosts({}), []);
  assert.deepEqual(activeBoosts(undefined), []);
});

test('an active boost reports its multiplier, seconds left and how much of it remains', () => {
  const [boost] = activeBoosts({
    tclickValue: { name: 'tclickValue', multiplier: 1.5, frames: 450, total: 600 },
  });
  assert.equal(boost.item, 'Temporary Click Value Multiplier');
  assert.equal(boost.multiplier, 1.5);
  assert.equal(boost.secondsLeft, 7.5);
  assert.equal(boost.fraction, 0.75);
});

test('a boost from an old save (no total) shows as full rather than breaking', () => {
  const [boost] = activeBoosts({ tcircleSpeed: { name: 'tcircleSpeed', multiplier: 2, frames: 300 } });
  assert.equal(boost.item, 'Temporary Speed Multiplier');
  assert.equal(boost.fraction, 1);
});

test('boosts come out in store order and can be looked up by item', () => {
  const frames = {
    tcircleSpeed: { name: 'tcircleSpeed', multiplier: 2, frames: 60, total: 60 },
    tclickValue: { name: 'tclickValue', multiplier: 3, frames: 60, total: 60 },
  };
  assert.deepEqual(activeBoosts(frames).map((b) => b.key), ['tclickValue', 'tcircleSpeed']);
  assert.equal(boostForItem(frames, 'Temporary Speed Multiplier').multiplier, 2);
  assert.equal(boostForItem(frames, 'Temporary Ball Value Multiplier'), null);
});

test('durations read like a clock', () => {
  assert.equal(formatDuration(7.5), '0:08');
  assert.equal(formatDuration(65), '1:05');
  assert.equal(formatDuration(3725), '1:02:05');
  assert.equal(formatDuration(0), '0:00');
});
