// Ligação direta para a API global, ignorando totalmente o Render
const DIRECT_API_URL = 'https://alltube.herokuapp.com/json?url=https://www.youtube.com/watch?v=';

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
        // Chamada da nova função direta para limpar o cache antigo por completo
        const data = await executarExtracaoDireta(videoId); 
        renderResult(data);
    } catch (err) {
        console.error("Erro capturado no submit:", err);
        showError('Erro ao extrair mídias. Tente novamente ou mude o link.');
    } finally {
        showLoader(false);
    }
});

// Nova função com nome diferente para forçar o navegador a atualizar
async function executarExtracaoDireta(id) {
    const response = await fetch(`${DIRECT_API_URL}${id}`);
    if (!response.ok) {
        throw new Error('Servidor de extração ocupado.');
    }
    const data = await response.json();
    
    // Mapeia os formatos retornados pela API do AllTube
    const videoFormats = data.streams.map(stream => ({
        quality: stream.format || 'MP4',
        url: stream.url
    }));

    return {
        title: data.title || "Vídeo do YouTube",
        thumbnail: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
        duration: "Pronto",
        formats: videoFormats
    };
}

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

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker ativo.', reg))
            .catch(err => console.error('Erro no SW:', err));
    });
}
