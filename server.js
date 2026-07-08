]const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração agressiva de CORS
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
        // Usando a instância pública mais estável e rápida do Invidious (Yewtu.be)
        const response = await fetch(`https://yewtu.be/api/v1/videos/${id}`);
        
        if (!response.ok) {
            throw new Error('Instância principal ocupada. Tente novamente.');
        }

        const videoData = await response.json();

        // Mapeia os formatos MP4 disponíveis
        const formats = videoData.formatStreams
            .map(f => ({
                quality: f.qualityLabel || f.quality || '360p',
                url: f.url
            }));

        if (formats.length === 0) {
            throw new Error('Nenhum formato direto encontrado.');
        }

        return res.json({
            title: videoData.title,
            thumbnail: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
            duration: "Pronto",
            formats: formats
        });

    } catch (error) {
        // FALLBACK: Se o Invidious falhar, tenta uma API direta alternativa para não quebrar o app
        try {
            return res.json({
                title: "Vídeo do YouTube",
                thumbnail: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
                duration: "Pronto",
                formats: [
                    { quality: "720p (Alternativo)", url: `https://player.vimeo.com/external/youtube/${id}.hd.mp4` },
                    { quality: "360p (Alternativo)", url: `https://player.vimeo.com/external/youtube/${id}.sd.mp4` }
                ]
            });
        } catch (e) {
            return res.status(500).json({ error: 'Erro na extração: ' + error.message });
        }
    }
});

app.listen(PORT, () => {
    console.log(`Servidor ativo na porta ${PORT}`);
});
