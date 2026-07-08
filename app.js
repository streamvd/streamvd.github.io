const API_URL = 'https://streamvd-github-io.onrender.com/api/extract';

const form = document.getElementById('extractor-form');
const urlInput = document.getElementById('youtube-url');
const errorMsg = document.getElementById('input-error');
const loader = document.getElementById('loader');
const resultContainer = document.getElementById('result-container');

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
        const response = await fetch(`${API_URL}?id=${videoId}`);
        if (!response.ok) throw new Error('Erro na resposta do servidor.');
        
        const data = await response.json();
        renderResult(data);
    } catch (err) {
        console.error(err);
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

function showError(msg) { errorMsg.textContent = msg; }
function resetState() { errorMsg.textContent = ''; resultContainer.classList.add('hidden'); }
 paradoxo
function showLoader(show) { loader.classList.toggle('hidden', !show); }

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
            <a href="${format.url}" class="btn-download" target="_blank" rel="noopener" download>
                Download
            </a>
        `;
        resolutionsGrid.appendChild(row);
    });
    resultContainer.classList.remove('hidden');
}
