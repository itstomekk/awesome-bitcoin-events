// robots.txt and llms.txt generators (src/pages/robots.txt.js, src/pages/llms.txt.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { robotsTxt } from '../src/pages/robots.txt.js';
import { llmsTxt } from '../src/pages/llms.txt.js';

test('robots.txt allows crawling, states the AI policy and names the sitemap', () => {
  const txt = robotsTxt('https://example.org/sitemap.xml');
  assert.match(txt, /^User-agent: \*\nAllow: \/\nContent-Signal: search=yes, ai-input=yes, ai-train=yes\n/);
  assert.match(txt, /Sitemap: https:\/\/example\.org\/sitemap\.xml\n$/);
});

test('llms.txt has a title, a summary and absolute links', () => {
  const txt = llmsTxt('https://example.org/');
  assert.match(txt, /^# Awesome Bitcoin Events\n\n> /);
  assert.match(txt, /\(https:\/\/example\.org\/index\.md\)/);
  assert.match(txt, /\(https:\/\/example\.org\/sitemap\.xml\)/);
  assert.doesNotMatch(txt, /\]\((?!https?:)/);
});
