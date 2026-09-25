// Post-it / Sticky Note Module
// Universelle Pen-, Touch- & Maus-Unterstützung mit Palm Rejection und Live-Sync

let globalSocket = null;
let noteCanvas = null;
let ctx = null;
let thumbnailCanvas = null;
let thumbCtx = null;
let modalOverlay = null;
let modalCard = null;
let widgetPaper = null;
let emptyPlaceholder = null;

// Zeichnungs-Zustand
let isDrawing = false;
let activePointerId = null;
let activePointerType = null;
let penActive = false; // Flag fuer Palm Rejection (wenn Pen aktiv ist, Finger ignorieren)

let currentColor = '#1e293b';
let currentBaseSize = 3;
let isEraser = false;
let isHighlighter = false;

// Punkte für Bézier-Glättung
let lastX = 0;
let lastY = 0;
let points = [];

// Undo Stack (begrenzt auf 20 Zustände)
const undoStack = [];
const MAX_UNDO = 20;

// Auto-Save Debounce Timer
let autoSaveTimer = null;

export function initNote(socket) {
  globalSocket = socket;

  noteCanvas = document.getElementById('noteCanvas');
  thumbnailCanvas = document.getElementById('noteThumbnailCanvas');
  modalOverlay = document.getElementById('noteModalOverlay');
  modalCard = document.getElementById('noteModalCard');
  widgetPaper = document.getElementById('notePaperPreview');
  emptyPlaceholder = document.getElementById('noteEmptyPlaceholder');

  if (!noteCanvas || !thumbnailCanvas || !modalOverlay) return;

  ctx = noteCanvas.getContext('2d');
  thumbCtx = thumbnailCanvas.getContext('2d');

  // Thumbnail-Größe initialisieren
  initThumbnailCanvas();

  window.addEventListener('resize', () => {
    initThumbnailCanvas();
    if (thumbnailCanvas && thumbnailCanvas.dataset.lastImage) {
      renderImageToThumbnails(thumbnailCanvas.dataset.lastImage);
    }
    if (modalOverlay && !modalOverlay.hasAttribute('hidden')) {
      resizeNoteCanvas();
    }
  });

  const wrapper = document.getElementById('noteCanvasWrapper');
  if (window.ResizeObserver && wrapper) {
    const resizeObserver = new ResizeObserver(() => {
      if (modalOverlay && !modalOverlay.hasAttribute('hidden')) {
        resizeNoteCanvas();
      }
    });
    resizeObserver.observe(wrapper);
  }

  // Widget Klick -> Modal mit Zoom öffnen
  const noteWidget = document.querySelector('.widget[data-type="note"]');
  if (noteWidget) {
    noteWidget.addEventListener('click', (e) => {
      // Wenn nicht auf Drag-Handle geklickt wurde, Modal öffnen
      if (e.target.closest('.drag-handle')) return;
      openNoteModal();
    });
  }

  // Schließen-Button
  const closeBtn = document.getElementById('noteCloseBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      closeNoteModal();
    });
  }

  // Klick auf Overlay-Hintergrund schließt ebenfalls
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeNoteModal();
    }
  });

  // ESC-Taste schließt Modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modalOverlay.hasAttribute('hidden')) {
      closeNoteModal();
    }
  });

  // Toolbar Event-Listener
  initToolbar();

  // Pointer Events für Canvas (Pen, Touch, Maus)
  setupCanvasEvents();

  // Notiz vom Server laden
  loadNoteFromServer();

  // Socket.io Realtime-Sync
  if (globalSocket) {
    globalSocket.on('note-updated', (data) => {
      if (data && data.image) {
        renderImageToThumbnails(data.image);
        // Falls das Modal gerade NICHT geöffnet ist, aktualisieren wir auch den Zeichen-Canvas
        if (modalOverlay.hasAttribute('hidden')) {
          renderImageToCanvas(data.image, false);
        }
      } else {
        clearCanvasLocal();
      }
    });

    globalSocket.on('note-cleared', () => {
      clearCanvasLocal();
    });
  }
}

function initThumbnailCanvas() {
  if (!thumbnailCanvas) return;
  const rect = thumbnailCanvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = rect.width || 240;
  const h = rect.height || 180;

  thumbnailCanvas.width = w * dpr;
  thumbnailCanvas.height = h * dpr;
  thumbCtx.scale(dpr, dpr);
}

