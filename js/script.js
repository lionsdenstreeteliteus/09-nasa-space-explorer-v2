// Use this URL to fetch NASA APOD JSON data.
const apodData = 'https://cdn.jsdelivr.net/gh/GCA-Classroom/apod/data.json';

// Fetch and render APOD items when the button is clicked.
// This code is simple and includes comments for beginners.

// Get references to DOM elements from [index.html](index.html)
const getImageBtn = document.getElementById('getImageBtn');
const gallery = document.getElementById('gallery');

// Cache the full feed so we can filter by date without re-downloading
let fullData = null;

// A small collection of fun space facts. Pick one at random on page load.
const spaceFacts = [
  'Venus rotates clockwise — the opposite direction of most planets.',
  'A day on Venus is longer than a year on Venus (it rotates very slowly).',
  'There are more stars in the observable universe than grains of sand on all Earth\'s beaches.',
  'Neutron stars can spin up to 700 times per second.',
  'A teaspoon of a neutron star would weigh about 6 billion tons on Earth.',
  'Space is not completely empty; it has a few atoms per cubic meter in interstellar space.',
  'The footprints left on the Moon will likely remain for millions of years because there is no wind.',
  'Saturn would float in water if you could find a bathtub large enough — it\'s mostly gas.',
  'Light from the Sun takes about 8 minutes and 20 seconds to reach Earth.',
  'Jupiter has the shortest day of all the planets — it rotates once every ~10 hours.'
];

function showRandomFact() {
  const el = document.getElementById('did-you-know-text');
  if (!el) return;
  const i = Math.floor(Math.random() * spaceFacts.length);
  el.textContent = spaceFacts[i];
}

// Show a random fact when the page finishes loading
document.addEventListener('DOMContentLoaded', () => {
  showRandomFact();
});

// Async function to fetch the JSON and return parsed array
async function fetchApodData() {
  try {
    const res = await fetch(apodData);
    if (!res.ok) {
      throw new Error(`Network error: ${res.status}`);
    }
    const data = await res.json();
  // store in cache when fetched
  fullData = data;
    return data;
  } catch (err) {
    console.error('Fetch error:', err);
    throw err;
  }
}

// Render a list of APOD items into the gallery
function renderGallery(items) {
  // Clear existing content (including the placeholder)
  gallery.innerHTML = '';

  if (!Array.isArray(items) || items.length === 0) {
    gallery.innerHTML = `
      <div class="placeholder">
        <div class="placeholder-icon">🔭</div>
        <p>No items found.</p>
      </div>
    `;
    return;
  }

  // For each item, create a gallery card
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'gallery-item';

    // Safe access to fields
    const title = item.title || 'Untitled';
    const date = item.date || '';
    const mediaType = item.media_type || 'image';
    const url = item.url || '';
    const thumb = item.thumbnail_url || '';

    // For images: show image. For videos: try thumbnail, else show a placeholder link.
    let mediaHtml = '';
    if (mediaType === 'image') {
      // Show the image; we will open the larger image in the modal
      mediaHtml = `
        <img src="${url}" alt="${title}" />
      `;
    } else if (mediaType === 'video') {
      if (thumb) {
        // Show clickable thumbnail with a play overlay; card click will open modal
        mediaHtml = `
          <div class="video-thumb" style="position:relative;">
            <img src="${thumb}" alt="${title} (video thumbnail)" />
            <span class="play-overlay" aria-hidden="true" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:36px;color:rgba(255,255,255,0.95);text-shadow:0 2px 8px rgba(0,0,0,0.6);">▶</span>
          </div>
        `;
      } else {
        // If no thumbnail, show a generic video placeholder and a clear link to open the video
        const safeUrl = url || '#';
        mediaHtml = `
          <div class="video-placeholder" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:24px;background:#0b3d9110;border-radius:6px;">
            <div style="font-size:20px;">▶ Video</div>
            <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color:#0b3d91;font-weight:600;text-decoration:underline;">Watch video</a>
          </div>
        `;
      }
    } else {
      mediaHtml = `<p>Unsupported media type: ${mediaType}</p>`;
    }

    // Build the card HTML using template literals
    card.innerHTML = `
      ${mediaHtml}
      <p><strong>${title}</strong></p>
      <p>${date}</p>
    `;

    // Make cards interactive and keyboard-accessible
    card.tabIndex = 0;
    card.style.cursor = 'pointer';

    // Store the item data on the element for easy access in the handler
    card._apodItem = item;

    // Open modal on click or Enter/Space key
    card.addEventListener('click', () => openApodModal(item));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openApodModal(item);
      }
    });

    gallery.appendChild(card);
  });
}

// --------------------
// Modal implementation
// --------------------
let _apodModal = null;
let _apodModalPrevActive = null;

function createApodModal() {
  const overlay = document.createElement('div');
  overlay.id = 'apod-modal';
  overlay.className = 'apod-modal-overlay';

  const box = document.createElement('div');
  box.className = 'apod-modal-box';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'apod-modal-close';
  closeBtn.type = 'button';
  closeBtn.textContent = 'Close';

  const mediaWrap = document.createElement('div');
  mediaWrap.className = 'apod-modal-media';

  const imgEl = document.createElement('img');
  imgEl.className = 'apod-modal-img';
  imgEl.alt = '';

  const iframeEl = document.createElement('iframe');
  iframeEl.className = 'apod-modal-iframe';

  mediaWrap.appendChild(imgEl);

  const titleEl = document.createElement('h2');
  titleEl.className = 'apod-modal-title';

  const dateEl = document.createElement('p');
  dateEl.className = 'apod-modal-date';

  const explEl = document.createElement('p');
  explEl.className = 'apod-modal-explanation';

  box.appendChild(closeBtn);
  box.appendChild(mediaWrap);
  box.appendChild(titleEl);
  box.appendChild(dateEl);
  box.appendChild(explEl);

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  // Handlers
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeApodModal();
  });
  closeBtn.addEventListener('click', closeApodModal);

  _apodModal = {
    root: overlay,
    box,
    imgEl,
    iframeEl,
    titleEl,
    dateEl,
    explEl,
    closeBtn
  };
}

