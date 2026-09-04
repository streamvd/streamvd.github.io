document.addEventListener('DOMContentLoaded', () => {
    const audio = document.getElementById('audio');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const trackTitleEl = document.getElementById('track-title');
    const artistNameEl = document.getElementById('artist-name');
    const albumArtEl = document.getElementById('album-art');
    const drawerAbout = document.getElementById('aboutSection');
    const donateModal = document.getElementById('donateModal');
    const aboutButton = document.getElementById('aboutButton');
    const installButton = document.getElementById('installButton');
    const donateBtn = document.getElementById('donateBtn');
    const shareBtn = document.getElementById('shareBtn');
    const copyPixBtn = document.getElementById('copyPixBtn');
    const backButton = document.getElementById('backButton');

    const STREAM_URL = 'https://playerservices.streamtheworld.com/api/livestream-redirect/SRGSTR03.mp3';
    const LOCAL_PROXY_URL = 'http://127.0.0.1:3000/api/nowplaying';
    const DEFAULT_PUBLIC_PROXY_URL = 'https://streamvd-github-io.onrender.com/api/nowplaying';

    const runtimeProxyUrl = window.RADIO_CONFIG && window.RADIO_CONFIG.proxyUrl
        ? window.RADIO_CONFIG.proxyUrl
        : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? LOCAL_PROXY_URL
            : DEFAULT_PUBLIC_PROXY_URL);

    const PLAYLIST_URL = runtimeProxyUrl;
    const METADATA_POLL_MS = 5000;
    const PIX_CODE = '00020126580014BR.GOV.BCB.PIX0136aa8b3fd0-0c76-422f-9f3a-844bd7f6b6275204000053039865802BR5922WALTEMAR LIMA CARNEIRO6006MANAUS62170513TX5YYN5DB1PTT63042916';
    const RELOAD_SWIPE_THRESHOLD = 80;
    const standaloneMediaQuery = window.matchMedia('(display-mode: standalone)');

    const defaultState = {
        title: 'Carregando...',
        artist: 'Carregando...',
        cover: 'img/album.webp'
    };

    let lastAppliedMetaKey = '';
    let coverRequestToken = 0;
    let activeTrackVersion = 0;
    let reloadTouchStartY = 0;
    let reloadTouchStartX = 0;
    let isReloadingBySwipe = false;
    let deferredInstallPrompt = null;
    const coverCache = new Map();

    function setPlayButtonState(isPlaying) {
        playPauseBtn.classList.toggle('playing', isPlaying);
        playPauseBtn.setAttribute('aria-label', isPlaying ? 'Pausar' : 'Reproduzir');

        const icon = isPlaying
            ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>'
            : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';

        playPauseBtn.innerHTML = icon;
    }

    function setCoverImage(url) {
        const safeUrl = url || defaultState.cover;
        albumArtEl.src = safeUrl;
        albumArtEl.alt = 'Capa da música atual';
    }

    function applyStationMeta(data) {
        const title = data?.title || defaultState.title;
        const artist = data?.artist || defaultState.artist;
        const cover = data?.cover || defaultState.cover;

        trackTitleEl.textContent = title;
        artistNameEl.textContent = artist;
        setCoverImage(cover);
        document.title = `${title} • ${artist} | Love Songs`;
    }

    function parseTrackLabel(label) {
        const normalized = String(label || '').replace(/\s+/g, ' ').trim();

        if (!normalized) {
            return { title: defaultState.title, artist: defaultState.artist };
        }

        const separators = [' - ', ' – ', ' — ', ' | ', ' / '];
        const separator = separators.find((entry) => normalized.includes(entry));

        if (separator) {
            const [artistPart, ...titleParts] = normalized.split(separator);
            const title = titleParts.join(separator).trim();
            if (artistPart && title) {
                return {
                    artist: artistPart.trim(),
                    title: title.trim()
                };
            }
        }

        return {
            artist: defaultState.artist,
            title: normalized
        };
    }

    function updateTrackMetadata(rawLabel) {
        const { title, artist } = parseTrackLabel(rawLabel);
        const metaKey = `${title}::${artist}`;

        if (metaKey === lastAppliedMetaKey) {
            return;
        }

        const trackVersion = ++activeTrackVersion;
        lastAppliedMetaKey = metaKey;
        trackTitleEl.textContent = title;
        artistNameEl.textContent = artist;
        document.title = `${title} • ${artist} | Love Songs`;
        setCoverImage(defaultState.cover);
        fetchTrackCover(title, artist, metaKey, trackVersion);
    }

    function setCurrentMeta(meta) {
        const title = meta?.title || defaultState.title;
        const artist = meta?.artist || defaultState.artist;
        const cover = meta?.cover || defaultState.cover;
        const metaKey = `${title}::${artist}`;

        const nextCover = cover && cover !== defaultState.cover ? cover : defaultState.cover;

        if (metaKey === lastAppliedMetaKey) {
            if (nextCover !== defaultState.cover) {
                setCoverImage(nextCover);
            }
            return;
        }

        const trackVersion = ++activeTrackVersion;
        lastAppliedMetaKey = metaKey;
        trackTitleEl.textContent = title;
        artistNameEl.textContent = artist;
        document.title = `${title} • ${artist} | Love Songs`;
        setCoverImage(nextCover);

        if (!meta?.cover || meta.cover === defaultState.cover) {
            fetchTrackCover(title, artist, metaKey, trackVersion);
        }
    }

    async function fetchTrackCover(title, artist, expectedMetaKey, expectedVersion) {
        const query = `${artist} ${title}`.trim();
        if (!query) {
            return;
        }

        const cacheKey = `${artist}::${title}`.toLowerCase();
        if (coverCache.has(cacheKey) && expectedMetaKey === lastAppliedMetaKey && expectedVersion === activeTrackVersion) {
            const cachedCover = coverCache.get(cacheKey);
            if (cachedCover) {
                setCoverImage(cachedCover);
            }
            return;
        }

        const token = ++coverRequestToken;
        const encodedQuery = encodeURIComponent(query);

        try {
            const response = await fetch(`https://itunes.apple.com/search?term=${encodedQuery}&media=music&limit=1`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const result = data.results && data.results[0];
            if (!result || token !== coverRequestToken) {
                return;
            }

            const cover = (result.artworkUrl100 || result.artworkUrl60 || '').replace('100x100', '1000x1000');
            if (!cover) {
                return;
            }

            if (expectedMetaKey !== lastAppliedMetaKey || expectedVersion !== activeTrackVersion) {
                return;
            }

            coverCache.set(cacheKey, cover);
            setCoverImage(cover);
        } catch (error) {
            console.warn('Não foi possível buscar a capa da música:', error);
        }
    }

    async function fetchCurrentStreamTitle() {
        const response = await fetch(STREAM_URL, {
            headers: {
                'Icy-MetaData': '1'
            }
        });

        if (!response.ok || !response.body) {
            return null;
        }

        const metaIntervalHeader = response.headers.get('icy-metaint');
        const metaInterval = Number(metaIntervalHeader || 0);

        if (!metaInterval) {
            return null;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('latin1');
        let buffer = new Uint8Array();
        const startedAt = Date.now();

        try {
            while (Date.now() - startedAt < 5000) {
                const { value, done } = await reader.read();
                if (done || !value) {
                    break;
                }

                const nextBuffer = new Uint8Array(buffer.length + value.length);
                nextBuffer.set(buffer, 0);
                nextBuffer.set(value, buffer.length);
                buffer = nextBuffer;

                while (buffer.length >= metaInterval + 1) {
                    const metadataLength = buffer[metaInterval] & 0x3F;
                    const blockSize = (metadataLength + 1) * 16;

                    if (!metadataLength) {
                        buffer = buffer.slice(metaInterval + 1);
                        continue;
                    }

                    if (buffer.length < metaInterval + 1 + blockSize) {
                        break;
                    }

                    const metadataBlock = buffer.slice(metaInterval + 1, metaInterval + 1 + blockSize);
                    const metadata = decoder.decode(metadataBlock).replace(/\0/g, '');
                    const match = metadata.match(/StreamTitle='([^']*)';/i);

                    if (match) {
                        return match[1].trim();
                    }

                    buffer = buffer.slice(metaInterval + 1 + blockSize);
                }
            }
        } finally {
            try {
                await reader.cancel();
            } catch (error) {
                console.warn('Falha ao fechar leitura do stream:', error);
            }
        }

        return null;
    }

    function normalizeTrackText(value) {
        return String(value || '').replace(/\s+/g, ' ').replace(/\u00a0/g, ' ').trim();
    }

    function decodeJsonString(value) {
        return String(value || '')
            .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
            .replace(/\\n/g, ' ')
            .replace(/\\"/g, '"')
            .replace(/\\'/g, "'")
            .replace(/\\\//g, '/');
    }

    function extractTrackFromLabel(label) {
        const normalized = normalizeTrackText(label);
        if (!normalized) {
            return null;
        }

        const blockedWords = ['sky radio', 'playlist', 'love songs', 'radio luisteren', 'news', 'cookie', 'voorwaarden', 'download', 'volg sky radio', 'faq'];
        if (blockedWords.some((word) => normalized.toLowerCase().includes(word))) {
            return null;
        }

        const separators = [' - ', ' – ', ' — '];
        for (const separator of separators) {
            if (!normalized.includes(separator)) {
                continue;
            }

            const parts = normalized.split(separator);
            if (parts.length >= 2) {
                const artist = normalizeTrackText(parts[0]);
                const title = normalizeTrackText(parts.slice(1).join(separator));
                if (artist && title && !/love songs|sky radio/i.test(`${artist} ${title}`)) {
                    return { artist, title };
                }
            }
        }

        if (normalized.length >= 3 && !/love songs|sky radio/i.test(normalized)) {
            return { artist: defaultState.artist, title: normalized };
        }

        return null;
    }

    function parseTrackFromJsonBlob(html) {
        const pattern = /"track"\s*:\s*\{[^]*?"type"\s*:\s*"track"[^]*?"title"\s*:\s*"((?:\\.|[^"\\])*)"[^]*?"artistName"\s*:\s*"((?:\\.|[^"\\])*)"[^]*?"imageUrl"\s*:\s*"((?:\\.|[^"\\])*)"/g;
        const matches = [...html.matchAll(pattern)];

        for (const match of matches) {
            const title = decodeJsonString(match[1]);
            const artist = decodeJsonString(match[2]);
            const cover = decodeJsonString(match[3]);

            if (title && artist) {
                return {
                    title: normalizeTrackText(title),
                    artist: normalizeTrackText(artist),
                    cover: normalizeTrackText(cover) || defaultState.cover
                };
            }
        }

        return null;
    }

    function parseTrackFromPlaylistHtml(html) {
        const fromJson = parseTrackFromJsonBlob(html);
        if (fromJson) {
            return fromJson;
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const candidates = Array.from(doc.querySelectorAll('[data-testid="NowPlaying"], [data-testid="NowPlayingImageContainer"], img[alt]'));

        for (const node of candidates) {
            const altText = normalizeTrackText(node.getAttribute('alt') || node.getAttribute('aria-label') || '');
            const directTrack = extractTrackFromLabel(altText);
            if (directTrack) {
                return directTrack;
            }

            const text = normalizeTrackText(node.textContent || '');
            const textTrack = extractTrackFromLabel(text);
            if (textTrack) {
                return textTrack;
            }
        }

        const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        for (const heading of headings) {
            const guessed = extractTrackFromLabel(heading.textContent || '');
            if (guessed) {
                return guessed;
            }
        }

        return null;
    }

    async function fetchPlaylistCurrentTrack() {
        try {
            const response = await fetch(PLAYLIST_URL, { cache: 'no-store' });
            if (!response.ok) {
                return null;
            }

            const payload = await response.json();
            if (payload && payload.title && payload.artist) {
                return {
                    title: payload.title,
                    artist: payload.artist,
                    cover: payload.cover || defaultState.cover
                };
            }

            const html = await response.text();
            return parseTrackFromPlaylistHtml(html);
        } catch (error) {
            console.warn('Não foi possível carregar a playlist da rádio:', error);
            return null;
        }
    }

    async function pollCurrentMetadata() {
        try {
            const playlistTrack = await fetchPlaylistCurrentTrack();
            if (playlistTrack) {
                setCurrentMeta({
                    title: playlistTrack.title,
                    artist: playlistTrack.artist,
                    cover: playlistTrack.cover || defaultState.cover
                });
                setTimeout(pollCurrentMetadata, METADATA_POLL_MS);
                return;
            }

            const streamTitle = await fetchCurrentStreamTitle();
            if (streamTitle) {
                updateTrackMetadata(streamTitle);
            }
        } catch (error) {
            console.warn('Não foi possível ler metadados do stream:', error);
        }

        setTimeout(pollCurrentMetadata, METADATA_POLL_MS);
    }

    function togglePlayback() {
        if (!audio) return;

        if (audio.paused) {
            const playPromise = audio.play();
            if (playPromise) {
                playPromise.catch(() => {
                    console.warn('Playback bloqueado até a interação do usuário.');
                });
            }
            setPlayButtonState(true);
        } else {
            audio.pause();
            setPlayButtonState(false);
        }
    }

    function openModal(modal) {
        modal.classList.add('visible');
        modal.setAttribute('aria-hidden', 'false');
    }

    function closeModal(modal) {
        modal.classList.remove('visible');
        modal.setAttribute('aria-hidden', 'true');
    }

    async function sharePage() {
        const shareData = {
            title: 'Love Songs',
            text: 'Curta a rádio Love Songs ao vivo.',
            url: window.location.href
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(window.location.href);
                alert('Link copiado para a área de transferência.');
            }
        } catch (error) {
            console.warn('Compartilhamento cancelado ou indisponível:', error);
        }
    }

    function copyPIX() {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(PIX_CODE)
                .then(() => console.log('Código PIX copiado!'))
                .catch(() => console.warn('Falha ao copiar PIX no clipboard.'));
        }
    }

    function hideInstallButton() {
        if (!installButton) return;
        installButton.hidden = true;
    }

    function handleInstallPrompt(event) {
        if (isAppInstalled()) {
            return;
        }

        event.preventDefault();
        deferredInstallPrompt = event;
        if (installButton) {
            installButton.hidden = false;
        }
    }

    async function installApp() {
        if (!deferredInstallPrompt) return;

        const promptEvent = deferredInstallPrompt;
        deferredInstallPrompt = null;
        hideInstallButton();
        try {
            await promptEvent.prompt();
            const choice = await promptEvent.userChoice;
            if (choice.outcome === 'accepted') {
                hideInstallButton();
            } else if (installButton) {
                installButton.hidden = false;
            }
        } catch (error) {
            console.warn('Não foi possível concluir a instalação:', error);
            if (!isAppInstalled() && installButton) {
                installButton.hidden = false;
            }
        }
    }

    function isAppInstalled() {
        return standaloneMediaQuery.matches || window.navigator.standalone === true;
    }

    function handleReloadTouchStart(event) {
        if (isReloadingBySwipe || document.querySelector('.modal-panel.visible')) {
            return;
        }

        const touch = event.touches && event.touches[0];
        if (!touch) return;

        reloadTouchStartY = touch.clientY;
        reloadTouchStartX = touch.clientX;
    }

    function handleReloadTouchEnd(event) {
        if (isReloadingBySwipe || reloadTouchStartY === 0) {
            return;
        }

        const touch = event.changedTouches && event.changedTouches[0];
        if (!touch) return;

        const verticalDistance = touch.clientY - reloadTouchStartY;
        const horizontalDistance = Math.abs(touch.clientX - reloadTouchStartX);
        reloadTouchStartY = 0;
        reloadTouchStartX = 0;

        if (verticalDistance < RELOAD_SWIPE_THRESHOLD || horizontalDistance > Math.abs(verticalDistance)) {
            return;
        }

        isReloadingBySwipe = true;
        window.location.reload();
    }

    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js').catch((error) => {
                    console.warn('Service Worker não registrado:', error);
                });
            });
        }
    }

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', hideInstallButton);
    function handleDisplayModeChange(event) {
        if (event.matches) {
            hideInstallButton();
        }
    }

    if (standaloneMediaQuery.addEventListener) {
        standaloneMediaQuery.addEventListener('change', handleDisplayModeChange);
    } else {
        standaloneMediaQuery.addListener(handleDisplayModeChange);
    }

    if (isAppInstalled()) {
        hideInstallButton();
    }

    document.addEventListener('touchstart', handleReloadTouchStart, { passive: true });
    document.addEventListener('touchend', handleReloadTouchEnd, { passive: true });
    document.addEventListener('touchcancel', () => {
        reloadTouchStartY = 0;
        reloadTouchStartX = 0;
    }, { passive: true });

    playPauseBtn.addEventListener('click', togglePlayback);
    aboutButton.addEventListener('click', () => openModal(drawerAbout));
    if (installButton) {
        installButton.addEventListener('click', installApp);
    }
    donateBtn.addEventListener('click', () => {
        copyPIX();
        openModal(donateModal);
    });
    shareBtn.addEventListener('click', sharePage);
    copyPixBtn.addEventListener('click', copyPIX);
    backButton.addEventListener('click', () => window.history.back());

    document.querySelectorAll('[data-close]').forEach((button) => {
        button.addEventListener('click', () => {
            const target = button.getAttribute('data-close');
            if (target === 'about') closeModal(drawerAbout);
            if (target === 'donate') closeModal(donateModal);
        });
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeModal(drawerAbout);
            closeModal(donateModal);
        }
    });

    audio.addEventListener('play', () => setPlayButtonState(true));
    audio.addEventListener('pause', () => setPlayButtonState(false));

    setPlayButtonState(false);
    applyStationMeta(defaultState);
    pollCurrentMetadata();
    registerServiceWorker();
});
