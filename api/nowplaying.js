const http = require('http');
const https = require('https');

const PORT = 3000;
const TARGET_URL = 'https://www.skyradio.nl/playlist/love-songs';

function fetchPlaylistHtml() {
  return new Promise((resolve, reject) => {
    const req = https.get(TARGET_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, TARGET_URL).toString();
        fetchPlaylistHtmlFromUrl(redirectUrl).then(resolve).catch(reject);
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

function fetchPlaylistHtmlFromUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    }, (res) => {
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

function extractTrackFromHtml(html) {
  const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*type="application\/json">([\s\S]*?)<\/script>/i);

  if (nextDataMatch) {
    try {
      const payload = JSON.parse(nextDataMatch[1]);
      const groups = payload?.props?.pageProps?.initialPlaylist || [];

      for (const group of groups) {
        if (!Array.isArray(group)) continue;

        for (const item of group) {
          const track = item?.track || item;
          const title = decodeEscaped(track?.title || '').replace(/\s+/g, ' ').trim();
          const artist = decodeEscaped(track?.artistName || '').replace(/\s+/g, ' ').trim();
          const cover = decodeEscaped(track?.imageUrl || '').replace(/\s+/g, ' ').trim();

          if (title && artist && cover) {
            return { title, artist, cover };
          }
        }
      }
    } catch (error) {
      console.warn('Falha ao parsear __NEXT_DATA__:', error);
    }
  }

  const matches = [...html.matchAll(/"track"\s*:\s*\{[^]*?"type"\s*:\s*"track"[^]*?"title"\s*:\s*"((?:\\.|[^"\\])*)"[^]*?"artistName"\s*:\s*"((?:\\.|[^"\\])*)"[^]*?"imageUrl"\s*:\s*"((?:\\.|[^"\\])*)"/g)];

  for (const match of matches) {
    const title = decodeEscaped(match[1]).replace(/\s+/g, ' ').trim();
    const artist = decodeEscaped(match[2]).replace(/\s+/g, ' ').trim();
    const cover = decodeEscaped(match[3]).replace(/\s+/g, ' ').trim();

    if (title && artist && cover) {
      return { title, artist, cover };
    }
  }

  return null;
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/api/nowplaying' || req.url.startsWith('/api/nowplaying?')) {
    try {
      const html = await fetchPlaylistHtml();
      const track = extractTrackFromHtml(html);

      if (!track) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ title: 'Carregando...', artist: 'Carregando...', cover: '/img/album.webp' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        title: track.title,
        artist: track.artist,
        cover: track.cover || '/img/album.webp'
      }));
    } catch (error) {
      console.error('Erro ao buscar now playing:', error);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ title: 'Carregando...', artist: 'Carregando...', cover: '/img/album.webp' }));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Proxy de metadata em execução em http://127.0.0.1:${PORT}`);
});
