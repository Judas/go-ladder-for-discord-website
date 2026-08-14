const express = require('express');
const port = process.env.PORT || 8080;
const app = express();
const { createProxyMiddleware } = require('http-proxy-middleware');

// Proxy to Gold API.
// pathFilter rather than app.use('/api', ...): see the note in server.js -- mounting on a prefix stops pathRewrite
// from matching since http-proxy-middleware 3.
app.use(createProxyMiddleware({
  pathFilter: '/api',
  target: 'http://127.0.0.1:4567',
  changeOrigin: true,
  pathRewrite: { '^/api': '/gold/api' }  // [/api/games] => [$target/gold/api/games]
}));
app.listen(port);