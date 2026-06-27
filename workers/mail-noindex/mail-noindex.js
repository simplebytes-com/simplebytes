const ROBOTS = `User-agent: *
Allow: /
`;

function withNoindexHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/robots.txt') {
      return new Response(ROBOTS, {
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'cache-control': 'public, max-age=3600',
          'X-Robots-Tag': 'noindex, nofollow, noarchive',
        },
      });
    }

    const response = await fetch(request);
    return withNoindexHeaders(response);
  },
};
