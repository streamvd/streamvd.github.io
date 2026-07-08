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
        // API direta que retorna o stream sem redirecionamentos de anúncios
        const response = await fetch(`https://api.cobalt.tools/api/json`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: `https://www.youtube.com/watch?v=${videoId}`,
                vQuality: '720',
                isAudioMuted: false
            })
        });

        const data = await response.json();
        if (data.status === 'error' || !data.url) throw new Error();

        renderResult({
            title: data.filename || 'video',
            thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            duration: 'Disponível',
            url: data.url
        });
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

function showError(msg) { errorMsg.textContent = msg; }
if (typeof resetState !== 'function') { function resetState() { errorMsg.textContent = ''; resultContainer.classList.add('hidden'); } }
function showLoader(show) { loader.classList.toggle('hidden', !show); }

function renderResult(data) {
    videoThumb.src = data.thumbnail;
    videoDuration.textContent = data.duration;
    videoTitle.textContent = data.title;
    resolutionsGrid.innerHTML = '';
    
    const row = document.createElement('div');
    row.className = 'download-row';
    
    const btn = document.createElement('button');
    btn.className = 'btn-download';
    btn.textContent = 'Baixar MP4 Agora';
    
    // Força o navegador a baixar em background como Blob para evitar abrir nova aba/anúncio
    btn.addEventListener('click', async () => {
        btn.textContent = 'Baixando...';
        btn.disabled = true;
        try {
            const res = await fetch(data.url);
            const blob = await res.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `${data.title}.mp4`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (e) {
            alert('Falha ao salvar o arquivo.');
        } finally {
            btn.textContent = 'Baixar MP4 Agora';
            btn.disabled = false;
        }
    });

    row.appendChild(btn);
    resolutionsGrid.appendChild(row);
    resultContainer.classList.remove('hidden');
}
