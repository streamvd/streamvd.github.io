const API_ENDPOINT = 'https://sua-futura-api.vercel.app/api/extract'; // Substitua pelo endpoint real da API

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
        // Simulação de chamada de API. Substitua pelo fetch real quando o backend estiver pronto.
        const data = await mockApiCall(videoId); 
        renderResult(data);
    } catch (err) {
        showError('Erro ao processar o vídeo. Tente novamente.');
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

// Mock temporário para simular o comportamento estrutural do JSON retornado pelo backend
function mockApiCall(id) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                title: "Como criar PWAs modernos de alta performance",
                thumbnail: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
                duration: "12:34",
                formats: [
                    { quality: "1080p", url: "#" },
                    { quality: "720p", url: "#" },
                    { quality: "480p", url: "#" },
                    { quality: "360p", url: "#" }
                ]
            });
        }, 1500);
    });
}
// Registar o Service Worker para suporte PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registado com sucesso!', reg))
            .catch(err => console.error('Erro ao registar o Service Worker:', err));
    });
}
