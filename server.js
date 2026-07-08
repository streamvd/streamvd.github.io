const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));

app.get('/api/extract', async (req, res) => {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'ID obrigatório.' });

    try {
        // Rotação de instâncias públicas para evitar bloqueios de IP
        const instances = ['https://iv.melmac.space', 'https://yewtu.be', 'https://invidious.nerdvpn.de'];
        let videoData = null;

        for (const instance of instances) {
            try {
                const response = await fetch(`${instance}/api/v1/videos/${id}`);
                if (response.ok) {
                    videoData = await response.json();
                    break;
                }
            } catch (e) { continue; }
        }

        if (!videoData) throw new Error('Todas as instâncias estão ocupadas.');

        const formats = videoData.formatStreams
            .filter(f => f.container === 'mp4' || f.type.includes('mp4'))
            .map(f => ({
                quality: f.qualityLabel || f.quality || '360p',
                // Proxy CORS gratuito para o tráfego do arquivo
                url: `https://cors-anywhere.herokuapp.com/${f.url}`
            }));

        return res.json({
            title: videoData.title,
            thumbnail: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
            formats: formats
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => console.log(`Servidor ativo na porta ${PORT}`));
