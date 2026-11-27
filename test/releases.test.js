import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchLatestAssets } from '../lib/releases.js';

function stubFetch(impl) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (...args) => {
    calls.push(args);
    return impl(...args);
  };
  return {
    calls,
    restore() {
      globalThis.fetch = original;
    },
  };
}

function okResponse(body) {
  return { ok: true, json: async () => body };
}

test('fetchLatestAssets passes an AbortSignal timeout to fetch (P2-3)', async () => {
  const stub = stubFetch(() => okResponse({ assets: [], tag_name: 'v1.0.0' }));
  try {
    await fetchLatestAssets('bayernjf/soft-desk', { mac: '.dmg' });
  } finally {
    stub.restore();
  }
  const options = stub.calls[0][1];
  assert.ok(options.signal instanceof AbortSignal, 'fetch must carry an AbortSignal');
  assert.equal(options.signal.aborted, false);
});

test('fetchLatestAssets resolves platform assets from the latest release', async () => {
  const stub = stubFetch(() =>
    okResponse({
      tag_name: 'v1.2.0',
      published_at: '2026-11-01T00:00:00Z',
      assets: [
        { name: 'app-mac.dmg', browser_download_url: 'https://example.com/app.dmg', size: 1024 },
        { name: 'app-win.exe', browser_download_url: 'https://example.com/app.exe', size: 2048 },
      ],
    }),
  );
  try {
    const r = await fetchLatestAssets('bayernjf/soft-desk', { mac: '.dmg', win: '.exe' });
    assert.equal(r.error, false);
    assert.equal(r.version, 'v1.2.0');
    assert.equal(r.assets.mac.url, 'https://example.com/app.dmg');
    assert.equal(r.assets.win.size, 2048);
  } finally {
    stub.restore();
  }
});

test('fetchLatestAssets degrades to error:true on HTTP failure', async () => {
  const stub = stubFetch(() => ({ ok: false, status: 403 }));
  try {
    const r = await fetchLatestAssets('bayernjf/soft-desk', { mac: '.dmg' });
    assert.equal(r.error, true);
    assert.equal(r.assets.mac, null);
  } finally {
    stub.restore();
  }
});

test('fetchLatestAssets degrades to error:true when fetch aborts', async () => {
  const stub = stubFetch(() => {
    throw new DOMException('The operation timed out.', 'TimeoutError');
  });
  try {
    const r = await fetchLatestAssets('bayernjf/soft-desk', { mac: '.dmg' });
    assert.equal(r.error, true);
    assert.equal(r.version, null);
  } finally {
    stub.restore();
  }
});
