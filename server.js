const express = require('express');
const path = require('path');
const port = process.env.PORT || 8080;
const app = express();
const { createProxyMiddleware } = require('http-proxy-middleware');
// proxy to gold API
app.use('/api', createProxyMiddleware({ 
  target: 'http://87.106.194.190:4567/', 
  changeOrigin: true,
  pathRewrite: {
    '^/api': '', // remove base path
  }
}))
// Serve the React Build
// Serve the build directory as static files
app.use(express.static(path.join(__dirname, 'build')));
// For all other paths, serve index.html
app.get('/*', function (req, res) {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});
app.listen(port);