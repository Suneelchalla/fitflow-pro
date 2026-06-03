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
  const ROUTE_SECS   = 12;   // seconds to animate route drawing
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
  async function fetchTiles(coords, tw, th) {
    if (!coords || coords.length < 2) return null;
    try {
      const lats = coords.map(c => c[0]), lons = coords.map(c => c[1]);
      let minLat = Math.min(...lats), maxLat = Math.max(...lats);
      let minLon = Math.min(...lons), maxLon = Math.max(...lons);
      const pLat = (maxLat - minLat) * 0.18 || 0.002;
      const pLon = (maxLon - minLon) * 0.18 || 0.002;
      minLat -= pLat; maxLat += pLat;
      minLon -= pLon; maxLon += pLon;

      const z        = pickZoom(minLat, maxLat, minLon, maxLon, tw, th);
      const txMinF   = lon2x(minLon, z), txMaxF = lon2x(maxLon, z);
      const tyMinF   = lat2y(maxLat, z), tyMaxF = lat2y(minLat, z);
      const txMin    = Math.floor(txMinF), txMax = Math.floor(txMaxF);
      const tyMin    = Math.floor(tyMinF), tyMax = Math.floor(tyMaxF);

      const bboxPxW  = (txMaxF - txMinF) * TILE_SIZE;
      const bboxPxH  = (tyMaxF - tyMinF) * TILE_SIZE;
      const scale    = Math.min(tw / bboxPxW, th / bboxPxH);
      const drawW    = bboxPxW * scale;
      const drawH    = bboxPxH * scale;
      const offX     = (tw - drawW) / 2;
      const offY     = (th - drawH) / 2;

      // Fetch tiles: satellite imagery base + place-label overlay composited on top.
      // Esri World Imagery = satellite/aerial (same source as the live-map 🛰 style).
      // World_Boundaries_and_Places = street/area/city names only.
      // NOTE: ArcGIS tile URLs use {z}/{y}/{x} order (row before column).
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
          const base = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${ty}/${tx}`;
          const lbls = `https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/${z}/${ty}/${tx}`;
          jobs.push(Promise.all([loadImg(base), loadImg(lbls)]));
          meta.push({ tx, ty });
        }
      }
      const tilePairs = await Promise.all(jobs);
      const loaded = tilePairs.filter(([b]) => b).length;
      if (loaded < tilePairs.length * 0.4) return null;
      const tc  = document.createElement('canvas');
      tc.width  = tw; tc.height = th;
      const tctx = tc.getContext('2d');
      tctx.fillStyle = '#0d1520';
      tctx.fillRect(0, 0, tw, th);
      tilePairs.forEach(([base], i) => {
        if (!base) return;
        const { tx, ty } = meta[i];
        const px = offX + (tx * TILE_SIZE - txMinF * TILE_SIZE) * scale;
        const py = offY + (ty * TILE_SIZE - tyMinF * TILE_SIZE) * scale;
        tctx.drawImage(base, px, py, TILE_SIZE * scale, TILE_SIZE * scale);
      });
      tilePairs.forEach(([, lbl], i) => {
        if (!lbl) return;
        const { tx, ty } = meta[i];
        const px = offX + (tx * TILE_SIZE - txMinF * TILE_SIZE) * scale;
        const py = offY + (ty * TILE_SIZE - tyMinF * TILE_SIZE) * scale;
        tctx.drawImage(lbl, px, py, TILE_SIZE * scale, TILE_SIZE * scale);
      });
      // Light scrim only — keep satellite imagery clearly visible while still
      // giving the route line and bottom stats panel enough contrast.
      tctx.fillStyle = 'rgba(4,12,8,0.14)';
      tctx.fillRect(0, 0, tw, th);

      // Build coordinate→canvas projection functions
      const toCanvasX = lon => offX + (lon2x(lon, z) * TILE_SIZE - txMinF * TILE_SIZE) * scale;
      const toCanvasY = lat => offY + (lat2y(lat, z) * TILE_SIZE - tyMinF * TILE_SIZE) * scale;

      return { canvas: tc, toCanvasX, toCanvasY };
    } catch (e) {
      console.warn('[VideoGen] tile fetch failed:', e.message);
      return null;
    }
  }

  // ── FALLBACK GRID BACKGROUND ─────────────────────────────────────
  function makeFallbackBg(tw, th) {
    const tc   = document.createElement('canvas');
    tc.width   = tw; tc.height = th;
    const tctx = tc.getContext('2d');
    tctx.fillStyle = '#071510';
    tctx.fillRect(0, 0, tw, th);
    tctx.strokeStyle = 'rgba(255,255,255,0.04)';
    tctx.lineWidth   = 1;
    for (let x = 0; x < tw; x += 80) {
      tctx.beginPath(); tctx.moveTo(x, 0); tctx.lineTo(x, th); tctx.stroke();
    }
    for (let y = 0; y < th; y += 80) {
      tctx.beginPath(); tctx.moveTo(0, y); tctx.lineTo(tw, y); tctx.stroke();
    }
    // Project using simple equirectangular — good enough for fallback
    const toCanvasX = (lon, meta) => {
      const { minLon, maxLon } = meta;
      const pad = 0.1;
      return tw * pad + ((lon - minLon) / (maxLon - minLon || 0.001)) * tw * (1 - pad * 2);
    };
    const toCanvasY = (lat, meta) => {
      const { minLat, maxLat } = meta;
      const pad = 0.1;
      return th * pad + ((maxLat - lat) / (maxLat - minLat || 0.001)) * th * (1 - pad * 2);
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
      // Portrait 1080×1920 — landscape map area = top 55%
      const mapH   = Math.round(H * 0.46);
      const mapY   = 0;

      // Fetch tiles for map area
      let tileData = await fetchTiles(smoothed, W, mapH);
      if (cancelled) return;

      // Fallback projection for non-tile case
      const lats   = smoothed.map(p => p[0]);
      const lons   = smoothed.map(p => p[1]);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);
      const minLon = Math.min(...lons), maxLon = Math.max(...lons);

      if (!tileData) {
        tileData = makeFallbackBg(W, mapH);
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

      // Scale route animation 15–30 s based on activity distance:
      //   ≤ 2 km  → 15 s   (short run / walk)
      //   ≥ 10 km → 30 s   (long run / cycle)
      //   in between → linear interpolation
      const routeSecs    = Math.round(clamp(15 + (distance - 2) / (10 - 2) * (30 - 15), 15, 30));
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

      function drawFrame() {
        if (cancelled) { try { recorder.stop(); } catch {} return; }

        ctx.clearRect(0, 0, W, H);

        const f     = frameIndex;
        const phase = f < INTRO_FRAMES
          ? 'intro'
          : f < INTRO_FRAMES + ROUTE_FRAMES
            ? 'route'
            : 'outro';

        // ── COMMON: full black background ─────────────────────────
        ctx.fillStyle = '#040f08';
        ctx.fillRect(0, 0, W, H);

        if (phase === 'intro') {
          _drawIntroFrame(ctx, f, meta, titleStr, locStr, dateStr, tileData, mapH, projPts);
        } else if (phase === 'route') {
          const routeF = f - INTRO_FRAMES;
          const t      = routeF / ROUTE_FRAMES; // linear — constant px/frame, no easing stutter
          _drawRouteFrame(ctx, t, meta, tileData, mapH, projPts, densePts, cumDist,
            totalPxDist, pointAtProgress, statsAtProgress);
        } else {
          const outroF = f - INTRO_FRAMES - ROUTE_FRAMES;
          const t      = easeOut(outroF / OUTRO_FRAMES);
          _drawOutroFrame(ctx, t, meta, tileData, mapH, projPts, densePts,
            titleStr, locStr, dateStr, distance, elapsed, kcal, speedKph, fmtT, fmtP);
        }

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

  // ── INTRO FRAME ──────────────────────────────────────────────────
  function _drawIntroFrame(ctx, f, meta, title, loc, date, tileData, mapH, projPts) {
    const t = f / INTRO_FRAMES;  // 0→1

    // Faded map background
    ctx.globalAlpha = easeOut(t) * 0.35;
    ctx.drawImage(tileData.canvas, 0, 0, W, mapH);
    ctx.globalAlpha = 1;

    // Dark overlay
    ctx.fillStyle = `rgba(4,15,8,${0.65 + (1-t)*0.35})`;
    ctx.fillRect(0, 0, W, H);

    // Centered content
    const cy = H * 0.42;

    // Emoji — scales in
    const emojiScale = easeOut(clamp((t - 0.1) / 0.4, 0, 1));
    ctx.save();
    ctx.translate(W/2, cy - 60);
    ctx.scale(emojiScale, emojiScale);
    ctx.font      = '120px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(meta.emoji, 0, 0);
    ctx.restore();

    // Activity type — fades in
    const textAlpha = easeOut(clamp((t - 0.25) / 0.4, 0, 1));
    ctx.globalAlpha = textAlpha;
    ctx.font        = `700 ${Math.round(W * 0.085)}px -apple-system, Arial, sans-serif`;
    ctx.fillStyle   = '#ffffff';
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur  = 24;
    ctx.fillText(meta.label.toUpperCase(), W/2, cy + 60);
    ctx.shadowBlur  = 0;

    // Title — slides up
    const titleAlpha = easeOut(clamp((t - 0.4) / 0.35, 0, 1));
    const titleY     = cy + 120 + (1 - titleAlpha) * 30;
    ctx.globalAlpha  = titleAlpha;
    ctx.font         = `600 ${Math.round(W * 0.045)}px -apple-system, Arial, sans-serif`;
    ctx.fillStyle    = 'rgba(255,255,255,0.7)';
    ctx.fillText(title, W/2, titleY);

    // Location pill — slides up from bottom
    if (loc) {
      const locAlpha = easeOut(clamp((t - 0.55) / 0.3, 0, 1));
      const locY     = cy + 185 + (1 - locAlpha) * 40;
      ctx.globalAlpha = locAlpha;
      const pillW    = Math.min(W - 120, ctx.measureText('📍 ' + loc).width + 60);
      const pillH    = 52;
      rrect(ctx, (W - pillW) / 2, locY - pillH/2, pillW, pillH, 26);
      ctx.fillStyle = 'rgba(67,160,90,0.25)';
      ctx.fill();
      rrect(ctx, (W - pillW) / 2, locY - pillH/2, pillW, pillH, 26);
      ctx.strokeStyle = 'rgba(67,160,90,0.5)';
      ctx.lineWidth   = 1.5;
      ctx.stroke();
      ctx.fillStyle   = '#7ed9a0';
      ctx.font        = `600 ${Math.round(W * 0.034)}px -apple-system, Arial, sans-serif`;
      ctx.fillText('📍 ' + loc, W/2, locY + 10);
    }

    // Date
    const dateAlpha = easeOut(clamp((t - 0.65) / 0.3, 0, 1));
    ctx.globalAlpha = dateAlpha;
    ctx.font        = `400 ${Math.round(W * 0.032)}px -apple-system, Arial, sans-serif`;
    ctx.fillStyle   = 'rgba(255,255,255,0.4)';
    ctx.fillText(date, W/2, cy + (loc ? 255 : 195));

    ctx.globalAlpha = 1;
    ctx.shadowBlur  = 0;

    // FitFlow watermark bottom
    _drawWatermark(ctx, easeOut(clamp((t - 0.7) / 0.3, 0, 1)));
  }

  // ── ROUTE ANIMATION FRAME ─────────────────────────────────────────
  function _drawRouteFrame(ctx, t, meta, tileData, mapH, projPts, densePts, cumDist,
    totalPxDist, pointAtProgress, statsAtProgress) {

    // Map tiles
    ctx.drawImage(tileData.canvas, 0, 0, W, mapH);

    // Gradient fade at bottom of map
    const fadeGrad = ctx.createLinearGradient(0, mapH * 0.75, 0, mapH);
    fadeGrad.addColorStop(0, 'rgba(4,15,8,0)');
    fadeGrad.addColorStop(1, 'rgba(4,15,8,1)');
    ctx.fillStyle = fadeGrad;
    ctx.fillRect(0, 0, W, mapH);

    // Bottom stats panel background
    ctx.fillStyle = '#040f08';
    ctx.fillRect(0, mapH, W, H - mapH);

    // Draw route up to progress t — use densePts for smooth sub-pixel drawing
    const target  = t * totalPxDist;
    let   ptCount = 0;
    for (let i = 0; i < densePts.length; i++) {
      if (cumDist[i] <= target) ptCount = i + 1;
      else break;
    }
    const current = pointAtProgress(t);

    if (ptCount >= 2) {
      // densePts already has points every ~4px, so no extra interpolation needed.
      // Still append the exact interpolated tip for pixel-perfect lead position.
      const drawPts = densePts.slice(0, ptCount);
      drawPts.push({ px: current.px, py: current.py });

      // Shadow stroke
      ctx.beginPath();
      ctx.moveTo(drawPts[0].px, drawPts[0].py);
      drawPts.forEach((p, i) => { if (i > 0) ctx.lineTo(p.px, p.py); });
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth   = 12;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.stroke();

      // Main route line
      ctx.beginPath();
      ctx.moveTo(drawPts[0].px, drawPts[0].py);
      drawPts.forEach((p, i) => { if (i > 0) ctx.lineTo(p.px, p.py); });
      ctx.strokeStyle = meta.color;
      ctx.lineWidth   = 7;
      ctx.stroke();

      // Highlight
      ctx.beginPath();
      ctx.moveTo(drawPts[0].px, drawPts[0].py);
      drawPts.forEach((p, i) => { if (i > 0) ctx.lineTo(p.px, p.py); });
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth   = 2;
      ctx.stroke();

      // Start dot
      ctx.beginPath();
      ctx.arc(densePts[0].px, densePts[0].py, 9, 0, Math.PI*2);
      ctx.fillStyle = meta.color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth   = 2.5;
      ctx.stroke();
    }

    // Glowing lead dot
    const glow = 0.6 + 0.4 * Math.sin(Date.now() / 150);
    ctx.save();
    ctx.shadowColor = meta.color;
    ctx.shadowBlur  = 18 * glow;
    ctx.beginPath();
    ctx.arc(current.px, current.py, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Outer pulse ring
    ctx.beginPath();
    ctx.arc(current.px, current.py, 18 + 6 * glow, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${0.35 * glow})`;
    ctx.lineWidth   = 2;
    ctx.stroke();

    // ── LIVE STATS PANEL ──────────────────────────────────────────
    const stats   = statsAtProgress(t);
    const panelY  = mapH + 32;

    // Row 1: big distance (left) + activity pill (right) — well separated
    const bigF = Math.round(W * 0.17);
    ctx.font         = `700 ${bigF}px -apple-system, Arial, sans-serif`;
    ctx.fillStyle    = '#ffffff';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor  = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur   = 12;
    ctx.fillText(stats.dist.replace(' km',''), 60, panelY + 130);
    const distW = ctx.measureText(stats.dist.replace(' km','')).width;
    ctx.font      = `600 ${Math.round(W*0.05)}px -apple-system, Arial, sans-serif`;
    ctx.fillStyle = meta.color;
    ctx.fillText('km', 60 + distW + 14, panelY + 110);
    ctx.shadowBlur = 0;

    // Activity pill — top-right, vertically centred on its own row
    const pillW = 160, pillH = 52, pillX = W - pillW - 56, pillY = panelY + 50;
    rrect(ctx, pillX, pillY, pillW, pillH, 26);
    ctx.fillStyle = meta.color + '2a'; ctx.fill();
    rrect(ctx, pillX, pillY, pillW, pillH, 26);
    ctx.strokeStyle = meta.color + '99'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.font      = `700 ${Math.round(W*0.033)}px -apple-system, Arial, sans-serif`;
    ctx.fillStyle = meta.color;
    ctx.textAlign = 'center';
    ctx.fillText(meta.emoji + ' ' + meta.label, pillX + pillW / 2, pillY + 34);

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.09)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(60, panelY + 158); ctx.lineTo(W - 60, panelY + 158);
    ctx.stroke();

    // Row 2: 4-col stats — TIME  PACE  SPEED  KCAL
    const statsRowY = panelY + 178;
    const cols = [
      { label:'TIME',     val:stats.time  },
      { label:'PACE /km', val:stats.pace  },
      { label:'SPEED',    val:stats.speed },
      { label:'KCAL',     val:stats.kcal  },
    ];
    const colW = (W - 120) / cols.length;
    cols.forEach((col, i) => {
      const cx = 60 + i * colW;
      if (i > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(cx, statsRowY - 4); ctx.lineTo(cx, statsRowY + 88);
        ctx.stroke();
      }
      ctx.font      = `700 ${Math.round(W*0.052)}px -apple-system, Arial, sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText(col.val, cx + (i > 0 ? 18 : 0), statsRowY + 54);
      ctx.font      = `500 ${Math.round(W*0.027)}px -apple-system, Arial, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.42)';
      ctx.fillText(col.label, cx + (i > 0 ? 18 : 0), statsRowY + 84);
    });

    // Watermark — sits below stats row, never overlaps
    _drawWatermark(ctx, 1);
  }

  // ── OUTRO FRAME ──────────────────────────────────────────────────
  function _drawOutroFrame(ctx, t, meta, tileData, mapH, projPts, densePts,
    title, loc, date, distance, elapsed, kcal, speedKph, fmtT, fmtP) {

    // Full map
    ctx.drawImage(tileData.canvas, 0, 0, W, mapH);

    // Full route — always fully drawn (use densePts for smooth curves)
    if (densePts.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(densePts[0].px, densePts[0].py);
      densePts.forEach((p, i) => { if (i > 0) ctx.lineTo(p.px, p.py); });
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth   = 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(densePts[0].px, densePts[0].py);
      densePts.forEach((p, i) => { if (i > 0) ctx.lineTo(p.px, p.py); });
      ctx.strokeStyle = meta.color;
      ctx.lineWidth   = 7; ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(densePts[0].px, densePts[0].py);
      densePts.forEach((p, i) => { if (i > 0) ctx.lineTo(p.px, p.py); });
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth   = 2; ctx.stroke();

      // Start dot (green)
      ctx.beginPath();
      ctx.arc(densePts[0].px, densePts[0].py, 10, 0, Math.PI*2);
      ctx.fillStyle   = '#2d9e5a'; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();

      // End dot (red)
      const last = densePts[densePts.length - 1];
      ctx.beginPath();
      ctx.arc(last.px, last.py, 10, 0, Math.PI*2);
      ctx.fillStyle   = '#ef5350'; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
    }

    // Gradient fade
    const fadeGrad = ctx.createLinearGradient(0, mapH * 0.65, 0, mapH);
    fadeGrad.addColorStop(0, 'rgba(4,15,8,0)');
    fadeGrad.addColorStop(1, 'rgba(4,15,8,1)');
    ctx.fillStyle = fadeGrad;
    ctx.fillRect(0, 0, W, mapH);

    // Stats panel slides up
    const panelSlide = easeOut(clamp(t * 2, 0, 1));
    const panelY     = mapH + (1 - panelSlide) * (H - mapH);
    ctx.fillStyle    = '#040f08';
    ctx.fillRect(0, panelY, W, H - panelY);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, panelY, W, H);
    ctx.clip();

    // Title + date
    const cy = panelY + 56;
    ctx.font      = `700 ${Math.round(W * 0.065)}px -apple-system, Arial, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur  = 10;
    ctx.fillText(meta.emoji + '  ' + title, W/2, cy);
    ctx.shadowBlur  = 0;

    if (loc) {
      ctx.font      = `500 ${Math.round(W * 0.033)}px -apple-system, Arial, sans-serif`;
      ctx.fillStyle = 'rgba(126,217,160,0.9)';
      ctx.fillText('📍 ' + loc, W/2, cy + 44);
    }
    ctx.font      = `400 ${Math.round(W * 0.028)}px -apple-system, Arial, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.fillText(date, W/2, cy + (loc ? 84 : 48));

    // Separator
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    const sepY = cy + (loc ? 108 : 72);
    ctx.moveTo(60, sepY); ctx.lineTo(W-60, sepY);
    ctx.stroke();

    // Stats grid 2×3
    const gridY    = sepY + 20;
    const gridData = [
      { label:'DISTANCE',  val: distance.toFixed(2) + ' km', color: meta.color },
      { label:'TIME',      val: fmtT(elapsed),               color: '#ffffff'   },
      { label:'AVG PACE',  val: fmtP(distance,elapsed)+'/km',color: '#ffffff'   },
      { label:'AVG SPEED', val: speedKph.toFixed(1)+' km/h', color: '#ffffff'   },
      { label:'CALORIES',  val: kcal + ' kcal',              color: '#ffffff'   },
      { label:'ACTIVITY',  val: meta.label,                  color: meta.color  },
    ];
    const cellW = (W - 120 - 10) / 2;
    const cellH = 110;
    const fadeT = easeOut(clamp((t - 0.3) / 0.7, 0, 1));
    ctx.globalAlpha = fadeT;
    gridData.forEach((g, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const gx  = 60 + col * (cellW + 10);
      const gy  = gridY + row * (cellH + 10);
      rrect(ctx, gx, gy, cellW, cellH, 16);
      ctx.fillStyle = '#0d2218'; ctx.fill();
      rrect(ctx, gx, gy, cellW, cellH, 16);
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1; ctx.stroke();

      ctx.font      = `700 ${Math.round(W*0.026)}px -apple-system, Arial, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.textAlign = 'left';
      ctx.fillText(g.label, gx + 18, gy + 32);
      ctx.font      = `700 ${Math.round(W*0.048)}px -apple-system, Arial, sans-serif`;
      ctx.fillStyle = g.color;
      ctx.fillText(g.val, gx + 18, gy + 82);
    });
    ctx.globalAlpha = 1;
    ctx.restore();

    // Branding fades in
    const brandAlpha = easeOut(clamp((t - 0.6) / 0.4, 0, 1));
    _drawWatermark(ctx, brandAlpha);
  }

  // ── WATERMARK — top-center, above the map ───────────────────────
  // Sits in the empty strip at the very top of the canvas (above the
  // map tiles). Using top-center keeps it visible in all three phases
  // and never competes with the stats panel at the bottom.
  function _drawWatermark(ctx, alpha) {
    ctx.save();
    ctx.globalAlpha  = alpha * 0.82;
    ctx.font         = `700 ${Math.round(W * 0.034)}px -apple-system, Arial, sans-serif`;
    ctx.fillStyle    = '#43d17a';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor  = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur   = 10;
    ctx.fillText('⚡ FITFLOW PRO', W / 2, 68);
    ctx.shadowBlur   = 0;
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
