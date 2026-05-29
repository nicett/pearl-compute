const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const API_TARGET = 'https://pearl.alphapool.tech';
const STATIC_DIR = __dirname;

// MIME 类型映射
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// 从 Pearl OTC API 获取 PRL 最新成交价
async function fetchPrlPrice() {
  return new Promise((resolve) => {
    const req = https.get('https://api.pearl-otc.com/trades/public/all?limit=1&offset=0', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const trade = json.trades?.[0];
          if (trade?.price_per_prl_usdc) {
            resolve({
              price: parseFloat(trade.price_per_prl_usdc),
              source: 'Pearl OTC',
              tradeId: trade.id,
              tradeTime: trade.completed_at
            });
            return;
          }
        } catch (e) {}
        resolve(null);
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(5000, () => { req.destroy(); resolve(null); });
  });
}

// 代理 API 请求
function proxyRequest(targetPath, res) {
  const apiUrl = `${API_TARGET}${targetPath}`;
  console.log(`[Proxy] ${apiUrl}`);

  const req = https.get(apiUrl, (proxyRes) => {
    let data = '';
    proxyRes.on('data', chunk => data += chunk);
    proxyRes.on('end', async () => {
      try {
        // 尝试注入价格数据
        const json = JSON.parse(data);
        if (json.coins && json.coins[0] && !json.coins[0].price) {
          const priceData = await fetchPrlPrice();
          if (priceData) {
            json.coins[0].price = priceData.price;
            json.priceSource = priceData.source;
            json.tradeId = priceData.tradeId;
            json.tradeTime = priceData.tradeTime;
          }
        }
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.end(JSON.stringify(json));
      } catch (e) {
        // 非 JSON 响应，直接透传
        res.writeHead(proxyRes.statusCode || 200, {
          'Content-Type': proxyRes.headers['content-type'] || 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(data);
      }
    });
  });

  req.on('error', (err) => {
    console.error('[Proxy Error]', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Proxy request failed', message: err.message }));
  });

  req.setTimeout(10000, () => {
    req.destroy();
    res.writeHead(504, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Gateway timeout' }));
  });
}

// 静态文件服务
function serveStaticFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      }
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

// HTTP 服务器
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS 预检请求
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    });
    res.end();
    return;
  }

  // API 代理：/api/* -> pearl.alphapool.tech/api/*
  if (pathname.startsWith('/api/')) {
    const targetPath = pathname.replace('/api', '/api') + (parsedUrl.search || '');
    proxyRequest(targetPath, res);
    return;
  }

  // 静态文件服务
  let filePath = pathname === '/' ? '/code_artifact.html' : pathname;
  filePath = path.join(STATIC_DIR, filePath);

  // 安全检查：防止目录遍历
  if (!filePath.startsWith(STATIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  serveStaticFile(filePath, res);
});

server.listen(PORT, () => {
  console.log(`[Server] 启动成功: http://localhost:${PORT}`);
  console.log(`[Server] API 代理: http://localhost:${PORT}/api/stats -> ${API_TARGET}/api/stats`);
  console.log(`[Server] 静态文件: ${STATIC_DIR}`);
});
