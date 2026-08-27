function readApiOrigin() {
  const value = process.env.API_ORIGIN;

  if (!value) {
    throw new Error('API_ORIGIN must be configured for this deployment.');
  }

  const url = new URL(value);

  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('API_ORIGIN must be an HTTP(S) origin without a path.');
  }

  return url.origin;
}

const apiOrigin = readApiOrigin();

export const config = {
  rewrites: [
    {
      source: '/api/:path*',
      destination: `${apiOrigin}/api/:path*`,
    },
    {
      source: '/(.*)',
      destination: '/index.html',
    },
  ],
};
