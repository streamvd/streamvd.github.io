const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

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
        // Consome a API pública do picoStream que gera downloads diretos limpos
        const response = await fetch(`https://api.picostream.org/download?id=${id}`);
        
        if (!response.ok) {
            throw new Error('Servidor de download saturado.');
        }

        const data = await response.json();

        // Mapeia as resoluções reais retornadas (ex: 1080p, 720p, 360p)
        // Adiciona a flag de download direto na URL gerada pela API
        const formats = data.links.map(link => ({
            quality: link.quality,
            url: link.url.includes('?') ? `${link.url}&download=1` : `${link.url}?download=1`
        }));

        return res.json({
            title: data.title || "YouTube Video",
            thumbnail: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
            duration: data.duration || "Pronto",
            formats: formats
        });

    } catch (error) {
        // Fallback limpo de download via gateway alternativo sem captcha
        return res.json({
            title: "Vídeo do YouTube",
            thumbnail: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
            duration: "Pronto",
            formats: [
                { quality: "720p HD (Direto)", url: `https://loader.to/api/button/?url=https://www.youtube.com/watch?v=${id}&f=720` },
                { quality: "360p SD (Direto)", url: `https://loader.to/api/button/?url=https://www.youtube.com/watch?v=${id}&f=360` }
            ]
        });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
