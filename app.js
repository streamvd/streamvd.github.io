const API_URL = 'https://streamvd-github-io.onrender.com/api/extract';

const form = document.getElementById('extractor-form');
const urlInput = document.getElementById('youtube-url');
const errorMsg = document.getElementById('input-error');
const loader = document.getElementById('loader');
const resultContainer = document.getElementById('result-container');

const videoThumb = document.getElementById('video-thumb');
const videoTitle = document.getElementById('video-title');
const resolutionsGrid = document.getElementById('resolutions-grid');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.textContent = '';
    resultContainer.classList.add('hidden');
    
    const url = urlInput.value.trim();
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    const videoId = (match && match[2].length === 11) ? match[2] : null;

    if (!videoId) {
        errorMsg.textContent = 'URL Inválida.';
        return;
    }

    loader.classList.remove('hidden');

    try {
        const response = await fetch(`${API_URL}?id=${videoId}`);
        if (!response.ok) throw new Error();
        const data = await response.json();
        
        videoThumb.src = data.thumbnail;
        videoTitle.textContent = data.title;
        resolutionsGrid.innerHTML = '';
        
        data.formats.forEach(format => {
            const row = document.createElement('div');
            row.className = 'download-row';
            
            const btn = document.createElement('button');
            btn.className = 'btn-download';
            btn.textContent = `Baixar ${format.quality}`;
            
            btn.addEventListener('click', async () => {
                btn.textContent = 'Baixando...';
                btn.disabled = true;
                try {
                    const res = await fetch(format.url);
                    const blob = await res.blob();
                    const downloadUrl = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = downloadUrl;
                    a.download = `${data.title}-${format.quality}.mp4`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(downloadUrl);
                } catch (e) {
                    alert('Erro ao transferir o arquivo.');
                } finally {
                    btn.textContent = `Baixar ${format.quality}`;
                    btn.disabled = false;
                }
            });

            row.appendChild(btn);
            resolutionsGrid.appendChild(row);
        });

        resultContainer.classList.remove('hidden');
    } catch (err) {
        errorMsg.textContent = 'Erro ao processar o vídeo. Tente novamente.';
    } finally {
        loader.classList.add('hidden');
    }
});
