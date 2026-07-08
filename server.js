const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');

const app = express();
const PORT = process.env.PORT || 3000;

// Permite que o seu PWA aceda a esta API de qualquer origem
app.use(cors());

app.get('/api/extract', async (req, res) => {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'O ID do vídeo é obrigatório.' });
    }

    try {
        const videoUrl = `https://www.youtube.com/watch?v=${id}`;
        
        // Obtém informações detalhadas do vídeo
        const info = await ytdl.getInfo(videoUrl);
        
        // Filtra formatos MP4 que contenham vídeo
        const formats = info.formats
            .filter(f => f.container === 'mp4' && f.hasVideo)
            .map(f => ({
                quality: f.qualityLabel || '360p',
                url: f.url
            }));

        // Remove duplicados de resolução se existirem
        const uniqueFormats = formats.filter((v, i, a) => a.findIndex(t => t.quality === v.quality) === i);

        return res.json({
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url,
            duration: new Date(info.videoDetails.lengthSeconds * 1000).toISOString().substr(11, 8),
            formats: uniqueFormats
        });

    } catch (error) {
        return res.status(500).json({ error: 'Erro ao processar o vídeo: ' + error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor a correr na porta ${PORT}`);
});
