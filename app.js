const DEFAULT_API_BASE_URL = window.location.hostname === 'streamvd.github.io'
    ? 'https://streamvd-github-io.onrender.com'
    : '';
const API_URL = `${(window.STREAMFETCH_API_BASE_URL || DEFAULT_API_BASE_URL || '').replace(/\/$/, '')}/api/extract` || '/api/extract';

const form = document.getElementById('extractor-form');
const urlInput = document.getElementById('youtube-url');
const errorMsg = document.getElementById('input-error');
const loader = document.getElementById('loader');
const resultContainer = document.getElementById('result-container');

const videoThumb = document.getElementById('video-thumb');
const videoDuration = document.getElementById('video-duration');
const videoTitle = document.getElementById('video-title');
const videoStatus = document.getElementById('video-status');
const resolutionsGrid = document.getElementById('resolutions-grid');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    resetState();

    const url = urlInput.value.trim();

    if (!url) {
        showError('Insira uma URL válida do YouTube.');
        return;
    }

    const videoId = extractVideoId(url);

    if (!videoId) {
        showError('URL inválida. Use um link do YouTube como https://youtu.be/....');
        return;
    }

    showLoader(true);

    try {
        const data = await fetchFromServer(url);
        renderResult(data);
    } catch (err) {
        console.error(err);
        const message = err.message || 'Não foi possível processar o vídeo no servidor.';
        showError(message);
    } finally {
        showLoader(false);
    }
});

async function fetchFromServer(url) {
    const response = await fetch(`${API_URL}?url=${encodeURIComponent(url)}`);
    const text = await response.text();

    let data = {};
    if (text) {
        try {
            data = JSON.parse(text);
        } catch (error) {
            throw new Error(`Resposta inválida do servidor (${response.status}). Verifique se a API está online.`);
        }
    }

    if (!response.ok) {
        throw new Error(data.error || `Erro na requisição da API (${response.status}).`);
    }

    return data;
}

function extractVideoId(url) {
    const regExp = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
    const match = url.match(regExp);
    return match ? match[1] : null;
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
    videoThumb.src = data.thumbnail || '';
    videoDuration.textContent = data.duration || 'Disponível';
    videoTitle.textContent = data.title || 'Vídeo do YouTube';
    videoStatus.textContent = data.message || 'Processado no servidor';

    resolutionsGrid.innerHTML = '';

    if (!Array.isArray(data.formats) || data.formats.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.textContent = 'Nenhuma opção de mídia foi encontrada para este vídeo.';
        resolutionsGrid.appendChild(emptyState);
        resultContainer.classList.remove('hidden');
        return;
    }

    data.formats.forEach((format) => {
        const row = document.createElement('div');
        row.className = 'download-row';

        const meta = document.createElement('div');
        meta.className = 'format-meta';

        const qualityTag = document.createElement('span');
        qualityTag.className = 'quality-tag';
        qualityTag.textContent = format.quality;

        const details = document.createElement('span');
        details.className = 'format-details';
        details.textContent = [format.extension, format.filesize].filter(Boolean).join(' • ');

        meta.appendChild(qualityTag);
        meta.appendChild(details);

        const downloadLink = document.createElement('a');
        downloadLink.className = 'btn-download';
        downloadLink.href = format.downloadUrl || '#';
        downloadLink.target = '_blank';
        downloadLink.rel = 'noopener';
        downloadLink.textContent = 'Baixar';

        row.appendChild(meta);
        row.appendChild(downloadLink);
        resolutionsGrid.appendChild(row);
    });

    resultContainer.classList.remove('hidden');
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then((reg) => console.log('Service Worker registado com sucesso!', reg))
            .catch((err) => console.error('Erro ao registar o Service Worker:', err));
    });
}