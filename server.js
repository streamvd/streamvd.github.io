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
        // Consome uma das instâncias globais mais estáveis do Invidious
        const response = await fetch(`https://iv.melmac.space/api/v1/videos/${id}`);
        
        if (!response.ok) {
            throw new Error('Instância temporariamente ocupada.');
        }

        const videoData = await response.json();

        // Filtra e mapeia as resoluções disponíveis garantindo o parâmetro de download forçado
        const formats = videoData.formatStreams
            .map(f => {
                const qualityLabel = f.qualityLabel || f.quality || '360p';
                // O truque está aqui: concatenar &download=true força o navegador a baixar em vez de reproduzir
                const downloadUrl = f.url.includes('?') ? `${f.url}&download=true` : `${f.url}?download=true`;
                
                return {
                    quality: qualityLabel.includes('p') ? qualityLabel : `${qualityLabel}p`,
                    url: downloadUrl
                };
            });

        if (formats.length === 0) {
            throw new Error('Nenhum formato de download direto disponível.');
        }

        return res.json({
            title: videoData.title || "YouTube Video",
            thumbnail: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
            duration: new Date(videoData.lengthSeconds * 1000).toISOString().substr(11, 8),
            formats: formats
        });

    } catch (error) {
        // Fallback seguro caso a instância principal falhe, usando outra da rede descentralizada
        return res.json({
            title: "Vídeo do YouTube",
            thumbnail: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
            duration: "Pronto",
            formats: [
                { quality: "720p HD (Alternativo)", url: `https://yewtu.be/latest_version?id=${id}&itag=22&local=true&download=true` },
                { quality: "360p SD (Alternativo)", url: `https://yewtu.be/latest_version?id=${id}&itag=18&local=true&download=true` }
            ]
        });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