function openApodModal(item) {
  if (!_apodModal) createApodModal();
  const { root, imgEl, iframeEl, titleEl, dateEl, explEl, closeBtn, box } = _apodModal;

  _apodModalPrevActive = document.activeElement;

  titleEl.textContent = item.title || 'Untitled';
  dateEl.textContent = item.date || '';
  explEl.textContent = item.explanation || '';

  // Clear media area and show appropriate media
  const mediaWrap = box.querySelector('.apod-modal-media');
  // Remove existing children
  while (mediaWrap.firstChild) mediaWrap.removeChild(mediaWrap.firstChild);

  if (item.media_type === 'image' && item.hdurl) {
    imgEl.src = item.hdurl || item.url || '';
    imgEl.alt = item.title || 'APOD image';
    mediaWrap.appendChild(imgEl);
  } else if (item.media_type === 'image' && item.url) {
    imgEl.src = item.url;
    imgEl.alt = item.title || 'APOD image';
    mediaWrap.appendChild(imgEl);
  } else if (item.media_type === 'video' && item.url) {
    // Prefer to show a thumbnail and provide a direct "Watch on YouTube" link instead of embedding.
    let watchUrl = item.url || '';
    // Derive watch URL and thumbnail from common YouTube forms if needed
    let thumbUrl = item.thumbnail_url || '';
    try {
      if (watchUrl.includes('/embed/')) {
        const id = watchUrl.split('/embed/')[1].split('?')[0];
        watchUrl = `https://www.youtube.com/watch?v=${id}`;
        if (!thumbUrl) thumbUrl = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
      } else if (watchUrl.includes('watch?v=')) {
        const id = watchUrl.split('watch?v=')[1].split('&')[0];
        if (!thumbUrl) thumbUrl = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
      } else if (watchUrl.includes('youtu.be/')) {
        const id = watchUrl.split('youtu.be/')[1].split('?')[0];
        watchUrl = `https://www.youtube.com/watch?v=${id}`;
        if (!thumbUrl) thumbUrl = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
      }
    } catch (e) {
      // ignore parsing errors, fall back to provided values
    }

    // Create the thumbnail image (large view)
    if (thumbUrl) {
      const thumbImg = document.createElement('img');
      thumbImg.src = thumbUrl;
      thumbImg.alt = item.title || 'Video thumbnail';
      thumbImg.style.width = '100%';
      thumbImg.style.height = 'auto';
      thumbImg.style.borderRadius = '6px';
      mediaWrap.appendChild(thumbImg);
    } else {
      const p = document.createElement('p');
      p.textContent = 'Video (no thumbnail available)';
      mediaWrap.appendChild(p);
    }

    // Always show a clear watch link that opens YouTube in a new tab
    const watchLink = document.createElement('a');
    watchLink.href = watchUrl || item.url || '#';
    watchLink.target = '_blank';
    watchLink.rel = 'noopener noreferrer';
    watchLink.className = 'video-watch-link';
    watchLink.textContent = 'Watch video on YouTube';

    const hint = document.createElement('div');
    hint.className = 'video-embed-hint';
    hint.textContent = 'This video will open on YouTube.';

    mediaWrap.appendChild(hint);
    mediaWrap.appendChild(watchLink);
  } else if (item.media_type === 'video' && item.thumbnail_url) {
    const thumb = document.createElement('img');
    thumb.src = item.thumbnail_url;
    thumb.alt = item.title || 'Video thumbnail';
    mediaWrap.appendChild(thumb);
  } else {
    const p = document.createElement('p');
    p.textContent = 'Media not available.';
    mediaWrap.appendChild(p);
  }

  root.style.display = 'flex';

  // focus management
  closeBtn.focus();

  // close on Escape
  document.addEventListener('keydown', _apodModalKeydown);
}

function _apodModalKeydown(e) {
  if (e.key === 'Escape') closeApodModal();
}

function closeApodModal() {
  if (!_apodModal) return;
  const { root, iframeEl } = _apodModal;
  root.style.display = 'none';
  // stop video playback by clearing iframe src
  if (iframeEl) iframeEl.src = '';
  document.removeEventListener('keydown', _apodModalKeydown);
  if (_apodModalPrevActive && typeof _apodModalPrevActive.focus === 'function') {
    _apodModalPrevActive.focus();
  }
}

// Click handler for the fetch button
getImageBtn.addEventListener('click', async () => {
  // Provide quick feedback by disabling the button while loading
  getImageBtn.disabled = true;
  getImageBtn.textContent = 'Loading...';

  // Show a loading message in the gallery while we fetch data
  gallery.innerHTML = `
    <div class="placeholder">
      <div class="placeholder-icon">🔄</div>
      <p>🔄 Loading space photos…</p>
    </div>
  `;

  try {
    const items = await fetchApodData();
    // remember full feed for any future needs
    fullData = items;
    renderGallery(items);
  } catch (err) {
    // Show a simple error message in the gallery
    gallery.innerHTML = `
      <div class="placeholder">
        <div class="placeholder-icon">⚠️</div>
        <p>Failed to load data. Check the console for details.</p>
      </div>
    `;
  } finally {
    getImageBtn.disabled = false;
    getImageBtn.textContent = 'Fetch Space Images';
  }
});

// Date picker removed — calendar feature deleted per user request.