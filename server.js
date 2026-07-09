const express = require('express');
const cors = require('cors');
const { spawn, execFile } = require('child_process');
const path = require('path');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const app = express();
const PORT = process.env.PORT || 3000;

let ytDlpCommand = null;

function resolveYtDlpBinaryCandidates() {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    const userBin = homeDir ? path.join(homeDir, '.local', 'bin', 'yt-dlp') : '';
    const projectVenvBin = path.join(__dirname, '.yt-dlp-venv', process.platform === 'win32' ? 'Scripts' : 'bin', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');

    const candidates = [];

    if (process.env.YT_DLP_BINARY) {
        candidates.push({ command: process.env.YT_DLP_BINARY, args: [] });
    }

    candidates.push({ command: 'yt-dlp', args: [] });
    candidates.push({ command: 'yt-dlp.exe', args: [] });

    if (userBin) {
        candidates.push({ command: userBin, args: [] });
    }

    candidates.push({ command: projectVenvBin, args: [] });
    candidates.push({ command: 'python', args: ['-m', 'yt_dlp'] });
    candidates.push({ command: 'python3', args: ['-m', 'yt_dlp'] });

    return candidates;
}

app.use(cors());
app.use(express.json());

function extractVideoId(url) {
    const regExp = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
    const match = url.match(regExp);
    return match ? match[1] : null;
}

function formatDuration(seconds) {
    if (!seconds || Number.isNaN(Number(seconds))) {
        return 'Disponível';
    }

    const total = Math.floor(Number(seconds));
    const minutes = Math.floor(total / 60);
    const remainingSeconds = total % 60;
    return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function formatBytes(bytes) {
    if (!bytes || Number.isNaN(Number(bytes))) {
        return null;
    }

    const size = Number(bytes);
    if (size < 1024) {
        return `${size} B`;
    }

    const units = ['KB', 'MB', 'GB'];
    let value = size / 1024;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }

    return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

async function detectYtDlp() {
    if (ytDlpCommand) {
        return ytDlpCommand;
    }

    const candidates = resolveYtDlpBinaryCandidates();

    for (const candidate of candidates) {
        try {
            await execFileAsync(candidate.command, [...candidate.args, '--version'], { timeout: 10000 });
            ytDlpCommand = candidate;
            return ytDlpCommand;
        } catch (error) {
            // Tenta o próximo candidato.
        }
    }

    throw new Error('O binário yt-dlp não foi encontrado. Instale o yt-dlp no ambiente do servidor.');
}

async function ensureYtDlpInstalled() {
    try {
        return await detectYtDlp();
    } catch (error) {
        console.log('yt-dlp não encontrado. Tentando instalar automaticamente...');
        await execFileAsync(process.execPath, [path.join(__dirname, 'scripts', 'install-yt-dlp.js')], {
            timeout: 600000,
            maxBuffer: 1024 * 1024 * 32
        });
        return detectYtDlp();
    }
}

app.get('/api/status', (_req, res) => {
    res.json({ ok: true, engine: ytDlpCommand ? ytDlpCommand.command : 'detectando' });
});

app.get('/api/extract', async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'A URL do vídeo é obrigatória.' });
    }

    const videoId = extractVideoId(url);

    if (!videoId) {
        return res.status(400).json({ error: 'URL inválida do YouTube.' });
    }

    try {
        const tool = await ensureYtDlpInstalled();
        const result = await execFileAsync(
            tool.command,
            [
                ...tool.args,
                '--no-warnings',
                '--no-playlist',
                '--extractor-args',
                'youtube:player_client=web',
                '--dump-single-json',
                '--skip-download',
                url
            ],
            {
                timeout: 180000,
                maxBuffer: 1024 * 1024 * 16
            }
        );

        const info = JSON.parse(result.stdout);
        const formats = (info.formats || [])
            .filter((format) => format.vcodec !== 'none' && format.ext)
            .map((format) => ({
                id: format.format_id,
                quality: format.resolution || format.format_note || format.ext.toUpperCase(),
                extension: format.ext,
                filesize: formatBytes(format.filesize || format.filesize_approx),
                downloadUrl: `/api/download?url=${encodeURIComponent(url)}&format=${encodeURIComponent(format.format_id)}`
            }))
            .sort((a, b) => Number(b.quality.match(/(\d+)/)?.[1] || 0) - Number(a.quality.match(/(\d+)/)?.[1] || 0));

        return res.json({
            title: info.title || 'Vídeo do YouTube',
            thumbnail: info.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            duration: formatDuration(info.duration),
            message: 'Processado no servidor com yt-dlp',
            formats: formats.slice(0, 10)
        });
    } catch (error) {
        const message = error.message || '';
        const isBotBlock = /sign in to confirm you’re not a bot|sign in to confirm you're not a bot|bot/i.test(message);

        return res.status(500).json({
            error: isBotBlock
                ? 'O YouTube bloqueou a extração deste vídeo como tentativa automática. A solução exige autenticação ou cookies válidos.'
                : 'Não foi possível processar o vídeo no servidor. ' + message
        });
    }
});

app.get('/api/download', async (req, res) => {
    const { url, format } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'A URL do vídeo é obrigatória.' });
    }

    try {
        const tool = await ensureYtDlpInstalled();
        const child = spawn(
            tool.command,
            [
                ...tool.args,
                '--no-warnings',
                '--no-playlist',
                '--no-part',
                '-f',
                format || 'best',
                '-o',
                '-',
                url
            ],
            {
                stdio: ['ignore', 'pipe', 'pipe']
            }
        );

        let stderr = '';

        child.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
        });

        child.on('error', () => {
            if (!res.headersSent) {
                res.status(500).json({ error: 'Falha ao iniciar o download no servidor.' });
            }
        });

        child.on('exit', (code) => {
            if (code !== 0 && !res.headersSent) {
                res.status(500).json({ error: stderr || 'Falha ao gerar o arquivo.' });
            }
        });

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Content-Disposition', 'attachment; filename="youtube-video.mp4"');
        child.stdout.pipe(res);
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao preparar o download: ' + error.message });
    }
});

ensureYtDlpInstalled()
    .then((tool) => {
        console.log(`yt-dlp pronto em: ${tool.command}`);
        app.listen(PORT, () => {
            console.log(`Servidor rodando na porta ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Falha ao preparar yt-dlp no startup:', error.message);
        app.listen(PORT, () => {
            console.log(`Servidor rodando na porta ${PORT}`);
        });
    });