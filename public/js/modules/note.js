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

// Undo Stack (Offscreen-Canvas Snapshots)
const undoStack = [];
const MAX_UNDO = 15;

// Flag ob Notiz Zeichnungsinhalt hat
let hasDrawnContent = false;

// Cached BoundingBox und Skalierung für 0ms Latenz bei PointerMove
let cachedRect = null;
let cachedScaleX = 1;
let cachedScaleY = 1;

// Auto-Save Debounce Timer
let autoSaveTimer = null;

export function setNoteTheme(theme) {
  const validThemes = ['yellow', 'blue', 'green', 'pink', 'white', 'purple'];
  const activeTheme = validThemes.includes(theme) ? theme : 'yellow';
  document.documentElement.setAttribute('data-note-theme', activeTheme);
  localStorage.setItem('note_theme', activeTheme);

  const select = document.getElementById('settingNoteColor');
  if (select && select.value !== activeTheme) {
    select.value = activeTheme;
  }
}

export function initNote(socket) {
  globalSocket = socket;

  // Farbschema initialisieren
  const savedTheme = localStorage.getItem('note_theme') || 'yellow';
  setNoteTheme(savedTheme);

  noteCanvas = document.getElementById('noteCanvas');
  thumbnailCanvas = document.getElementById('noteThumbnailCanvas');
  modalOverlay = document.getElementById('noteModalOverlay');
  modalCard = document.getElementById('noteModalCard');
  widgetPaper = document.getElementById('notePaperPreview');
  emptyPlaceholder = document.getElementById('noteEmptyPlaceholder');

  if (!noteCanvas || !thumbnailCanvas || !modalOverlay) return;

  // desynchronized: true aktiviert die Android / Chrome Low-Latency Direct-Ink-Pipeline
  ctx = noteCanvas.getContext('2d', { desynchronized: true });
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

  // Bluetooth Pen Akku-Überwachung initialisieren
  initPenBatteryMonitor();

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

function updateCanvasMetrics() {
  if (!noteCanvas) return;
  cachedRect = noteCanvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const logicalWidth = noteCanvas.width / dpr;
  const logicalHeight = noteCanvas.height / dpr;

  cachedScaleX = cachedRect.width > 0 ? (logicalWidth / cachedRect.width) : 1;
  cachedScaleY = cachedRect.height > 0 ? (logicalHeight / cachedRect.height) : 1;
}

function getCanvasPos(e) {
  if (!cachedRect) updateCanvasMetrics();
  const dpr = window.devicePixelRatio || 1;
  const logicalWidth = noteCanvas.width / dpr;
  const logicalHeight = noteCanvas.height / dpr;

  return {
    x: Math.max(0, Math.min(logicalWidth, (e.clientX - cachedRect.left) * cachedScaleX)),
    y: Math.max(0, Math.min(logicalHeight, (e.clientY - cachedRect.top) * cachedScaleY))
  };
}

function handlePointerDown(e) {
  // Palm Rejection: Wenn ein Pen aktiv ist, ignorieren wir Touch-Events von aufgelegten Handflächen
  if (penActive && e.pointerType === 'touch') {
    return;
  }

  if (e.pointerType === 'pen') {
    penActive = true;
    checkPenBattery();
  }

  // Pointer Capture für saubere Strichführung auch bei schnellen Bewegungen
  try {
    noteCanvas.setPointerCapture(e.pointerId);
  } catch (err) {}

  activePointerId = e.pointerId;
  activePointerType = e.pointerType;
  isDrawing = true;

  // Geometrie für diesen Strich cachen (eliminiert teure DOM-Reflows bei jedem PointerMove)
  updateCanvasMetrics();

  // Schneller GPU-Snapshot vor dem neuen Strich (0ms Latenz)
  saveUndoState();

  const pos = getCanvasPos(e);
  lastX = pos.x;
  lastY = pos.y;
  const pressure = (e.pressure && e.pressure > 0) ? e.pressure : 0.5;
  points = [{ x: pos.x, y: pos.y, pressure: pressure }];

  hasDrawnContent = true;
  // Sofort einen Punkt malen (für kurzes Antippen z. B. i-Punkte)
  drawStrokePoint(pos.x, pos.y, pressure);
}

function renderStrokeStep(pos, pressure) {
  points.push({ x: pos.x, y: pos.y, pressure: pressure });

  if (points.length === 2) {
    // Sofortige direkte Linie zwischen Startpunkt und Folgebild (beseitigt Lag beim Strichansetzen)
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    configureContext(points[1].pressure);
    ctx.stroke();
  } else if (points.length >= 3) {
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

function handlePointerMove(e) {
  if (!isDrawing || e.pointerId !== activePointerId) return;
  if (penActive && e.pointerType === 'touch') return;

  // Alle zwischengespeicherten Hardware-Sub-Events des Stylus (120Hz/240Hz Digitizer) auswerten
  const events = (typeof e.getCoalescedEvents === 'function') ? e.getCoalescedEvents() : [e];
  for (let i = 0; i < events.length; i++) {
    const subEvent = events[i];
    const pos = getCanvasPos(subEvent);
    const pressure = (subEvent.pressure && subEvent.pressure > 0) ? subEvent.pressure : 0.5;
    renderStrokeStep(pos, pressure);
  }
}

function handlePointerUp(e) {
  if (!isDrawing || e.pointerId !== activePointerId) return;

  try {
    noteCanvas.releasePointerCapture(e.pointerId);
  } catch (err) {}

  // Letzten Punkt sauber vollenden
  if (points.length >= 2) {
    const lastP = points[points.length - 1];
    const secondLastP = points[points.length - 2];
    ctx.beginPath();
    ctx.moveTo((secondLastP.x + lastP.x) / 2, (secondLastP.y + lastP.y) / 2);
    ctx.lineTo(lastP.x, lastP.y);
    configureContext(lastP.pressure);
    ctx.stroke();
  }

  isDrawing = false;
  activePointerId = null;
  points = [];

  // Nach Stiftende kurze Pause vor Palm-Freigabe
  if (e.pointerType === 'pen') {
    setTimeout(() => {
      penActive = false;
    }, 200);
  }

  // Leichtes Thumbnail-Update ohne teures toDataURL()
  updateThumbnailFast();

  // Debounced Auto-Save zum Server (1 Sekunde nach letztem Strich)
  triggerAutoSave();
}

function handlePointerCancel(e) {
  if (e.pointerId === activePointerId) {
    isDrawing = false;
    activePointerId = null;
    penActive = false;
    points = [];
  }
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
  if (!ctx || !noteCanvas || noteCanvas.width === 0) return;
  // Extrem schneller Offscreen-Canvas GPU-Texture-Copy (dauert < 1ms statt 200ms getImageData)
  const backup = document.createElement('canvas');
  backup.width = noteCanvas.width;
  backup.height = noteCanvas.height;
  const bCtx = backup.getContext('2d');
  bCtx.drawImage(noteCanvas, 0, 0);
  undoStack.push(backup);
  if (undoStack.length > MAX_UNDO) {
    undoStack.shift();
  }
}

function handleUndo() {
  if (undoStack.length === 0 || !ctx || !noteCanvas) return;
  const prevState = undoStack.pop();
  const dpr = window.devicePixelRatio || 1;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, noteCanvas.width, noteCanvas.height);
  ctx.drawImage(prevState, 0, 0);
  ctx.restore();

  if (undoStack.length === 0) {
    clearCanvasLocal();
    syncNoteClearToServer();
  } else {
    hasDrawnContent = true;
    updateThumbnailFast();
    triggerAutoSave();
  }
}

function clearCanvasLocal() {
  if (!noteCanvas || !ctx) return;
  saveUndoState();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, noteCanvas.width, noteCanvas.height);
  ctx.restore();
  hasDrawnContent = false;
  if (thumbnailCanvas && thumbCtx) {
    const dpr = window.devicePixelRatio || 1;
    thumbCtx.clearRect(0, 0, thumbnailCanvas.width / dpr, thumbnailCanvas.height / dpr);
    delete thumbnailCanvas.dataset.lastImage;
  }
  if (emptyPlaceholder) {
    emptyPlaceholder.style.display = 'flex';
  }
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

    // Nach Resize Bild nur aufziehen, wenn tatsächlich Inhalt vorhanden ist
    if (hasDrawnContent && thumbnailCanvas && thumbnailCanvas.dataset.lastImage) {
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
    // Nur speichern, wenn Inhalt gezeichnet wurde
    if (hasDrawnContent) {
      saveNoteToServer();
    }
  }, 250);
}

