// Usando uma instância pública direta da API do Invidious que suporta CORS nativo
const API_URL = 'https://yewtu.be/api/v1/videos/';

const form = document.getElementById('extractor-form');
const urlInput = document.getElementById('youtube-url');
const errorMsg = document.getElementById('input-error');
const loader = document.getElementById('loader');
const resultContainer = document.getElementById('result-container');

// Seletores do Card de Resultado
const videoThumb = document.getElementById('video-thumb');
const videoDuration = document.getElementById('video-duration');
const videoTitle = document.getElementById('video-title');
const resolutionsGrid = document.getElementById('resolutions-grid');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    resetState();
    
    const url = urlInput.value.trim();
    const videoId = extractVideoId(url);

    if (!videoId) {
        showError('URL Inválida. Insira um link válido do YouTube.');
        return;
    }

    showLoader(true);

    try {
        // Faz a requisição direta do seu navegador para a API estável
        const response = await fetch(`${API_URL}${videoId}`);
        
        if (!response.ok) {
            throw new Error('Servidor ocupado. Tente novamente.');
        }

        const data = await response.json();
        
        // Formata os dados recebidos para o padrão do seu layout
        const formattedData = {
            title: data.title,
            thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            duration: new Date(data.lengthSeconds * 1000).toISOString().substr(11, 8),
            formats: data.formatStreams.map(f => ({
                quality: f.qualityLabel || f.quality || '360p',
                url: f.url
            }))
        };

        renderResult(formattedData);
    } catch (err) {
        console.error(err);
        showError('Erro ao extrair as mídias deste vídeo. Tente outro link ou aguarde um momento.');
    } finally {
        showLoader(false);
    }
});

function extractVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function showError(msg) {
    errorMsg.textContent = msg;
}

function resetState() {
    errorMsg.textContent = '';
    resultContainer.classList.add('hidden');
}

function showLoader(show) {
    if (show) {
        loader.classList.remove('hidden');
    } else {
        loader.classList.add('hidden');
    }
}

function renderResult(data) {
    videoThumb.src = data.thumbnail;
    videoDuration.textContent = data.duration;
    videoTitle.textContent = data.title;
    
    resolutionsGrid.innerHTML = '';
    
    data.formats.forEach(format => {
        const row = document.createElement('div');
        row.className = 'download-row';
        
        row.innerHTML = `
            <span class="quality-tag">${format.quality}</span>
            <a href="${format.url}" class="btn-download" download="${data.title}-${format.quality}.mp4" target="_blank" rel="noopener">
                Download
            </a>
        `;
        resolutionsGrid.appendChild(row);
    });

    resultContainer.classList.remove('hidden');
}

// Registar o Service Worker para suporte PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registado com sucesso!', reg))
            .catch(err => console.error('Erro ao registar o Service Worker:', err));
    });
}
