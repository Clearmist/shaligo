import http from 'node:http';

// Minimal HTTP test double: starts a real server on a random port and logs
// every request it receives so tests can assert on headers/paths/query.
export function startServer(handler) {
  const requests = [];
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    requests.push({ method: req.method, pathname: url.pathname, url, headers: req.headers });
    handler(req, res, url);
  });

  return new Promise((resolve) => {
    server.listen(0, () => {
      resolve({
        baseUrl: `http://localhost:${server.address().port}`,
        requests,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

export function rateLimitHeaders({
  burstRemaining = 19,
  burstLimit = 20,
  burstResetIn = 60,
  sustainedRemaining = 4999,
  sustainedLimit = 5000,
  sustainedResetIn = 86400,
} = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    'X-RateLimit-Burst-Limit': String(burstLimit),
    'X-RateLimit-Burst-Remaining': String(burstRemaining),
    'X-RateLimit-Burst-Reset': String(now + burstResetIn),
    'X-RateLimit-Sustained-Limit': String(sustainedLimit),
    'X-RateLimit-Sustained-Remaining': String(sustainedRemaining),
    'X-RateLimit-Sustained-Reset': String(now + sustainedResetIn),
  };
}

export function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
}
