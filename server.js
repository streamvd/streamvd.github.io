const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/api/extract', async (req, res) => {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'O ID do vídeo é obrigatório.' });
    }

    try {
        // Consome uma instância pública e estável do Invidious API
        const response = await fetch(`https://invidious.nerdvpn.de/api/v1/videos/${id}`);
        
        if (!response.ok) {
            throw new Error('Falha ao obter dados da rede de extração.');
        }

        const videoData = await response.json();

        // Filtra e mapeia os formatos de vídeo MP4 direto com áudio
        const formats = videoData.formatStreams
            .filter(f => f.container === 'mp4' || f.type.includes('mp4'))
            .map(f => ({
                quality: f.qualityLabel || f.quality,
                url: f.url // URL direta de streaming direto dos servidores
            }));

        if (formats.length === 0) {
            throw new Error('Nenhum formato MP4 direto disponível para este vídeo.');
        }

        return res.json({
            title: videoData.title,
            thumbnail: videoData.videoThumbnails.find(t => t.quality === 'maxresdefault')?.url || videoData.videoThumbnails[0].url,
            duration: new Date(videoData.lengthSeconds * 1000).toISOString().substr(11, 8),
            formats: formats
        });

    } catch (error) {
        return res.status(500).json({ error: 'Erro de extração estável: ' + error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor a correr na porta ${PORT}`);
});