function initToolbar() {
  // Farben
  const colorBtns = document.querySelectorAll('.note-color-btn');
  colorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      colorBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentColor = btn.getAttribute('data-color');
      isHighlighter = btn.classList.contains('highlighter');
      isEraser = false;

      const eraserBtn = document.getElementById('noteEraserBtn');
      if (eraserBtn) eraserBtn.classList.remove('active');
    });
  });

  // Stiftgrößen
  const sizeBtns = document.querySelectorAll('.note-size-btn');
  sizeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sizeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentBaseSize = parseInt(btn.getAttribute('data-size'), 10) || 3;
    });
  });

  // Radierer
  const eraserBtn = document.getElementById('noteEraserBtn');
  if (eraserBtn) {
    eraserBtn.addEventListener('click', () => {
      isEraser = !isEraser;
      if (isEraser) {
        eraserBtn.classList.add('active');
      } else {
        eraserBtn.classList.remove('active');
      }
    });
  }

  // Undo (Rückgängig)
  const undoBtn = document.getElementById('noteUndoBtn');
  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      handleUndo();
    });
  }

  // Clear (Alles löschen)
  const clearBtn = document.getElementById('noteClearBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Möchtest du den gesamten Notizzettel wirklich leeren?')) {
        clearCanvasLocal();
        syncNoteClearToServer();
      }
    });
  }
}

function setupCanvasEvents() {
  if (!noteCanvas) return;

  // Wichtig für Tablets: Verhindert standardmäßiges Gesten-Scrollen
  noteCanvas.style.touchAction = 'none';

  noteCanvas.addEventListener('pointerdown', handlePointerDown);
  noteCanvas.addEventListener('pointermove', handlePointerMove);
  noteCanvas.addEventListener('pointerup', handlePointerUp);
  noteCanvas.addEventListener('pointercancel', handlePointerCancel);
  noteCanvas.addEventListener('pointerleave', handlePointerUp);
}

function resizeNoteCanvas() {
  if (!noteCanvas || !modalCard) return;
  const wrapper = document.getElementById('noteCanvasWrapper');
  if (!wrapper) return;

  const dpr = window.devicePixelRatio || 1;
  // clientWidth und clientHeight liefern die unskalierte Layout-Größe des Wrappers
  let targetWidth = wrapper.clientWidth;
  let targetHeight = wrapper.clientHeight;

  if (!targetWidth || !targetHeight) {
    const rect = wrapper.getBoundingClientRect();
    targetWidth = Math.floor(rect.width);
    targetHeight = Math.floor(rect.height);
  }

  if (targetWidth <= 0 || targetHeight <= 0) return;

  const newBufferWidth = Math.round(targetWidth * dpr);
  const newBufferHeight = Math.round(targetHeight * dpr);

  // Wenn Größe unverändert ist, kein unnötiges Neu-Allokieren
  if (noteCanvas.width === newBufferWidth && noteCanvas.height === newBufferHeight) {
    return;
  }

  // Sichern des bisherigen Inhalts bei Größenänderung
  let tempCanvas = null;
  if (noteCanvas.width > 0 && noteCanvas.height > 0) {
    tempCanvas = document.createElement('canvas');
    tempCanvas.width = noteCanvas.width;
    tempCanvas.height = noteCanvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(noteCanvas, 0, 0);
  }

  noteCanvas.width = newBufferWidth;
  noteCanvas.height = newBufferHeight;

  // Wichtig: Kontext-Matrix sauber initialisieren und skalieren
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  // Bisherigen Inhalt wieder einpassen
  if (tempCanvas) {
    ctx.drawImage(tempCanvas, 0, 0, targetWidth, targetHeight);
  } else if (thumbnailCanvas && thumbnailCanvas.dataset.lastImage) {
    renderImageToCanvas(thumbnailCanvas.dataset.lastImage, false);
  }
}

function handlePointerDown(e) {
  // Palm Rejection: Wenn ein Pen aktiv ist, ignorieren wir Touch-Events von aufgelegten Handflächen
  if (penActive && e.pointerType === 'touch') {
    return;
  }

  if (e.pointerType === 'pen') {
    penActive = true;
  }

  // Pointer Capture für saubere Strichführung auch bei schnellen Bewegungen
  try {
    noteCanvas.setPointerCapture(e.pointerId);
  } catch (err) {}

  activePointerId = e.pointerId;
  activePointerType = e.pointerType;
  isDrawing = true;

  // Vor neuem Strich aktuellen Zustand im Undo-Stack sichern
  saveUndoState();

  const pos = getCanvasPos(e);
  lastX = pos.x;
  lastY = pos.y;
  points = [{ x: pos.x, y: pos.y, pressure: e.pressure || 0.5 }];

  // Sofort einen Punkt malen (für kurzes Antippen z. B. i-Punkte)
  drawStrokePoint(pos.x, pos.y, e.pressure || 0.5);
}

