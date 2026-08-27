import assert from 'node:assert/strict';
import test from 'node:test';

test('builds the API proxy and SPA fallback from API_ORIGIN', async () => {
  process.env.API_ORIGIN = 'https://api.example.test';

  const { config } = await import('./vercel.mjs');

  assert.deepEqual(config.rewrites, [
    {
      source: '/api/:path*',
      destination: 'https://api.example.test/api/:path*',
    },
    {
      source: '/(.*)',
      destination: '/index.html',
    },
  ]);
});
