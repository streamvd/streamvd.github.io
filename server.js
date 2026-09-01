const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 3000;
const TARGET_URL = 'https://www.skyradio.nl/playlist/love-songs';

function fetchPlaylistHtml(url = TARGET_URL) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve(fetchPlaylistHtml(new URL(res.headers.location, url).toString()));
        return;
      }

      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        resolve(data);
      });
    });

    req.on('error', reject);
  });
}

function decodeEscaped(value) {
  return String(value || '')
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\n/g, ' ')
    .replace(/\\\//g, '/');
}

function normalizeTrackText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function extractTrackFromHtml(html) {
  const matches = [...html.matchAll(/"track"\s*:\s*\{[^]*?"type"\s*:\s*"track"[^]*?"title"\s*:\s*"((?:\\.|[^"\\])*)"[^]*?"artistName"\s*:\s*"((?:\\.|[^"\\])*)"[^]*?"imageUrl"\s*:\s*"((?:\\.|[^"\\])*)"/g)];

  for (const match of matches) {
    const title = normalizeTrackText(decodeEscaped(match[1]));
    const artist = normalizeTrackText(decodeEscaped(match[2]));
    const cover = normalizeTrackText(decodeEscaped(match[3]));

    if (title && artist) {
      return { title, artist, cover: cover || '/img/album.webp' };
    }
  }

  return null;
}

const server = http.createServer(async (req, res) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8'
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  if (req.url === '/api/nowplaying' || req.url.startsWith('/api/nowplaying?')) {
    try {
      const html = await fetchPlaylistHtml();
      const track = extractTrackFromHtml(html);

      res.writeHead(200, headers);
      res.end(JSON.stringify(track || {
        title: 'Carregando...',
        artist: 'Carregando...',
        cover: '/img/album.webp'
      }));
    } catch (error) {
      console.error('Erro ao buscar metadados:', error);
      res.writeHead(200, headers);
      res.end(JSON.stringify({
        title: 'Carregando...',
        artist: 'Carregando...',
        cover: '/img/album.webp'
      }));
    }
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Render backend ok. Use /api/nowplaying');
});

server.listen(PORT, () => {
  console.log(`Servidor pronto em http://localhost:${PORT}`);
});