function updateThumbnailFast() {
  if (!noteCanvas || !thumbnailCanvas || !thumbCtx) return;

  const dpr = window.devicePixelRatio || 1;
  const w = thumbnailCanvas.width / dpr;
  const h = thumbnailCanvas.height / dpr;

  thumbCtx.clearRect(0, 0, w, h);
  if (hasDrawnContent) {
    thumbCtx.drawImage(noteCanvas, 0, 0, w, h);
  }

  if (emptyPlaceholder) {
    emptyPlaceholder.style.display = hasDrawnContent ? 'none' : 'flex';
  }
}

function renderImageToThumbnails(dataUrl) {
  if (!thumbnailCanvas || !thumbCtx) return;

  if (!dataUrl || typeof dataUrl !== 'string' || dataUrl.trim() === '') {
    hasDrawnContent = false;
    delete thumbnailCanvas.dataset.lastImage;
    const dpr = window.devicePixelRatio || 1;
    thumbCtx.clearRect(0, 0, thumbnailCanvas.width / dpr, thumbnailCanvas.height / dpr);
    if (emptyPlaceholder) emptyPlaceholder.style.display = 'flex';
    return;
  }

  const img = new Image();
  img.onload = () => {
    const dpr = window.devicePixelRatio || 1;
    const w = thumbnailCanvas.width / dpr;
    const h = thumbnailCanvas.height / dpr;
    thumbCtx.clearRect(0, 0, w, h);
    thumbCtx.drawImage(img, 0, 0, w, h);

    // Prüfen, ob das Bild tatsächlich gezeichnete Pixel hat (nicht nur transparent ist)
    let isBlank = true;
    try {
      const checkW = Math.min(Math.floor(thumbnailCanvas.width), 160);
      const checkH = Math.min(Math.floor(thumbnailCanvas.height), 160);
      const imgData = thumbCtx.getImageData(0, 0, checkW, checkH).data;
      for (let i = 3; i < imgData.length; i += 16) {
        if (imgData[i] > 15) {
          isBlank = false;
          break;
        }
      }
    } catch (e) {
      isBlank = false;
    }

    if (isBlank) {
      hasDrawnContent = false;
      delete thumbnailCanvas.dataset.lastImage;
      thumbCtx.clearRect(0, 0, w, h);
      if (emptyPlaceholder) emptyPlaceholder.style.display = 'flex';
      // Server bereinigen falls leeres Bild gespeichert war
      syncNoteClearToServer();
    } else {
      hasDrawnContent = true;
      thumbnailCanvas.dataset.lastImage = dataUrl;
      if (emptyPlaceholder) emptyPlaceholder.style.display = 'none';
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

  // Wenn keine Inhalte vorhanden sind, niemals ein leeres transparentes PNG speichern!
  if (!hasDrawnContent) {
    if (thumbnailCanvas && thumbnailCanvas.dataset.lastImage) {
      delete thumbnailCanvas.dataset.lastImage;
      syncNoteClearToServer();
    }
    return;
  }

  try {
    const dataUrl = noteCanvas.toDataURL('image/png');
    if (thumbnailCanvas) {
      thumbnailCanvas.dataset.lastImage = dataUrl;
    }
    
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

// Stylus / Bluetooth Pen Akku-Anzeige
export function updatePenBatteryUI(level, name = 'Lenovo Tab Pen Plus') {
  const widgetBadge = document.getElementById('notePenBattery');
  const modalBadge = document.getElementById('noteModalPenBattery');
  const widgetIcon = document.getElementById('notePenBatIcon');
  const modalIcon = document.getElementById('noteModalPenBatIcon');
  const widgetText = document.getElementById('notePenBatText');
  const modalText = document.getElementById('noteModalPenBatText');

  // Falls ungültig oder nicht verbunden (< 0), Badges ausblenden
  if (level == null || typeof level !== 'number' || isNaN(level) || level < 0) {
    if (widgetBadge) widgetBadge.style.display = 'none';
    if (modalBadge) modalBadge.style.display = 'none';
    return;
  }

  const clampedLevel = Math.max(0, Math.min(100, Math.round(level)));
  const textStr = `${clampedLevel}%`;
  const titleStr = `${name || 'Stylus'}: ${textStr}`;

  // Icon je nach Ladezustand
  let iconClass = 'fa-battery-full';
  if (clampedLevel <= 15) {
    iconClass = 'fa-battery-empty';
  } else if (clampedLevel <= 35) {
    iconClass = 'fa-battery-quarter';
  } else if (clampedLevel <= 65) {
    iconClass = 'fa-battery-half';
  } else if (clampedLevel <= 85) {
    iconClass = 'fa-battery-three-quarters';
  }

  // Farbklasse je nach Ladezustand
  let statusClass = 'battery-good';
  if (clampedLevel <= 20) {
    statusClass = 'battery-low';
  } else if (clampedLevel <= 50) {
    statusClass = 'battery-medium';
  }

  const updateBadge = (badge, icon, text) => {
    if (!badge) return;
    badge.style.display = 'inline-flex';
    badge.title = titleStr;
    badge.classList.remove('battery-good', 'battery-medium', 'battery-low');
    badge.classList.add(statusClass);

    if (text) text.textContent = textStr;
    if (icon) {
      icon.className = `fas ${iconClass}`;
    }
  };

  updateBadge(widgetBadge, widgetIcon, widgetText);
  updateBadge(modalBadge, modalIcon, modalText);
}

export function checkPenBattery() {
  if (typeof window !== 'undefined' && window.AndroidPen && typeof window.AndroidPen.getBatteryLevel === 'function') {
    try {
      const level = window.AndroidPen.getBatteryLevel();
      const name = (typeof window.AndroidPen.getPenName === 'function') ? window.AndroidPen.getPenName() : 'Lenovo Tab Pen Plus';
      updatePenBatteryUI(level, name);
    } catch (err) {
      console.warn('[Note Module] Fehler beim Abfragen von AndroidPen:', err.message);
    }
  }
}

function initPenBatteryMonitor() {
  // 1. Android Event Listener (vom Kiosk Bridge oder CustomEvent)
  window.addEventListener('pen-battery-update', (e) => {
    if (e && e.detail && typeof e.detail.level === 'number') {
      updatePenBatteryUI(e.detail.level, e.detail.name);
    }
  });

  // 2. Aktualisierung bei jeder Stifteingabe auf dem Bildschirm
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'pen') {
      checkPenBattery();
    }
  }, { passive: true });

  // 3. Initialer Statuscheck
  checkPenBattery();

  // 4. Regelmäßiges Polling alle 30 Sekunden
  setInterval(checkPenBattery, 30000);
}

