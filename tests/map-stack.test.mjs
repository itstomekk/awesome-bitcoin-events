// Pins in the same city stack around the centre instead of hiding each other.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/map-stack.js', import.meta.url), 'utf8');
const sandbox = {};
vm.runInNewContext(source.replace('(globalThis)', '(this)'), sandbox);
const { stack, stackPlaces, GAP } = sandbox.abeStack;

const dist = ([ax, ay], [bx, by]) => Math.hypot(ax - bx, ay - by);

test('centres may come no closer than three times the larger radius', () => {
  assert.equal(GAP, 3);
  for (const radii of [[6, 6], [6, 8, 8, 5], Array(12).fill(6), [6, 6, 8, 8, 8, 8, 5, 5, 5, 5, 5, 5]]) {
    const at = stack(radii);
    for (let i = 0; i < at.length; i++) {
      for (let j = i + 1; j < at.length; j++) {
        assert.ok(dist(at[i], at[j]) >= GAP * Math.max(radii[i], radii[j]) - 0.02, `${radii}: ${i},${j}`);
      }
    }
  }
});

test('the first pin takes the centre; the pile stays tight, not a ring', () => {
  const at = stack(Array(12).fill(6));
  assert.deepEqual([...at[0]], [0, 0]);
  // Twelve pins fit within about two gaps of the centre.
  assert.ok(Math.max(...at.map((p) => dist(p, [0, 0]))) <= 2 * GAP * 6, JSON.stringify(at));
  // Each pin is as close to the centre as possible: never farther than the next one.
  const d = at.map((p) => dist(p, [0, 0]));
  for (let i = 1; i < d.length; i++) assert.ok(d[i] >= d[i - 1] - 0.3);
});

test('priority decides who gets the centre; other cities are untouched', () => {
  const items = [
    { point: { latitude: 1, longitude: 1 }, radius: 8, priority: 1 },
    { point: { latitude: 1, longitude: 1 }, radius: 6, priority: 0 },
    { point: { latitude: 2, longitude: 2 }, radius: 5, priority: 2 },
  ];
  stackPlaces(items);
  assert.deepEqual([items[1].dx, items[1].dy], [0, 0]);
  assert.notDeepEqual([items[0].dx, items[0].dy], [0, 0]);
  assert.deepEqual([items[2].dx, items[2].dy], [0, 0]);
});

test('the home page loads the stacker and re-applies it on zoom', () => {
  const page = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
  assert.match(page, /map-stack\.js/);
  assert.match(page, /abeStack\.stackPlaces\(/);
  assert.match(page, /on\('zoomend'/);
});

test('map popups open on hover and stick on click', () => {
  const page = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
  assert.match(page, /on\('mouseover'/);
  assert.match(page, /on\('mouseout', \(\) => \{ if \(stuck !== marker\)/);
  assert.match(page, /on\('click', \(\) => stick\(marker\)\)/);
});
