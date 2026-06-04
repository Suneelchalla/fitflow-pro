// ════════════════════════════════════════════════════════════════════
// FITFLOW PRO — Activity Video Generator  (run-video.js  v1)
//
// Produces a portrait MP4/WebM video of the user's GPS activity:
//
//   Phase 1 — INTRO (60 frames, 2 s)
//     Dark background, activity emoji + type fades in, location pill slides up.
//
//   Phase 2 — ROUTE ANIMATION (~fps * routeSecs frames)
//     The route line draws itself progressively along the GPS track.
//     A glowing dot leads the line. Live stats (distance, time, pace,
//     speed) update as each GPS segment is revealed.
//     Map tiles are pre-rendered into an off-screen canvas so the
//     background matches the app's dark map exactly.
//
//   Phase 3 — OUTRO (120 frames, 4 s)
//     Full route visible. Stats panel slides up with final numbers.
//     FitFlow Pro branding fades in. Holds for 2 s then video ends.
//
// Technical approach:
//   • Single <canvas> driven by requestAnimationFrame (or a manual
//     frame loop when OffscreenCanvas isn't available).
//   • MediaRecorder captures the canvas stream at ~30 fps.
//   • Tiles are fetched once into an ImageBitmap cache before recording
//     starts so no async work happens inside the frame loop.
//   • Uses the same _simplifyRDP + _chaikinSmooth pipeline as the
//     live map so the video route looks identical to the app map.
//   • Falls back gracefully: no tiles → plain dark grid;
//     no MediaRecorder → PNG sequence download is NOT offered
//     (too heavy for mobile) — instead an informative toast is shown.
//
// Public API (called from running.js / index.html):
//   generateActivityVideo(log)   — log is a saved run-log object
//   generateActivityVideoFromSession()  — called right after stopRun()
//                                         before session is cleared
// ════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  // ── CONSTANTS ───────────────────────────────────────────────────
  const FPS          = 30;
  const INTRO_FRAMES = 60;   // 2 s
  const OUTRO_FRAMES = 120;  // 4 s
  const W            = 1080;
  const H            = 1920;
  const MIME_TYPES   = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];

  // Map tile helpers (same as running.js _drawMapWithTiles)
  const TILE_SIZE       = 256;
  const TILE_SUBDOMAINS = ['a', 'b', 'c', 'd'];
  function lon2x(lon, z) { return (lon + 180) / 360 * Math.pow(2, z); }
  function lat2y(lat, z) {
    const r = lat * Math.PI / 180;
    return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * Math.pow(2, z);
  }
  function pickZoom(minLat, maxLat, minLon, maxLon, tw, th) {
    for (let z = 17; z >= 3; z--) {
      const pw = (lon2x(maxLon, z) - lon2x(minLon, z)) * TILE_SIZE;
      const ph = (lat2y(minLat, z) - lat2y(maxLat, z)) * TILE_SIZE;
      if (pw <= tw * 0.88 && ph <= th * 0.88) return z;
    }
    return 3;
  }

  // ── TILE FETCHER ─────────────────────────────────────────────────
  // Full-bleed: tiles fill the ENTIRE fullW×fullH canvas, while the route is
  // fitted into the band [routeTop, routeBottom] (the area above the card).
  // Map and route share one projection, so the route stays glued to its roads
  // and the satellite imagery bleeds to every edge.
  async function fetchTiles(coords, fullW, fullH, routeTop, routeBottom) {
    if (!coords || coords.length < 2) return null;
    try {
      const lats = coords.map(c => c[0]), lons = coords.map(c => c[1]);
      let minLat = Math.min(...lats), maxLat = Math.max(...lats);
      let minLon = Math.min(...lons), maxLon = Math.max(...lons);
      
      // Tightened padding so the map track renders closer
      const pLat = (maxLat - minLat) * 0.05 || 0.0015;
      const pLon = (maxLon - minLon) * 0.05 || 0.0015;
      minLat -= pLat; maxLat += pLat;
      minLon -= pLon; maxLon += pLon;

      const regionH = routeBottom - routeTop;
      // Zoom so the padded route fits inside fullW × regionH at native scale.
      let z = 17;
      for (; z >= 3; z--) {
        const pw = (lon2x(maxLon, z) - lon2x(minLon, z)) * TILE_SIZE;
        const ph = (lat2y(minLat, z) - lat2y(maxLat, z)) * TILE_SIZE;
        if (pw <= fullW * 0.95 && ph <= regionH * 0.95) break; 
      }

      // Route centre in world pixels (native zoom, scale = 1)
      const cxW = ((lon2x(minLon, z) + lon2x(maxLon, z)) / 2) * TILE_SIZE;
      const cyW = ((lat2y(maxLat, z) + lat2y(minLat, z)) / 2) * TILE_SIZE;
      const routeCy = (routeTop + routeBottom) / 2;
      // World-pixel coordinate that maps to canvas (0,0)
      const offWx = cxW - fullW / 2;
      const offWy = cyW - routeCy;
      const toCanvasX = lon => lon2x(lon, z) * TILE_SIZE - offWx;
      const toCanvasY = lat => lat2y(lat, z) * TILE_SIZE - offWy;

      // Every tile whose footprint touches the full canvas
      const maxIdx = Math.pow(2, z);
      const txMin = Math.floor(offWx / TILE_SIZE);
      const txMax = Math.floor((offWx + fullW) / TILE_SIZE);
      const tyMin = Math.floor(offWy / TILE_SIZE);
      const tyMax = Math.floor((offWy + fullH) / TILE_SIZE);

      const loadImg = url => new Promise(res => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload  = () => res(img);
        img.onerror = () => res(null);
        img.src = url;
      });
      const jobs = [], meta = [];
      for (let tx = txMin; tx <= txMax; tx++) {
        for (let ty = tyMin; ty <= tyMax; ty++) {
          if (ty < 0 || ty >= maxIdx) continue;            // off the world vertically
          const wx = ((tx % maxIdx) + maxIdx) % maxIdx;     // wrap longitude
          const base = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${ty}/${wx}`;
          const lbls = `https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/${z}/${ty}/${wx}`;
          jobs.push(Promise.all([loadImg(base), loadImg(lbls)]));
          meta.push({ tx, ty });
        }
      }
      const tilePairs = await Promise.all(jobs);
      const loaded = tilePairs.filter(([b]) => b).length;
      if (loaded < tilePairs.length * 0.4) return null;

      const tc  = document.createElement('canvas');
      tc.width  = fullW; tc.height = fullH;
      const tctx = tc.getContext('2d');
      tctx.fillStyle = '#0d1520';
      tctx.fillRect(0, 0, fullW, fullH);
      tilePairs.forEach(([base], i) => {
        if (!base) return;
        const { tx, ty } = meta[i];
        tctx.drawImage(base, tx * TILE_SIZE - offWx, ty * TILE_SIZE - offWy, TILE_SIZE, TILE_SIZE);
      });
      tilePairs.forEach(([, lbl], i) => {
        if (!lbl) return;
        const { tx, ty } = meta[i];
        tctx.drawImage(lbl, tx * TILE_SIZE - offWx, ty * TILE_SIZE - offWy, TILE_SIZE, TILE_SIZE);
      });
      tctx.fillStyle = 'rgba(4,12,8,0.14)';
      tctx.fillRect(0, 0, fullW, fullH);

      return { canvas: tc, toCanvasX, toCanvasY };
    } catch (e) {
      console.warn('[VideoGen] tile fetch failed:', e.message);
      return null;
    }
  }

  // ── FALLBACK GRID BACKGROUND ─────────────────────────────────────
  function makeFallbackBg(fullW, fullH, routeTop, routeBottom) {
    const tc   = document.createElement('canvas');
    tc.width   = fullW; tc.height = fullH;
    const tctx = tc.getContext('2d');
    tctx.fillStyle = '#071510';
    tctx.fillRect(0, 0, fullW, fullH);
    tctx.strokeStyle = 'rgba(255,255,255,0.04)';
    tctx.lineWidth   = 1;
    for (let x = 0; x < fullW; x += 80) {
      tctx.beginPath(); tctx.moveTo(x, 0); tctx.lineTo(x, fullH); tctx.stroke();
    }
    for (let y = 0; y < fullH; y += 80) {
      tctx.beginPath(); tctx.moveTo(0, y); tctx.lineTo(fullW, y); tctx.stroke();
    }
    // Project route into [routeTop, routeBottom] across the full width.
    const padX = 0.05, padY = 0.05, regionH = routeBottom - routeTop;
    const toCanvasX = (lon, meta) => {
      const { minLon, maxLon } = meta;
      return fullW * padX + ((lon - minLon) / (maxLon - minLon || 0.001)) * fullW * (1 - padX * 2);
    };
    const toCanvasY = (lat, meta) => {
      const { minLat, maxLat } = meta;
      return routeTop + regionH * padY + ((maxLat - lat) / (maxLat - minLat || 0.001)) * regionH * (1 - padY * 2);
    };
    return { canvas: tc, toCanvasX, toCanvasY };
  }

  // ── ROUNDRECT HELPER ─────────────────────────────────────────────
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ── EASING ───────────────────────────────────────────────────────
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // ── PROGRESS MODAL ───────────────────────────────────────────────
  function showProgressModal() {
    const existing = document.getElementById('video-gen-modal');
    if (existing) existing.remove();

    const el  = document.createElement('div');
    el.id     = 'video-gen-modal';
    el.style.cssText = `
      position:fixed;inset:0;z-index:99999;
      background:rgba(0,0,0,0.82);backdrop-filter:blur(10px);
      display:flex;align-items:flex-end;justify-content:center;
    `;
    el.innerHTML = `
      <div style="
        background:#071510;border-radius:24px 24px 0 0;
        padding:28px 24px 48px;width:100%;max-width:480px;
        border:1px solid rgba(67,160,90,0.25);border-bottom:none;
      ">
        <div style="text-align:center;margin-bottom:20px">
          <div style="font-size:44px;margin-bottom:10px">🎬</div>
          <div style="font-size:18px;font-weight:700;margin-bottom:5px">Creating Your Video</div>
          <div id="vg-status" style="font-size:13px;color:rgba(255,255,255,0.55)">Preparing route…</div>
        </div>
        <div style="background:rgba(255,255,255,0.08);border-radius:8px;height:6px;overflow:hidden;margin-bottom:16px">
          <div id="vg-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#2e7d46,#43d17a);border-radius:8px;transition:width .3s ease"></div>
        </div>
        <div id="vg-cancel-row" style="text-align:center">
          <button id="vg-cancel-btn"
            style="background:transparent;border:1px solid rgba(255,255,255,0.2);
              color:rgba(255,255,255,0.5);padding:10px 28px;border-radius:20px;
              font-size:14px;cursor:pointer">
            Cancel
          </button>
        </div>
        <div id="vg-done-row" style="display:none;gap:10px">
          <button id="vg-save-btn"
            style="flex:1;padding:14px;border-radius:14px;border:none;
              background:linear-gradient(135deg,#2e7d46,#43a05a);
              color:#fff;font-size:15px;font-weight:700;cursor:pointer">
            ⬇ Save Video
          </button>
          <button id="vg-share-btn"
            style="padding:14px 18px;border-radius:14px;
              border:1px solid rgba(67,160,90,0.4);
              background:rgba(67,160,90,0.1);
              color:#7ed9a0;font-size:14px;font-weight:600;cursor:pointer">
            Share ↗
          </button>
          <button id="vg-close-btn"
            style="padding:14px 14px;border-radius:14px;
              border:1px solid rgba(255,255,255,0.15);
              background:transparent;color:rgba(255,255,255,0.5);
              font-size:14px;cursor:pointer">
            ✕
          </button>
        </div>
      </div>`;
    document.body.appendChild(el);
    return el;
  }

  function setProgress(modal, pct, statusText) {
    const bar    = modal.querySelector('#vg-bar');
    const status = modal.querySelector('#vg-status');
    if (bar)    bar.style.width    = clamp(pct, 0, 100) + '%';
    if (status && statusText) status.textContent = statusText;
  }

  function showDone(modal, blob, filename) {
    modal.querySelector('#vg-cancel-row').style.display = 'none';
    const doneRow = modal.querySelector('#vg-done-row');
    doneRow.style.display = 'flex';
    setProgress(modal, 100, 'Video ready! 🎉');

    const saveBtn  = modal.querySelector('#vg-save-btn');
    const shareBtn = modal.querySelector('#vg-share-btn');
    const closeBtn = modal.querySelector('#vg-close-btn');

    saveBtn.addEventListener('click', () => _downloadBlob(blob, filename));
    shareBtn.addEventListener('click', () => _shareOrDownload(blob, filename));
    closeBtn.addEventListener('click', () => modal.remove());
  }

  function showError(modal, msg) {
    setProgress(modal, 0, msg || 'Video generation failed.');
    const cancelRow = modal.querySelector('#vg-cancel-row');
    if (cancelRow) {
      cancelRow.innerHTML = `
        <button onclick="document.getElementById('video-gen-modal')?.remove()"
          style="background:transparent;border:1px solid rgba(239,83,80,0.4);
            color:#ef5350;padding:10px 28px;border-radius:20px;font-size:14px;cursor:pointer">
          Close
        </button>`;
    }
  }

  // ── DOWNLOAD / SHARE ─────────────────────────────────────────────
  function _downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function _shareOrDownload(blob, name) {
    const file = new File([blob], name, { type: blob.type });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ title: 'FitFlow Pro Activity', files: [file] })
        .catch(() => _downloadBlob(blob, name));
    } else {
      _downloadBlob(blob, name);
    }
  }

  // ── MAIN GENERATOR ───────────────────────────────────────────────
  async function _generate(log) {
    // Check MediaRecorder support
    const supportedMime = MIME_TYPES.find(m => {
      try { return MediaRecorder.isTypeSupported(m); } catch { return false; }
    });
    if (!supportedMime && typeof MediaRecorder === 'undefined') {
      if (typeof showToast === 'function') {
        showToast('Video recording not supported on this browser.', 'info', 4000);
      }
      return;
    }

    const modal = showProgressModal();
    let cancelled = false;
    modal.querySelector('#vg-cancel-btn')?.addEventListener('click', () => {
      cancelled = true;
      modal.remove();
    });

    try {
      // ── 1. Prepare coords ───────────────────────────────────────
      const rawCoords = (log.coords || []).filter(c => c && c.lat != null && c.lon != null);
      if (rawCoords.length < 2) {
        showError(modal, 'Not enough GPS data to create a video.');
        return;
      }

      // Use same simplify+smooth as app map
      const simplifyFn = global._simplifyRDP  || ((c) => c);
      const smoothFn   = global._chaikinSmooth || ((c) => c);
      const raw2       = rawCoords.map(c => [c.lat, c.lon]);
      const simplified = raw2.length > 3 ? simplifyFn(raw2, 4) : raw2;
      const smoothed   = smoothFn(simplified, 2);

      setProgress(modal, 8, 'Loading map tiles…');

      // ── 2. Canvas + map region ──────────────────────────────────
      // Portrait 1080×1920 (9:16). FULL-BLEED satellite map fills the whole
      // frame; the route is fitted into the upper band [ROUTE_TOP, ROUTE_BOT]
      // so it always sits clear of the floating glass card at the bottom.
      const mapH     = H;                       // map covers the entire frame
      const mapY     = 0;
      const ROUTE_TOP = Math.round(H * 0.11);
      const ROUTE_BOT = Math.round(H * 0.60);

      // Fetch full-frame tiles, route fitted into the top band
      let tileData = await fetchTiles(smoothed, W, H, ROUTE_TOP, ROUTE_BOT);
      if (cancelled) return;

      // Fallback projection for non-tile case
      const lats   = smoothed.map(p => p[0]);
      const lons   = smoothed.map(p => p[1]);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);
      const minLon = Math.min(...lons), maxLon = Math.max(...lons);

      if (!tileData) {
        tileData = makeFallbackBg(W, H, ROUTE_TOP, ROUTE_BOT);
        // Patch projection to include bounding box
        const origX = tileData.toCanvasX;
        const origY = tileData.toCanvasY;
        tileData.toCanvasX = lon => origX(lon, { minLon, maxLon });
        tileData.toCanvasY = lat => origY(lat, { minLat, maxLat });
      }

      // Pre-project all route points to canvas coords
      const projPts = smoothed.map(p => ({
        px: tileData.toCanvasX(p[1]),
        py: tileData.toCanvasY(p[0]) + mapY,
      }));

      setProgress(modal, 18, 'Setting up recording…');

      // ── 3. Set up canvas + MediaRecorder ───────────────────────
      const cv  = document.createElement('canvas');
      cv.width  = W; cv.height = H;
      const ctx = cv.getContext('2d', { alpha: false });

      let stream, recorder, chunks = [];
      try {
        stream   = cv.captureStream(FPS);
        recorder = new MediaRecorder(stream, {
          mimeType:       supportedMime || '',
          videoBitsPerSecond: 12_000_000,   // 12 Mbps — crisp 1080×1920 (9:16) output
        });
        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      } catch (e) {
        showError(modal, 'Could not start video recorder: ' + e.message);
        return;
      }

      // ── 4. Pre-compute per-frame data ───────────────────────────
      const meta     = (global.ACTIVITY_META || {})[log.activityType || 'run']
                    || { emoji:'🏃', label:'Run', kcalPerKm:70, color:'#43a05a' };
      const elapsed  = log.duration  || 0;
      const distance = log.distance  || 0;
      const kcal     = Math.round(distance * meta.kcalPerKm);
      const speedKph = elapsed > 0 ? (distance / elapsed * 3600) : 0;
      const fmtT     = global.fmtTime  || (s => Math.floor(s/60)+':'+(s%60).toString().padStart(2,'0'));
      const fmtP     = global.fmtPace  || ((km,s) => km>0 ? Math.floor(s/60/km)+':'+(Math.round(s/km%60)).toString().padStart(2,'0') : '--:--');
      const titleStr = log.title || (meta.label + ' Activity');
      const locStr   = log.locationName || '';
      const dateStr  = (() => {
        try {
          return new Date(log.timestamp || log.date).toLocaleDateString('en-IN',
            { weekday:'short', day:'numeric', month:'short', year:'numeric' });
        } catch { return log.date || ''; }
      })();

      // Scale route animation 9–14 s based on activity distance:
      //   ≤ 2 km  → 9 s   (short run / walk)
      //   ≥ 100 km → 14 s   (long run / cycle / ultra)
      // Total video length will be: 2s intro + (9-14s) route + 4s outro = 15-20s total.
      const routeSecs    = Math.round(clamp(9 + (distance - 2) / (100 - 2) * (14 - 9), 9, 14));
      const ROUTE_FRAMES = FPS * routeSecs;
      const TOTAL_FRAMES = INTRO_FRAMES + ROUTE_FRAMES + OUTRO_FRAMES;

      // Densify projPts: insert interpolated points every STEP px along each
      // segment so the line always advances smoothly between GPS fixes.
      // Without this, sparse GPS (1 fix/sec) causes visible jumps even though
      // pointAtProgress() interpolates correctly — the issue is the stroke
      // from pts[0..n] snaps at each new integer index.
      const DENSE_STEP = 4; // px between inserted points
      const densePts = [projPts[0]];
      for (let i = 1; i < projPts.length; i++) {
        const dx  = projPts[i].px - projPts[i-1].px;
        const dy  = projPts[i].py - projPts[i-1].py;
        const len = Math.sqrt(dx*dx + dy*dy);
        const steps = Math.max(1, Math.floor(len / DENSE_STEP));
        for (let s = 1; s <= steps; s++) {
          const f = s / steps;
          densePts.push({
            px: projPts[i-1].px + dx * f,
            py: projPts[i-1].py + dy * f,
          });
        }
      }

      // Map distance along smoothed path per frame
      // Build cumulative distances array over the densified path
      const cumDist = [0];
      for (let i = 1; i < densePts.length; i++) {
        const dx = densePts[i].px - densePts[i-1].px;
        const dy = densePts[i].py - densePts[i-1].py;
        cumDist.push(cumDist[i-1] + Math.sqrt(dx*dx + dy*dy));
      }
      const totalPxDist = cumDist[cumDist.length - 1] || 1;

      // For a given 0-1 progress, find the exact canvas point along the
      // densified path. Binary search + linear interpolation within segment.
      function pointAtProgress(t) {
        const target = t * totalPxDist;
        let lo = 0, hi = densePts.length - 1;
        while (lo < hi - 1) {
          const mid = (lo + hi) >> 1;
          if (cumDist[mid] < target) lo = mid; else hi = mid;
        }
        const segLen = cumDist[hi] - cumDist[lo] || 1;
        const segT   = (target - cumDist[lo]) / segLen;
        return {
          px: densePts[lo].px + (densePts[hi].px - densePts[lo].px) * segT,
          py: densePts[lo].py + (densePts[hi].py - densePts[lo].py) * segT,
        };
      }

      // Interpolate live stats at a given route progress t
      function statsAtProgress(t) {
        const distNow  = distance * t;
        const timeNow  = elapsed  * t;
        const speedNow = speedKph; // keep avg speed constant for simplicity
        return {
          dist:  distNow.toFixed(2) + ' km',
          time:  fmtT(Math.round(timeNow)),
          pace:  fmtP(distNow, Math.round(timeNow)),
          speed: speedNow.toFixed(1) + ' km/h',
          kcal:  Math.round(kcal * t) + ' kcal',
        };
      }

      setProgress(modal, 25, 'Rendering frames…');

      // ── 5. FRAME LOOP (real-time paced) ────────────────────────
      // captureStream(FPS) samples the canvas on its own ~30 fps clock, so the
      // draw loop must advance ONE frame per (1000/FPS) ms of WALL-CLOCK time.
      // The old setTimeout(…, 0) ran every frame as fast as the CPU allowed, so
      // the whole animation finished in ~3 s of wall clock while the recorder
      // only sampled 30 frames/sec — the result played far too fast and looked
      // choppy. Pacing each frame to its real-time slot (with drift correction)
      // makes the recorded duration and smoothness correct.
      const FRAME_MS = 1000 / FPS;
      recorder.start();

      let frameIndex = 0;
      let lastProgressUpdate = 0;
      const renderStart = performance.now();

      // ── Crossfade setup ────────────────────────────────────────
      // Two offscreen buffers let us blend across phase boundaries: the
      // outgoing phase is frozen on its final frame while the incoming phase
      // fades in over it (title→map, then map→summary).
      const _mkBuf = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c.getContext('2d', { alpha: false }); };
      const offA = _mkBuf(), offB = _mkBuf();
      const B1    = INTRO_FRAMES;                       // intro → route boundary
      const B2    = INTRO_FRAMES + ROUTE_FRAMES;        // route → outro boundary
      const TRANS = Math.max(6, Math.min(15, Math.floor(ROUTE_FRAMES / 3))); // ~0.5 s
      const smooth = p => p * p * (3 - 2 * p);          // smoothstep easing

      function renderPhaseInto(c, f) {
        c.fillStyle = '#040f08'; c.fillRect(0, 0, W, H);
        if (f < INTRO_FRAMES) {
          _drawIntroFrame(c, f, meta, titleStr, locStr, dateStr, tileData, mapH, projPts);
        } else if (f < B2) {
          const t = (f - INTRO_FRAMES) / ROUTE_FRAMES;  // linear — constant px/frame
          _drawRouteFrame(c, t, meta, tileData, mapH, projPts, densePts, cumDist,
            totalPxDist, pointAtProgress, statsAtProgress, locStr);
        } else {
          const t = easeOut((f - B2) / OUTRO_FRAMES);
          _drawOutroFrame(c, t, meta, tileData, mapH, projPts, densePts,
            titleStr, locStr, dateStr, distance, elapsed, kcal, speedKph, fmtT, fmtP);
        }
      }

      function drawFrame() {
        if (cancelled) { try { recorder.stop(); } catch {} return; }

        const f = frameIndex;

        // Are we inside a boundary crossfade?
        let inTrans = false, p = 0, prevF = 0;
        if (f >= B1 && f < B1 + TRANS)      { inTrans = true; p = (f - B1 + 1) / TRANS; prevF = B1 - 1; }
        else if (f >= B2 && f < B2 + TRANS) { inTrans = true; p = (f - B2 + 1) / TRANS; prevF = B2 - 1; }

        if (inTrans) {
          renderPhaseInto(offA, prevF);                 // outgoing, frozen on last frame
          renderPhaseInto(offB, f);                     // incoming, live
          ctx.globalAlpha = 1;          ctx.drawImage(offA.canvas, 0, 0);
          ctx.globalAlpha = smooth(p);  ctx.drawImage(offB.canvas, 0, 0);
          ctx.globalAlpha = 1;
        } else {
          renderPhaseInto(ctx, f);
        }

        _roundCorners(ctx);   // curved frame corners (rounded "map" look)

        frameIndex++;

        // Progress update throttled to every 15 frames
        if (frameIndex - lastProgressUpdate >= 15) {
          lastProgressUpdate = frameIndex;
          const pct = 25 + Math.round((frameIndex / TOTAL_FRAMES) * 65);
          setProgress(modal, pct, `Rendering… ${Math.round(frameIndex / TOTAL_FRAMES * 100)}%`);
        }

        if (frameIndex < TOTAL_FRAMES) {
          // Schedule the next frame at its exact wall-clock slot. If a draw runs
          // long, delay clamps to 0 so we catch up without drifting slower.
          const nextAt = renderStart + frameIndex * FRAME_MS;
          const delay  = Math.max(0, nextAt - performance.now());
          setTimeout(drawFrame, delay);
        } else {
          // Hold the final outro frame a beat so the recorder captures it, then stop.
          setTimeout(() => { try { recorder.stop(); } catch {} }, FRAME_MS * 2);
        }
      }

      recorder.onstop = () => {
        if (cancelled) return;
        setProgress(modal, 92, 'Encoding video…');
        const blob     = new Blob(chunks, { type: supportedMime || 'video/webm' });
        const ext      = supportedMime?.includes('mp4') ? 'mp4' : 'webm';
        const filename = `fitflow-${(meta.label||'activity').toLowerCase()}-${Date.now()}.${ext}`;
        setProgress(modal, 100, 'Video ready! 🎉');
        showDone(modal, blob, filename);
      };

      recorder.onerror = (e) => {
        showError(modal, 'Recording error: ' + (e.error?.message || 'unknown'));
      };

      // Kick off frame loop
      drawFrame();

    } catch (err) {
      console.error('[VideoGen]', err);
      showError(modal, 'Failed: ' + err.message);
    }
  }

  // ── APPLE-STYLE HELPERS ─────────────────────────────────────────
  // On Android WebView (where the video is generated) -apple-system falls
  // back to Roboto — still a clean system face. The "Apple" feel comes from
  // the glass card, tight numerals and iOS label colours below.
  const _SF   = '-apple-system, "Segoe UI", Roboto, system-ui, Arial, sans-serif';
  const _LBL  = 'rgba(235,235,245,0.62)';   // iOS secondary label
  const _LBL2 = 'rgba(235,235,245,0.40)';   // iOS tertiary label
  function _ls(ctx, v) { try { ctx.letterSpacing = v; } catch (e) {} }
  function _easeBack(t) { const c = 1.70158, c3 = c + 1; return 1 + c3*Math.pow(t-1,3) + c*Math.pow(t-1,2); }

  // Translucent "glass" card — flat dark fill, hairline border, top highlight.
  function _glassCard(ctx, x, y, w, h, r) {
    rrect(ctx, x, y, w, h, r); ctx.fillStyle = 'rgba(16,18,22,0.66)'; ctx.fill();
    rrect(ctx, x, y, w, h, r); ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.save(); rrect(ctx, x, y, w, h, r); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + r, y + 1.5); ctx.lineTo(x + w - r, y + 1.5); ctx.stroke();
    ctx.restore();
  }

  // Big distance value + small accent "KM", measured so they never overlap.
  function _distBlock(ctx, mode, x, baseY, numStr, numSize, color) {
    const kmSize = Math.round(numSize * 0.32);
    ctx.font = `600 ${numSize}px ${_SF}`; _ls(ctx, (-numSize * 0.03) + 'px');
    const nw = ctx.measureText(numStr).width; _ls(ctx, '0px');
    ctx.font = `600 ${kmSize}px ${_SF}`; const kw = ctx.measureText('KM').width;
    const gap = numSize * 0.16, tot = nw + gap + kw, sx = (mode === 'center') ? x - tot / 2 : x;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#fff'; ctx.font = `600 ${numSize}px ${_SF}`; _ls(ctx, (-numSize * 0.03) + 'px');
    ctx.fillText(numStr, sx, baseY); _ls(ctx, '0px');
    ctx.fillStyle = color; ctx.font = `600 ${kmSize}px ${_SF}`;
    ctx.fillText('KM', sx + nw + gap, baseY - numSize * 0.02);
  }

  // 4-column stat row: bold value, small uppercase label beneath.
  function _statRow(ctx, x, y, w, valueSize, labelSize, cols) {
    const cwid = w / cols.length;
    cols.forEach((c, i) => {
      const cx = x + i * cwid;
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#fff'; ctx.font = `600 ${valueSize}px ${_SF}`; _ls(ctx, '-1px');
      ctx.fillText(c[1], cx, y); _ls(ctx, '0px');
      ctx.fillStyle = _LBL; ctx.font = `500 ${labelSize}px ${_SF}`; _ls(ctx, '0.06em');
      ctx.fillText(c[0], cx, y + labelSize + 9); _ls(ctx, '0px');
    });
  }

  function _activityChip(ctx, x, y, w, h, meta) {
    rrect(ctx, x, y, w, h, h/2); ctx.fillStyle = meta.color + '26'; ctx.fill();
    rrect(ctx, x, y, w, h, h/2); ctx.strokeStyle = meta.color + '73'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = meta.color; ctx.font = `600 ${Math.round(h*0.42)}px ${_SF}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(meta.emoji + ' ' + meta.label, x + w/2, y + h/2 + 1);
    ctx.textBaseline = 'alphabetic';
  }

  function _topScrim(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, 180);
    g.addColorStop(0, 'rgba(4,8,10,0.62)'); g.addColorStop(1, 'rgba(4,8,10,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, 180);
  }
  // Gentle darkening over the lower frame so the floating card + map read well,
  // while the satellite imagery still bleeds through around the card.
  function _botScrim(ctx) {
    const g = ctx.createLinearGradient(0, H * 0.50, 0, H);
    g.addColorStop(0, 'rgba(4,8,10,0)'); g.addColorStop(1, 'rgba(4,8,10,0.72)');
    ctx.fillStyle = g; ctx.fillRect(0, H * 0.50, W, H * 0.50);
  }
  // Curved corners on the whole 9:16 frame (the "rounded map" look).
  const _FRAME_R = Math.round(W * 0.055);
  function _roundCorners(ctx) {
    const r = _FRAME_R;
    ctx.save();
    ctx.fillStyle = '#040f08';
    ctx.beginPath();
    ctx.rect(0, 0, W, H);                 // outer rectangle
    ctx.moveTo(r, 0);                     // rounded-rect subpath (carved out)
    ctx.arcTo(W, 0, W, H, r);
    ctx.arcTo(W, H, 0, H, r);
    ctx.arcTo(0, H, 0, 0, r);
    ctx.arcTo(0, 0, W, 0, r);
    ctx.closePath();
    ctx.fill('evenodd');                  // paints only the 4 corner notches
    ctx.restore();
  }

  // ── INTRO FRAME ──────────────────────────────────────────────────
  function _drawIntroFrame(ctx, f, meta, title, loc, date, tileData, mapH, projPts) {
    const t = f / INTRO_FRAMES;  // 0→1

    // Faded, darkened map
    ctx.globalAlpha = easeOut(t) * 0.5;
    ctx.drawImage(tileData.canvas, 0, 0, W, mapH);
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(5,8,10,${0.6 + (1-t)*0.34})`;
    ctx.fillRect(0, 0, W, H);

    const cy = H * 0.40;

    // Frosted badge BEHIND + a soft glow that lifts a big, bright emoji in FRONT.
    const sc = _easeBack(clamp((t - 0.05) / 0.55, 0, 1));
    const R  = 168;
    ctx.save();
    ctx.translate(W/2, cy - 108);
    ctx.scale(sc, sc);
    // 1) glass panel (back): clearly darker than the glyph so it recedes
    ctx.globalAlpha = clamp(t / 0.3, 0, 1);
    rrect(ctx, -R, -R, R*2, R*2, 116); ctx.fillStyle = 'rgba(12,14,18,0.62)'; ctx.fill();
    rrect(ctx, -R, -R, R*2, R*2, 116); ctx.strokeStyle = meta.color + 'b3'; ctx.lineWidth = 6; ctx.stroke();
    // 2) soft light glow centred behind the glyph so the emoji pops off the panel
    ctx.globalAlpha = clamp((t - 0.1) / 0.3, 0, 1);
    const glow = ctx.createRadialGradient(0, 6, 0, 0, 6, R * 0.95);
    glow.addColorStop(0, 'rgba(255,255,255,0.22)');
    glow.addColorStop(0.6, 'rgba(255,255,255,0.06)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    rrect(ctx, -R, -R, R*2, R*2, 116); ctx.fillStyle = glow; ctx.fill();
    // 3) emoji (front): big, full opacity, drop shadow → floats above the glass
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 8;
    ctx.font = '230px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(meta.emoji, 0, 10);
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.restore();
    ctx.textBaseline = 'alphabetic';

    const a1 = easeOut(clamp((t - 0.32) / 0.4, 0, 1));
    ctx.globalAlpha = a1; ctx.fillStyle = '#fff';
    ctx.font = `600 ${Math.round(W*0.10)}px ${_SF}`; ctx.textAlign = 'center'; _ls(ctx, '-2px');
    ctx.fillText(title, W/2, cy + 222 + (1-a1)*30); _ls(ctx, '0px');

    if (loc) {
      const a2 = easeOut(clamp((t - 0.46) / 0.4, 0, 1));
      ctx.globalAlpha = a2; ctx.fillStyle = _LBL;
      ctx.font = `500 ${Math.round(W*0.043)}px ${_SF}`;
      ctx.fillText('📍 ' + loc, W/2, cy + 314);
    }
    const a3 = easeOut(clamp((t - 0.58) / 0.4, 0, 1));
    ctx.globalAlpha = a3; ctx.fillStyle = _LBL2;
    ctx.font = `400 ${Math.round(W*0.039)}px ${_SF}`;
    ctx.fillText(date, W/2, cy + (loc ? 386 : 320));

    ctx.globalAlpha = 1;
    _drawWatermark(ctx, easeOut(clamp((t - 0.7) / 0.3, 0, 1)));
  }

  // ── ROUTE ANIMATION FRAME ─────────────────────────────────────────
  function _drawRouteFrame(ctx, t, meta, tileData, mapH, projPts, densePts, cumDist,
    totalPxDist, pointAtProgress, statsAtProgress, locStr) {

    // Full-bleed map; gentle scrims keep the route + card readable while the
    // satellite imagery bleeds to every edge (incl. around the floating card).
    ctx.drawImage(tileData.canvas, 0, 0, W, H);
    _topScrim(ctx);
    _botScrim(ctx);

    // Route up to progress t (densePts for smooth sub-pixel drawing)
    const target = t * totalPxDist;
    let ptCount = 0;
    for (let i = 0; i < densePts.length; i++) { if (cumDist[i] <= target) ptCount = i + 1; else break; }
    const current = pointAtProgress(t);
    if (ptCount >= 2) {
      const dp = densePts.slice(0, ptCount); dp.push({ px: current.px, py: current.py });
      ctx.beginPath(); ctx.moveTo(dp[0].px, dp[0].py); dp.forEach((p,i)=>{ if(i) ctx.lineTo(p.px,p.py); });
      ctx.strokeStyle = 'rgba(0,0,0,0.40)'; ctx.lineWidth = 18; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(dp[0].px, dp[0].py); dp.forEach((p,i)=>{ if(i) ctx.lineTo(p.px,p.py); });
      ctx.strokeStyle = meta.color; ctx.lineWidth = 10; ctx.stroke();
      ctx.beginPath(); ctx.arc(densePts[0].px, densePts[0].py, 13, 0, Math.PI*2);
      ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = meta.color; ctx.lineWidth = 5; ctx.stroke();
    }
    const glow = 0.6 + 0.4 * Math.sin(Date.now() / 150);
    ctx.save(); ctx.shadowColor = meta.color; ctx.shadowBlur = 35 * glow;
    ctx.beginPath(); ctx.arc(current.px, current.py, 16, 0, Math.PI*2); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.restore();

    _drawWatermark(ctx, 1);

    // ── Glass stats card (floating, bottom) ───────────────────────
    const stats = statsAtProgress(t);
    const cardX = 60, cardW = W - 120, pad = 56, cardH = 600, cardY = H - cardH - 60;
    _glassCard(ctx, cardX, cardY, cardW, cardH, 44);

    _activityChip(ctx, cardX + pad, cardY + 52, 250, 86, meta);
    if (locStr) {
      ctx.fillStyle = _LBL; ctx.font = `500 ${Math.round(W*0.035)}px ${_SF}`;
      ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('📍 ' + locStr, cardX + cardW - pad, cardY + 108);
    }

    _distBlock(ctx, 'left', cardX + pad, cardY + 300, stats.dist.replace(' km',''), Math.round(W*0.155), meta.color);

    ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cardX + pad, cardY + 372); ctx.lineTo(cardX + cardW - pad, cardY + 372); ctx.stroke();

    _statRow(ctx, cardX + pad, cardY + 490, cardW - pad*2, Math.round(W*0.052), Math.round(W*0.028), [
      ['TIME',  stats.time],
      ['PACE',  stats.pace],
      ['SPEED', stats.speed.replace(' km/h','')],
      ['CAL',   stats.kcal.replace(' kcal','')],
    ]);
  }

  // ── OUTRO FRAME ──────────────────────────────────────────────────
  function _drawOutroFrame(ctx, t, meta, tileData, mapH, projPts, densePts,
    title, loc, date, distance, elapsed, kcal, speedKph, fmtT, fmtP) {

    // Full-bleed map → scrims → full route
    ctx.drawImage(tileData.canvas, 0, 0, W, H);
    _topScrim(ctx);
    _botScrim(ctx);

    // Full route
    if (densePts.length >= 2) {
      ctx.beginPath(); ctx.moveTo(densePts[0].px, densePts[0].py);
      densePts.forEach((p, i) => { if (i) ctx.lineTo(p.px, p.py); });
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 18; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(densePts[0].px, densePts[0].py);
      densePts.forEach((p, i) => { if (i) ctx.lineTo(p.px, p.py); });
      ctx.strokeStyle = meta.color; ctx.lineWidth = 10; ctx.stroke();
      // Start (white/green) + end (accent) dots
      ctx.beginPath(); ctx.arc(densePts[0].px, densePts[0].py, 13, 0, Math.PI*2);
      ctx.fillStyle='#fff'; ctx.fill(); ctx.strokeStyle='#2d9e5a'; ctx.lineWidth=5; ctx.stroke();
      const last = densePts[densePts.length - 1];
      ctx.beginPath(); ctx.arc(last.px, last.py, 13, 0, Math.PI*2);
      ctx.fillStyle = meta.color; ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=5; ctx.stroke();
    }
    _drawWatermark(ctx, 1);

    // ── Glass summary card (slides + fades up) ────────────────────
    const cardX = 60, cardW = W - 120, pad = 56, cardH = 640;
    const slide = easeOut(clamp(t * 1.6, 0, 1));
    const cardY = (H - cardH - 60) + (1 - slide) * 150;
    ctx.globalAlpha = clamp(t * 2, 0, 1);
    _glassCard(ctx, cardX, cardY, cardW, cardH, 44);

    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#fff'; ctx.font = `600 ${Math.round(W*0.06)}px ${_SF}`; _ls(ctx, '-1.2px');
    ctx.fillText(meta.emoji + '  ' + title, W/2, cardY + 96); _ls(ctx, '0px');
    ctx.fillStyle = _LBL; ctx.font = `500 ${Math.round(W*0.034)}px ${_SF}`;
    ctx.fillText((loc ? '📍 ' + loc + '  ·  ' : '') + date, W/2, cardY + 158);

    _distBlock(ctx, 'center', W/2, cardY + 330, distance.toFixed(2), Math.round(W*0.145), meta.color);

    ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cardX + pad, cardY + 404); ctx.lineTo(cardX + cardW - pad, cardY + 404); ctx.stroke();

    const fadeT = easeOut(clamp((t - 0.3) / 0.7, 0, 1));
    ctx.globalAlpha = clamp(t * 2, 0, 1) * fadeT;
    _statRow(ctx, cardX + pad, cardY + 520, cardW - pad*2, Math.round(W*0.052), Math.round(W*0.028), [
      ['TIME',  fmtT(elapsed)],
      ['PACE',  fmtP(distance, elapsed)],
      ['SPEED', speedKph.toFixed(1)],
      ['CAL',   String(kcal)],
    ]);
    ctx.globalAlpha = 1;
  }

  // ── WATERMARK — top-center, above the map ───────────────────────
  // Sits in the empty strip at the very top of the canvas (above the
  // map tiles). Using top-center keeps it visible in all three phases
  // and never competes with the stats panel at the bottom.
  function _drawWatermark(ctx, alpha) {
    ctx.save();
    ctx.globalAlpha  = alpha * 0.9;
    ctx.font         = `600 ${Math.round(W * 0.032)}px ${_SF}`;
    ctx.fillStyle    = 'rgba(255,255,255,0.9)';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'alphabetic';
    _ls(ctx, '0.08em');
    ctx.shadowColor  = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur   = 10;
    ctx.fillText('⚡ FITFLOW PRO', W / 2, 72);
    ctx.shadowBlur   = 0;
    _ls(ctx, '0px');
    ctx.restore();
  }

  // ── PUBLIC API ───────────────────────────────────────────────────

  // Called after a run is stopped, before session is cleared
  // Reads from APP.runSession + APP.gpsCoords
  global.generateActivityVideoFromSession = function () {
    const s    = global.APP && global.APP.runSession;
    const user = global.APP && global.APP.currentUser;
    if (!s) { console.warn('[VideoGen] no active session'); return; }

    const meta    = (global.ACTIVITY_META || {})[s.activityType || 'run'] || {};
    const elapsed = (typeof global._calcElapsed === 'function') ? global._calcElapsed(s) : (s.finalElapsed || 0);

    const log = {
      title:        (typeof global._getDefaultActivityTitle === 'function')
                      ? global._getDefaultActivityTitle(s.activityType || 'run')
                      : (meta.label || 'Activity'),
      activityType: s.activityType || 'run',
      distance:     s.distance     || 0,
      duration:     elapsed,
      locationName: s.locationName || '',
      timestamp:    new Date(s.startTime).toISOString(),
      date:         (typeof global._ymdLocal === 'function') ? global._ymdLocal(new Date(s.startTime)) : new Date().toISOString().split('T')[0],
      coords:       (global.APP.gpsCoords || []).slice(),
    };
    _generate(log);
  };

  // Called from history detail — pass in the saved log object
  global.generateActivityVideo = function (log) {
    if (!log) { console.warn('[VideoGen] no log passed'); return; }
    _generate(log);
  };

})(window);