function handlePointerMove(e) {
  if (!isDrawing || e.pointerId !== activePointerId) return;

  // Palm Rejection Check
  if (penActive && e.pointerType === 'touch') return;

  const pos = getCanvasPos(e);
  points.push({ x: pos.x, y: pos.y, pressure: e.pressure || 0.5 });

  if (points.length >= 3) {
    const p0 = points[points.length - 3];
    const p1 = points[points.length - 2];
    const p2 = points[points.length - 1];

    const mid1X = (p0.x + p1.x) / 2;
    const mid1Y = (p0.y + p1.y) / 2;
    const mid2X = (p1.x + p2.x) / 2;
    const mid2Y = (p1.y + p2.y) / 2;

    ctx.beginPath();
    ctx.moveTo(mid1X, mid1Y);
    ctx.quadraticCurveTo(p1.x, p1.y, mid2X, mid2Y);

    configureContext(p1.pressure);
    ctx.stroke();
  }
}

function handlePointerUp(e) {
  if (!isDrawing || e.pointerId !== activePointerId) return;

  try {
    noteCanvas.releasePointerCapture(e.pointerId);
  } catch (err) {}

  isDrawing = false;
  activePointerId = null;

  // Nach Stiftende kurze Verzögerung vor Freigabe für Touch (verhindert Nachtouches)
  if (e.pointerType === 'pen') {
    setTimeout(() => {
      penActive = false;
    }, 250);
  }

  // Thumbnail sofort aktualisieren
  updateThumbnailFromCanvas();

  // Debounced Auto-Save zum Server (1 Sekunde nach letztem Strich)
  triggerAutoSave();
}

function handlePointerCancel(e) {
  if (e.pointerId === activePointerId) {
    isDrawing = false;
    activePointerId = null;
    penActive = false;
  }
}

function getCanvasPos(e) {
  const rect = noteCanvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const logicalWidth = noteCanvas.width / dpr;
  const logicalHeight = noteCanvas.height / dpr;

  const scaleX = rect.width > 0 ? (logicalWidth / rect.width) : 1;
  const scaleY = rect.height > 0 ? (logicalHeight / rect.height) : 1;

  return {
    x: Math.max(0, Math.min(logicalWidth, (e.clientX - rect.left) * scaleX)),
    y: Math.max(0, Math.min(logicalHeight, (e.clientY - rect.top) * scaleY))
  };
}

function configureContext(pressure = 0.5) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (isEraser) {
    // Radiergummi löscht gezeichnete Pixel
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = currentBaseSize * 3;
    ctx.globalAlpha = 1.0;
  } else if (isHighlighter) {
    // Textmarker: Halbtransparent und breiter
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentBaseSize * 2.5;
    ctx.globalAlpha = 0.45;
  } else {
    // Normaler Stift mit druckempfindlicher Strichstärke
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = currentColor;
    ctx.globalAlpha = 1.0;

    let size = currentBaseSize;
    // Wenn Stylus mit echtem Drucksensor vorliegt
    if (activePointerType === 'pen' && pressure > 0) {
      size = currentBaseSize * (0.4 + pressure * 1.2);
    }
    ctx.lineWidth = Math.max(1, size);
  }
}

function drawStrokePoint(x, y, pressure) {
  ctx.beginPath();
  configureContext(pressure);
  ctx.arc(x, y, ctx.lineWidth / 2, 0, Math.PI * 2);
  if (isEraser) {
    ctx.fill();
  } else {
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
  }
}

function saveUndoState() {
  if (!ctx || !noteCanvas) return;
  const dpr = window.devicePixelRatio || 1;
  const imgData = ctx.getImageData(0, 0, noteCanvas.width, noteCanvas.height);
  undoStack.push(imgData);
  if (undoStack.length > MAX_UNDO) {
    undoStack.shift();
  }
}

function handleUndo() {
  if (undoStack.length === 0 || !ctx || !noteCanvas) return;
  const prevState = undoStack.pop();
  ctx.putImageData(prevState, 0, 0);
  updateThumbnailFromCanvas();
  triggerAutoSave();
}

function clearCanvasLocal() {
  if (!noteCanvas || !ctx) return;
  saveUndoState();
  ctx.clearRect(0, 0, noteCanvas.width, noteCanvas.height);
  updateThumbnailFromCanvas();
}

export function openNoteModal() {
  if (!modalOverlay || !modalCard) return;

  // Zoom-Origin festlegen (startet optisch beim Widget)
  const widget = document.querySelector('.widget[data-type="note"]');
  if (widget) {
    const rect = widget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    modalCard.style.transformOrigin = `${centerX}px ${centerY}px`;
  }

  modalOverlay.removeAttribute('hidden');
  requestAnimationFrame(() => {
    modalOverlay.classList.add('open');
    modalCard.classList.add('zoomed-in');
    
    // Sofortige Layout-Berechnung
    resizeNoteCanvas();

    // Nach Abschluss der CSS-Zoom-Animation (280ms) finale Messung & Resize
    setTimeout(() => {
      resizeNoteCanvas();
    }, 320);

    // Nach Resize Bild bei Bedarf neu aufziehen
    if (thumbnailCanvas && thumbnailCanvas.dataset.lastImage) {
      renderImageToCanvas(thumbnailCanvas.dataset.lastImage, false);
    }
  });
}

