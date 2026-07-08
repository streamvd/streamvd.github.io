const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Libera totalmente o acesso para o seu PWA no GitHub Pages
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
        // O servidor do Render faz a ponte segura com o processador de mídias
        const cobaltResponse = await fetch('https://api.cobalt.tools/api/json', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: `https://www.youtube.com/watch?v=${id}`,
                vQuality: '720',
                isAudioMuted: false
            })
        });

        const cobaltData = await cobaltResponse.json();

        if (cobaltData.status === 'error' || !cobaltData.url) {
            throw new Error(cobaltData.text || 'Erro no processador externo.');
        }

        // Devolve os dados limpos para o seu PWA
        return res.json({
            title: cobaltData.filename || "YouTube Video",
            thumbnail: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
            url: cobaltData.url
        });

    } catch (error) {
        return res.status(500).json({ error: 'Falha na extração do stream: ' + error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
