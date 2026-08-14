const express = require('express');
const path = require('path');
const port = process.env.PORT || 8080;
const app = express();
const { createProxyMiddleware } = require('http-proxy-middleware');

// Proxy to Gold API.
// Selected with pathFilter rather than mounted on app.use('/api', ...): since http-proxy-middleware 3, mounting
// strips the prefix before the middleware sees the URL, so the '^/api' rewrite below never matched and requests
// reached the backend as /api/... -- a 404 on every call.
app.use(createProxyMiddleware({
  pathFilter: '/api',
  target: 'http://87.106.194.190:4567',
  changeOrigin: true,
  pathRewrite: { '^/api': '/gold/api' }  // [/api/games] => [$target/gold/api/games]
}));

// Serve the build directory as static files
app.use(express.static(path.join(__dirname, 'build')));

// For all other paths, serve index.html.
// The wildcard has to be named since Express 5 (path-to-regexp 8): a bare '/*' throws at startup.
app.get('/*splat', function (req, res) {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});
app.listen(port);