export function closeNoteModal() {
  if (!modalOverlay || !modalCard) return;

  modalOverlay.classList.remove('open');
  modalCard.classList.remove('zoomed-in');

  setTimeout(() => {
    modalOverlay.setAttribute('hidden', '');
    // Sofort final synchronisieren
    saveNoteToServer();
  }, 250);
}

function updateThumbnailFromCanvas() {
  if (!noteCanvas || !thumbnailCanvas || !thumbCtx) return;

  const dpr = window.devicePixelRatio || 1;
  const w = thumbnailCanvas.width / dpr;
  const h = thumbnailCanvas.height / dpr;

  thumbCtx.clearRect(0, 0, w, h);
  thumbCtx.drawImage(noteCanvas, 0, 0, w, h);

  // Prüfen ob leer
  const hasContent = checkCanvasHasContent(noteCanvas);
  if (emptyPlaceholder) {
    emptyPlaceholder.style.display = hasContent ? 'none' : 'flex';
  }

  // Bild-DataURL am Thumbnail merken
  try {
    thumbnailCanvas.dataset.lastImage = noteCanvas.toDataURL('image/png');
  } catch (e) {}
}

function checkCanvasHasContent(canvas) {
  try {
    const testCtx = canvas.getContext('2d');
    const pixelBuffer = new Uint32Array(
      testCtx.getImageData(0, 0, canvas.width, canvas.height).data.buffer
    );
    return pixelBuffer.some(color => color !== 0);
  } catch (e) {
    return true;
  }
}

function renderImageToThumbnails(dataUrl) {
  if (!thumbnailCanvas || !thumbCtx || !dataUrl) return;

  const img = new Image();
  img.onload = () => {
    const dpr = window.devicePixelRatio || 1;
    const w = thumbnailCanvas.width / dpr;
    const h = thumbnailCanvas.height / dpr;
    thumbCtx.clearRect(0, 0, w, h);
    thumbCtx.drawImage(img, 0, 0, w, h);
    thumbnailCanvas.dataset.lastImage = dataUrl;

    if (emptyPlaceholder) {
      emptyPlaceholder.style.display = 'none';
    }
  };
  img.src = dataUrl;
}

function renderImageToCanvas(dataUrl, clearFirst = true) {
  if (!noteCanvas || !ctx || !dataUrl) return;

  const img = new Image();
  img.onload = () => {
    const dpr = window.devicePixelRatio || 1;
    const w = noteCanvas.width / dpr;
    const h = noteCanvas.height / dpr;
    if (clearFirst) {
      ctx.clearRect(0, 0, w, h);
    }
    ctx.drawImage(img, 0, 0, w, h);
  };
  img.src = dataUrl;
}

function triggerAutoSave() {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    saveNoteToServer();
  }, 1000);
}

async function saveNoteToServer() {
  if (!noteCanvas) return;

  try {
    const dataUrl = noteCanvas.toDataURL('image/png');
    
    // Server-Call
    await fetch('/api/note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: dataUrl,
        updatedAt: Date.now()
      })
    });
  } catch (err) {
    console.warn('[Note Module] Fehler beim Speichern der Notiz:', err.message);
  }
}

async function syncNoteClearToServer() {
  try {
    await fetch('/api/note', { method: 'DELETE' });
    if (emptyPlaceholder) {
      emptyPlaceholder.style.display = 'flex';
    }
    if (thumbnailCanvas && thumbCtx) {
      const dpr = window.devicePixelRatio || 1;
      thumbCtx.clearRect(0, 0, thumbnailCanvas.width / dpr, thumbnailCanvas.height / dpr);
      delete thumbnailCanvas.dataset.lastImage;
    }
  } catch (err) {
    console.warn('[Note Module] Fehler beim Leeren der Notiz:', err.message);
  }
}

async function loadNoteFromServer() {
  try {
    const res = await fetch('/api/note');
    const json = await res.json();
    if (json.success && json.note && json.note.image) {
      renderImageToThumbnails(json.note.image);
    } else {
      if (emptyPlaceholder) {
        emptyPlaceholder.style.display = 'flex';
      }
    }
  } catch (err) {
    console.warn('[Note Module] Notiz konnte nicht geladen werden:', err.message);
  }
}
