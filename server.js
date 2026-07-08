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
        const videoUrl = `https://www.youtube.com/watch?v=${id}`;
        
        // Faz o túnel seguro usando uma instância pública estável do Cobalt API
        const cobaltResponse = await fetch('https://api.cobalt.tools/api/json', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: videoUrl,
                vQuality: '720', // Força uma qualidade estável e otimizada com áudio embutido
                isAudioMuted: false
            })
        });

        const cobaltData = await cobaltResponse.json();

        if (cobaltData.status === 'error') {
            throw new Error(cobaltData.text);
        }

        // Formata a resposta padrão que o seu PWA espera ler
        return res.json({
            title: cobaltData.filename || "YouTube Video",
            thumbnail: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
            duration: "Disponível",
            formats: [
                { quality: "720p HD", url: cobaltData.url }
            ]
        });

    } catch (error) {
        return res.status(500).json({ error: 'Erro ao processar bypass do YouTube: ' + error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
