// The Markdown copy (src/pages/index.md.js) must keep README links working off GitHub.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { absolutize } from '../src/pages/index.md.js';

test('relative doc links point at the GitHub blob view', () => {
  assert.equal(absolutize('[Past](PAST.md)'), '[Past](https://github.com/itstomekk/awesome-bitcoin-events/blob/main/PAST.md)');
});

test('relative images point at raw.githubusercontent.com', () => {
  assert.equal(absolutize('![shot](.github/readme/home.jpg)'), '![shot](https://raw.githubusercontent.com/itstomekk/awesome-bitcoin-events/main/.github/readme/home.jpg)');
});

test('absolute, mailto and anchor links are unchanged', () => {
  const md = '[a](https://x.org) [b](mailto:a@b.c) [c](#meetups)';
  assert.equal(absolutize(md), md);
});
