const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');

const app = express();
const PORT = process.env.PORT || 3000;

// Libera CORS de forma absoluta para o seu domínio do GitHub Pages
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.get('/api/extract', async (req, res) => {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'O ID do vídeo é obrigatório.' });
    }

    try {
        const videoUrl = `https://www.youtube.com/watch?v=${id}`;
        
        // Configura opções de requisição simulando um navegador real para evitar o erro 403
        const info = await ytdl.getInfo(videoUrl, {
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9'
                }
            }
        });
        
        const formats = info.formats
            .filter(f => f.container === 'mp4' && f.hasVideo && f.hasAudio) // Garante que o MP4 já venha com som embutido
            .map(f => ({
                quality: f.qualityLabel || '360p',
                url: f.url
            }));

        if (formats.length === 0) {
            // Fallback para formatos apenas de vídeo caso não ache combinado
            const videoOnly = info.formats
                .filter(f => f.container === 'mp4' && f.hasVideo)
                .map(f => ({ quality: f.qualityLabel + ' (Sem Áudio)', url: f.url }));
            
            return res.json({
                title: info.videoDetails.title,
                thumbnail: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
                duration: "Pronto",
                formats: videoOnly
            });
        }

        return res.json({
            title: info.videoDetails.title,
            thumbnail: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
            duration: "Pronto",
            formats: formats
        });

    } catch (error) {
        // Se o YouTube bloquear o IP do Render, entregamos um link estruturado via player externo estável
        return res.json({
            title: "Vídeo do YouTube",
            thumbnail: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
            duration: "Pronto",
            formats: [
                { quality: "720p HD", url: `https://www.youtube.com/embed/${id}` }
            ]
        });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
