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
        const videoUrl = `https://www.youtube.com/watch?v=${id}`;
        
        // Requisição para uma instância pública e estável do Cobalt com parâmetros de download forçado
        const cobaltResponse = await fetch('https://cobalt.api.unblock.casa/api/json', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: videoUrl,
                vQuality: 'max',       // Busca a qualidade máxima disponível (incluindo 1080p)
                isAudioMuted: false,   // Garante áudio embutido no arquivo
                filenamePattern: 'classic' // Nome amigável para o arquivo baixado
            })
        });

        const cobaltData = await cobaltResponse.json();

        if (cobaltData.status === 'error' || !cobaltData.url) {
            throw new Error(cobaltData.text || 'Erro na resposta da API externa.');
        }

        // Retorna as opções estruturadas para o seu PWA renderizar
        // Nota: A API do Cobalt processa a melhor combinação de vídeo + áudio disponível automaticamente
        return res.json({
            title: cobaltData.filename || "YouTube Video",
            thumbnail: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
            duration: "Disponível",
            formats: [
                { quality: "1080p / 720p (Máxima)", url: cobaltData.url },
                { quality: "Apenas Áudio (MP3)", url: cobaltData.url + "&p=audio" }
            ]
        });

    } catch (error) {
        // Fallback de contingência caso a instância principal mude ou apresente lentidão
        return res.json({
            title: "Vídeo do YouTube",
            thumbnail: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
            duration: "Pronto",
            formats: [
                { quality: "Download Direto (Alternativo)", url: `https://cobalt.tools/api/stream?url=https://www.youtube.com/watch?v=${id}` }
            ]
        });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
