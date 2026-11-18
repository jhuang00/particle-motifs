/* === ParticleMotif: turn a motif into a field of particles ====================
 * Part of the particle-motifs skill (~/.claude/skills/particle-motifs). Plain JS,
 * no dependencies, no build step. Copy this file into a project to use it.
 *
 *   ParticleMotif.mount(canvas, {
 *     motif:  'knot' | 'ring' | 'lemniscate' | 'spiral' | 'helix' | 'linked' | 'orbits'
 *             | 'mobius' | 'sphere' | 'torus' | 'wave' | 'ripples'
 *             | ParticleMotif.fromText('∞') | ParticleMotif.fromPath('M0 0 L10 10', [w, h])
 *             | { dims: 1 | 2, fn: function (a, b, k, out, time) { out[0] = x; out[1] = y; out[2] = z; } },
 *     spread: 'line' | 'ribbon' | 'tube' | 'dotted' | 'cloud' | 'splash' | 'scatter' | 'shell' | 'stipple',
 *     motion: 'static' | 'drift' | 'flow' | 'breathe' | 'morph',
 *     morphTo: (motif, for motion 'morph'),
 *     count: 16000, amount: 1 (spread width), speed: 1,
 *     cx: .5, cy: .5, size: .38 (of the canvas's shorter side, so forms fit any shape), tilt: .2, turn: .1, sway: true,
 *     colour: '#ffffff', accent: '#C4B5F5', accentShare: .08, alpha: 1,
 *     background: '#17171A' or null (null = transparent canvas), cursor: false, lazy: true,
 *     morphMode: 'loop' | 'once', morphDuration: 6 (seconds, for 'once'), blend: 'auto' | 'add' | 'over',
 *     stretch: 1 (horizontal scale, for wide bands), pixelRatio: null (fixed, for exports)
 *   })
 *   → { canvas, set(opts), snapshot(), measureMotion(ms), destroy() }   (use .canvas: with lazy on, the element is swapped when it leaves the screen)
 *
 * A motif's fn maps parameters to a point on its skeleton, in a space about -1.2..1.2:
 *   dims 1 (a curve): a in [0,1) runs along it; with parts: n, k (0..n-1) says which curve this point is on
 *   dims 2 (a surface): a and b in [0,1) cover it
 *   dims 0 (a raster, from fromText / fromPath): sampled pixels, flat, scaled so the longer side spans -1.2..1.2
 * Positions are computed on the CPU each frame (cheap at 10-30k points); WebGL draws them
 * as additive round points with depth-based brightness. With lazy (default) the WebGL
 * context exists only while the canvas is on screen, so a page can hold many.
 * Pauses off screen; one still frame under prefers-reduced-motion.
 * ========================================================================== */
(function () {
  var TAU = Math.PI * 2;
  function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }
  function hash(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function hex(c) { var n = parseInt(c.slice(1), 16); return [(n >> 16) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }

  /* ── Built-in motifs ── */
  var MOTIFS = {
    ring: { dims: 1, fn: function (a, b, k, o) { var t = a * TAU; o[0] = Math.cos(t); o[1] = Math.sin(t); o[2] = 0; } },
    knot: { dims: 1, fn: function (a, b, k, o) { var s = a * TAU; o[0] = (Math.sin(s) + 2 * Math.sin(2 * s)) * .36; o[1] = (Math.cos(s) - 2 * Math.cos(2 * s)) * .36; o[2] = -Math.sin(3 * s) * .5; } },
    lemniscate: { dims: 1, fn: function (a, b, k, o) { var t = a * TAU, d = 1 + Math.sin(t) * Math.sin(t); o[0] = 1.3 * Math.cos(t) / d; o[1] = 1.3 * Math.sin(t) * Math.cos(t) / d; o[2] = .25 * Math.sin(t); } },
    spiral: { dims: 1, fn: function (a, b, k, o) { var t = a * TAU * 3.2, r = .08 + a * 1.05; o[0] = Math.cos(t) * r; o[1] = Math.sin(t) * r; o[2] = (a - .5) * .3; } },
    helix: { dims: 1, fn: function (a, b, k, o) { var t = a * TAU * 3; o[0] = Math.cos(t) * .45; o[1] = (a - .5) * 2.2; o[2] = Math.sin(t) * .45; } },
    linked: { dims: 1, parts: 2, fn: function (a, b, k, o) { var t = a * TAU; if (k === 0) { o[0] = Math.cos(t) * .62 - .36; o[1] = Math.sin(t) * .62; o[2] = 0; } else { o[0] = Math.cos(t) * .62 + .36; o[1] = 0; o[2] = Math.sin(t) * .62; } } },
    orbits: { dims: 1, parts: 3, fn: function (a, b, k, o) {
      var t = a * TAU, r = k === 2 ? .7 : 1.05, x = Math.cos(t) * r, y = Math.sin(t) * r * .3, z = Math.sin(t) * r, c, s, q;
      if (k === 1) { c = Math.cos(1.05); s = Math.sin(1.05); q = y * c - z * s; z = y * s + z * c; y = q; }
      if (k === 2) { c = Math.cos(-.6); s = Math.sin(-.6); q = x * c - y * s; y = x * s + y * c; x = q; }
      o[0] = x; o[1] = y; o[2] = z; } },
    mobius: { dims: 2, fn: function (a, b, k, o) { var u = a * TAU, v = (b - .5) * .55, r = 1 + v * Math.cos(u / 2); o[0] = r * Math.cos(u); o[1] = r * Math.sin(u) * .55 + v * Math.sin(u / 2) * .6; o[2] = v * Math.sin(u / 2) * .9 - r * Math.sin(u) * .3; } },
    sphere: { dims: 2, fn: function (a, b, k, o) { var p = a * TAU, c = 1 - 2 * b, s = Math.sqrt(Math.max(0, 1 - c * c)); o[0] = Math.cos(p) * s; o[1] = c; o[2] = Math.sin(p) * s; } },
    torus: { dims: 2, fn: function (a, b, k, o) { var u = a * TAU, v = b * TAU, r = 1 + .3 * Math.cos(v); o[0] = r * Math.cos(u) * .82; o[1] = .3 * Math.sin(v) * .82; o[2] = r * Math.sin(u) * .82; } },
    wave: { dims: 2, fn: function (a, b, k, o, T) { var x = (a - .5) * 2.8, z = (b - .5) * 1.8; o[0] = x; o[1] = .18 * Math.sin(x * 2.6 + T * .8) * Math.cos(z * 2.1 - T * .5) + .08 * Math.sin(z * 4.2 + x - T); o[2] = z; } },
    ripples: { dims: 2, fn: function (a, b, k, o, T) { var r = Math.sqrt(b) * 1.25, t = a * TAU; o[0] = Math.cos(t) * r; o[2] = Math.sin(t) * r; o[1] = .09 * Math.sin(r * 11 - T * 1.6) * (1.2 - r * .6); } }
  };

  /* ── Motifs from a symbol: text, emoji or an SVG path, rasterised and sampled ── */
  function sampleRaster(draw, w, h) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var g = c.getContext('2d'); g.fillStyle = '#fff'; g.strokeStyle = '#fff'; draw(g, w, h);
    var d = g.getImageData(0, 0, w, h).data, pts = [];
    var m = Math.max(w, h);
    for (var y = 0; y < h; y += 2) for (var x = 0; x < w; x += 2) { var al = d[(y * w + x) * 4 + 3]; if (al > 100) pts.push((x - w / 2) / m * 2.4, -(y - h / 2) / m * 2.4, al / 255); }
    return { dims: 0, pts: new Float32Array(pts) };
  }
  function fromText(text, opts) {
    opts = opts || {};
    // the font must already be loaded: await document.fonts.load(font) first, or a fallback is sampled
    var font = opts.font || '600 360px system-ui, sans-serif', w = opts.width || 900, h = opts.height || 480;
    return sampleRaster(function (g) {
      g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (var tries = 0; tries < 12 && g.measureText(text).width > w * .92; tries++) {   // shrink until it fits, so wide words never clip
        g.font = g.font.replace(/(\d+(\.\d+)?)px/, function (m, n) { return (parseFloat(n) * .88).toFixed(1) + 'px'; });
      }
      g.fillText(text, w / 2, h / 2 + (opts.dy || 0));
    }, w, h);
  }
  function fromPath(d, viewBox, opts) {
    opts = opts || {}; var vw = viewBox[0], vh = viewBox[1], s = Math.min(800 / vw, 480 / vh), w = Math.round(vw * s), h = Math.round(vh * s);
    return sampleRaster(function (g) { g.scale(s, s); var p = new Path2D(d); if (opts.stroke) { g.lineWidth = opts.stroke; g.lineCap = 'round'; g.stroke(p); } else g.fill(p); }, w, h);
  }
  function resolve(m) { return typeof m === 'string' ? (MOTIFS[m] || MOTIFS.ring) : (m || MOTIFS.ring); }

  /* ── Spread: how points sit around the skeleton ── */
  var WIDTH = { line: .012, ribbon: .075, tube: .07, dotted: .006, cloud: .17, splash: .34, shell: .012, stipple: .006, scatter: .5 };

  var VS = [
    'attribute vec3 aP; attribute float aS; attribute float aB;',
    'uniform float uAsp, uSize, uTilt, uTurn, uPx, uAlpha, uPull, uStretch; uniform vec2 uC, uPtr;',
    'varying float vA; varying float vAcc;',
    'uniform float uAccShare;',
    'void main(){',
    '  vec3 p=aP;',
    '  float c=cos(uTurn),s=sin(uTurn); p=vec3(p.x*c+p.z*s,p.y,-p.x*s+p.z*c);',
    '  c=cos(uTilt); s=sin(uTilt); p=vec3(p.x,p.y*c-p.z*s,p.y*s+p.z*c);',
    '  float w=3.4/(3.4-p.z);',
    '  vec2 ndc=vec2(p.x*uStretch/uAsp,p.y)*uSize*2.*w+uC;',
    '  vec2 d=ndc-uPtr; d.x*=uAsp; float f=exp(-dot(d,d)/.03)*uPull;',     // optional cursor pull
    '  ndc-=vec2(d.x/uAsp,d.y)*f*.25;',
    '  gl_Position=vec4(ndc,0.,1.);',
    '  gl_PointSize=uPx*(.75+aS*.7)*w*(1.+f*.4);',
    '  vA=(.16+.3*clamp((p.z+1.2)/2.4,0.,1.))*aB*uAlpha*(1.+f*.6);',
    '  vAcc=step(1.-uAccShare,fract(aS*7.13));',
    '}'
  ].join('\n');
  var FS = [
    'precision mediump float; varying float vA; varying float vAcc; uniform vec3 uCol, uAcc;',
    'void main(){ float d=length(gl_PointCoord-.5); float a=(1.-smoothstep(.2,.5,d))*vA;',
    '  gl_FragColor=vec4(mix(uCol,uAcc,vAcc)*a,a); }'
  ].join('\n');

  function mount(canvas, opts) {
    var o = {};
    var defaults = { motif: 'ring', spread: 'line', motion: 'drift', count: 16000, amount: 1, speed: 1, cx: .5, cy: .5, size: .38, tilt: .2, turn: .1, sway: true,
      colour: '#ffffff', accent: '#C4B5F5', accentShare: .08, alpha: 1, background: '#17171A', cursor: false, lazy: true, morphTo: null,
      morphMode: 'loop', morphDuration: 6, blend: 'auto', stretch: 1, pixelRatio: null };
    for (var k in defaults) o[k] = defaults[k];
    for (k in opts || {}) o[k] = opts[k];
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* per-point parameters, generated once */
    var N, A, B, K, G, S, R, D, P, BR, M, MB;
    function seed() {
      M = resolve(o.motif); MB = o.motion === 'morph' ? resolve(o.morphTo || 'ring') : null;
      N = o.count; A = new Float32Array(N); B = new Float32Array(N); K = new Uint8Array(N); G = new Float32Array(N * 3);
      S = new Float32Array(N); R = new Float32Array(N); D = new Float32Array(N * 3); P = new Float32Array(N * 3); BR = new Float32Array(N);
      var parts = M.parts || 1;
      for (var i = 0; i < N; i++) {
        A[i] = Math.random(); B[i] = Math.random(); K[i] = Math.floor(Math.random() * parts); S[i] = Math.random();
        G[i * 3] = gauss(); G[i * 3 + 1] = gauss(); G[i * 3 + 2] = gauss();
        R[i] = -Math.log(1 - Math.random() * .995);                             // exponential: most near, a few far (splash)
        var z = Math.random() * 2 - 1, t = Math.random() * TAU, q = Math.sqrt(1 - z * z);
        D[i * 3] = q * Math.cos(t); D[i * 3 + 1] = q * Math.sin(t); D[i * 3 + 2] = z;
        BR[i] = 1;
      }
    }
    seed();

    var tmp = [0, 0, 0], tmp2 = [0, 0, 0], tmpB = [0, 0, 0];
    function skeleton(m, a, b, k, T, out) {
      if (m.dims === 0) { var n = m.pts.length / 3, j = (Math.floor(a * n) % n) * 3; out[0] = m.pts[j]; out[1] = m.pts[j + 1]; out[2] = 0; return m.pts[j + 2] * 2.2; }  // area-filling points read dim, so lift them
      m.fn(a, b, k, out, T); return 1;
    }
    function place(m, i, T, out) {
      var a = A[i], b = B[i], k = K[i], g0 = G[i * 3], g1 = G[i * 3 + 1], g2 = G[i * 3 + 2], w = WIDTH[o.spread] * o.amount;
      if (o.motion === 'flow' && m.dims === 1) a = (a + T * .02 * o.speed) % 1;
      if (o.motion === 'flow' && m.dims === 2) a = (a + T * .012 * o.speed) % 1;
      var swell = 1;
      if (o.motion === 'breathe') { w = Math.max(w, .02 * o.amount) * (1 + .45 * Math.sin(T * .9 + S[i] * .6)); swell = 1 + .025 * Math.sin(T * .9); }
      if (o.spread === 'dotted' && m.dims === 1) { var Dn = 260; a = (Math.round(a * Dn) + g0 * .06) / Dn; }  // rows of dots
      var br = skeleton(m, a, b, k, T, out);
      if (swell !== 1) { out[0] *= swell; out[1] *= swell; out[2] *= swell; }
      if (o.spread === 'splash') {                                              // burst outward from the skeleton
        var r = R[i] * w * (.4 + .6 * S[i]);
        out[0] += D[i * 3] * r; out[1] += D[i * 3 + 1] * r; out[2] += D[i * 3 + 2] * r; return br * (1 - Math.min(.8, R[i] * .22));
      }
      if (o.spread === 'cloud') { out[0] += g0 * w; out[1] += g1 * w; out[2] += g2 * w; return br; }
      if (o.spread === 'scatter') { out[0] += (hash(i * 1.7) - .5) * 2 * w; out[1] += (hash(i * 2.3 + 5) - .5) * 2 * w; out[2] += (hash(i * 3.1 + 9) - .5) * 2 * w * .4; return br * .8; }  // even, uniform fill: noise, dust
      if (o.spread === 'line' || o.spread === 'dotted' || o.spread === 'stipple' || m.dims === 0) { out[0] += g0 * w; out[1] += g1 * w; out[2] += g2 * w; return br; }
      // ribbon / tube / shell need a local frame
      var e = .002;
      skeleton(m, (a + e) % 1, b, k, T, tmp);
      var tx = tmp[0] - out[0], ty = tmp[1] - out[1], tz = tmp[2] - out[2], tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      var nx, ny, nz;
      if (m.dims === 2) {
        skeleton(m, a, Math.min(.999, b + e), k, T, tmpB);
        var ux = tmpB[0] - out[0], uy = tmpB[1] - out[1], uz = tmpB[2] - out[2];
        nx = ty * uz - tz * uy; ny = tz * ux - tx * uz; nz = tx * uy - ty * ux;
      } else { nx = -ty; ny = tx; nz = 0; if (Math.abs(tz) > .9) { nx = 0; ny = -tz; nz = ty; } }
      var nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      var bx = ty * nz - tz * ny, by = tz * nx - tx * nz, bz = tx * ny - ty * nx;
      if (o.spread === 'ribbon') { var u = g0 * w; out[0] += nx * u + g1 * .004; out[1] += ny * u + g2 * .004; out[2] += nz * u; return br; }
      if (o.spread === 'tube' && m.dims === 1) { var f = S[i] * TAU, rr = w * (.85 + .3 * Math.abs(g0)); out[0] += (nx * Math.cos(f) + bx * Math.sin(f)) * rr; out[1] += (ny * Math.cos(f) + by * Math.sin(f)) * rr; out[2] += (nz * Math.cos(f) + bz * Math.sin(f)) * rr; return br; }
      out[0] += nx * g0 * w; out[1] += ny * g0 * w; out[2] += nz * g0 * w; return br;  // shell
    }
    function compute(T) {
      var ease = o.morphMode === 'once' ? Math.min(1, morphT / Math.max(.1, o.morphDuration)) : .5 - .5 * Math.cos((T - 6) * .35 * o.speed);
      for (var i = 0; i < N; i++) {
        var br = place(M, i, T, tmp2), x = tmp2[0], y = tmp2[1], z = tmp2[2];
        if (MB) { place(MB, i, T, tmp); var k2 = Math.min(1, Math.max(0, ease * 1.4 - S[i] * .4)); k2 = k2 * k2 * (3 - 2 * k2); x += (tmp[0] - x) * k2; y += (tmp[1] - y) * k2; z += (tmp[2] - z) * k2; }
        if (o.motion === 'drift' || o.motion === 'flow' || o.motion === 'morph') { var dr = .012; x += Math.sin(S[i] * 91 + T * .8) * dr; y += Math.cos(S[i] * 57 + T * .7) * dr; z += Math.sin(S[i] * 33 - T * .6) * dr; }
        P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z; BR[i] = br;
      }
    }

    /* WebGL, created only while on screen when lazy */
    var gl = null, U = {}, bufP, bufS, bufB, dirty = true;
    function init() {
      gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true });
      if (!gl) return false;
      function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; }
      var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
      ['uAsp', 'uSize', 'uTilt', 'uTurn', 'uPx', 'uAlpha', 'uPull', 'uStretch', 'uC', 'uPtr', 'uCol', 'uAcc', 'uAccShare'].forEach(function (n) { U[n] = gl.getUniformLocation(pr, n); });
      function attr(name, size) { var b = gl.createBuffer(), l = gl.getAttribLocation(pr, name); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, 0, 0); return b; }
      bufP = attr('aP', 3); bufS = attr('aS', 1); bufB = attr('aB', 1);
      gl.bindBuffer(gl.ARRAY_BUFFER, bufS); gl.bufferData(gl.ARRAY_BUFFER, S, gl.STATIC_DRAW);
      gl.enable(gl.BLEND); setBlend();
      resize(); dirty = true; return true;
    }
    function isDarkInk() { var c = hex(o.colour); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2] < .5; }
    function setBlend() {
      var over = o.blend === 'over' || (o.blend === 'auto' && isDarkInk());
      if (over) gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA); else gl.blendFunc(gl.ONE, gl.ONE);
      overMode = over;
    }
    var overMode = false;
    function release() {
      if (!gl) return; var ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); gl = null;
      var fresh = canvas.cloneNode(false); canvas.parentNode.replaceChild(fresh, canvas); canvas = fresh;   // a lost canvas can't host a new context
      if (ro) { ro.disconnect(); ro.observe(canvas); } if (io) { io.disconnect(); io.observe(canvas); }
    }
    function resize() {
      if (!gl) return; var d = o.pixelRatio || Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * d)); canvas.height = Math.max(1, Math.round(canvas.clientHeight * d)); gl.viewport(0, 0, canvas.width, canvas.height);
    }
    var ptr = { x: 9, y: 9 }, ptrT = { x: 9, y: 9 };
    function onMove(e) {
      var r = canvas.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) { ptrT.x = ptrT.y = 9; return; }  // only while over the canvas
      ptrT.x = (e.clientX - r.left) / r.width * 2 - 1; ptrT.y = 1 - (e.clientY - r.top) / r.height * 2; if (ptr.x > 8) { ptr.x = ptrT.x; ptr.y = ptrT.y; }
    }
    window.addEventListener('pointermove', onMove, { passive: true });

    var T = 6, morphT = 0, last = performance.now(), visible = !o.lazy, raf = 0, dead = false, animated = o.motion !== 'static' && !reduced;
    if (reduced && o.motion === 'morph') morphT = 1e9;   // reduced motion shows the resolved form
    function draw(now) {
      var dt = Math.min(.1, (now - last) / 1000); last = now;
      if (animated) { T += dt; if (visible) morphT += dt; }
      if (animated || dirty) { compute(T); gl.bindBuffer(gl.ARRAY_BUFFER, bufP); gl.bufferData(gl.ARRAY_BUFFER, P, gl.DYNAMIC_DRAW); gl.bindBuffer(gl.ARRAY_BUFFER, bufB); gl.bufferData(gl.ARRAY_BUFFER, BR, gl.DYNAMIC_DRAW); dirty = false; }
      if (ptrT.x > 8) { ptr.x = ptr.y = 9; } else { ptr.x += (ptrT.x - ptr.x) * .08; ptr.y += (ptrT.y - ptr.y) * .08; }
      var bg = o.background ? hex(o.background) : null;
      gl.clearColor(bg ? bg[0] : 0, bg ? bg[1] : 0, bg ? bg[2] : 0, bg ? 1 : 0); gl.clear(gl.COLOR_BUFFER_BIT);
      var sway = o.sway && animated && M.dims !== 0 ? .45 * Math.sin(T * .11) : 0;   // never a full turn: flat forms would go edge-on
      var asp = canvas.width / canvas.height; gl.uniform1f(U.uAsp, asp); gl.uniform1f(U.uSize, o.size * Math.min(1, asp));  // size is of the shorter side
      gl.uniform1f(U.uStretch, o.stretch);
      gl.uniform1f(U.uTilt, M.dims === 0 ? 0 : o.tilt); gl.uniform1f(U.uTurn, (M.dims === 0 ? 0 : o.turn) + sway);
      gl.uniform1f(U.uPx, Math.max(1, canvas.height / 520)); gl.uniform1f(U.uAlpha, o.alpha * (overMode ? 1.6 : 1)); gl.uniform1f(U.uPull, o.cursor ? 1 : 0);
      gl.uniform2f(U.uC, o.cx * 2 - 1, 1 - o.cy * 2); gl.uniform2f(U.uPtr, ptr.x, ptr.y);
      gl.uniform3fv(U.uCol, hex(o.colour)); gl.uniform3fv(U.uAcc, hex(o.accent)); gl.uniform1f(U.uAccShare, o.accentShare);
      gl.drawArrays(gl.POINTS, 0, N);
    }
    function loop(now) {
      if (dead) return;
      if (visible) { if (!gl && !init()) return; if (animated || dirty) draw(now); else last = now; }
      raf = requestAnimationFrame(loop);
    }
    var ro = 'ResizeObserver' in window ? new ResizeObserver(function () { resize(); dirty = true; }) : null; if (ro) ro.observe(canvas);
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (en) {
      var v = en[en.length - 1].isIntersecting;
      if (visible && !v && o.lazy) release();
      visible = v; if (v) dirty = true;
    }, { rootMargin: '150px' }) : null;
    if (io) io.observe(canvas); else visible = true;
    raf = requestAnimationFrame(loop);

    return {
      get canvas() { return canvas; },
      /* PNG of the current frame. The canvas must be on screen (with lazy on, off-screen canvases have no image). */
      snapshot: function () { if (!gl) return null; draw(performance.now()); return canvas.toDataURL('image/png'); },
      /* For verification: the share of pixels that change over ms milliseconds (0 = frozen). */
      measureMotion: function (ms) {
        function grab() { var c = document.createElement('canvas'); c.width = 200; c.height = Math.round(200 * canvas.height / canvas.width) || 1; var g = c.getContext('2d'); g.drawImage(canvas, 0, 0, c.width, c.height); return g.getImageData(0, 0, c.width, c.height).data; }
        return new Promise(function (res) { var a = grab(); setTimeout(function () { var b = grab(), n = 0; for (var i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) + Math.abs(a[i + 3] - b[i + 3]) > 24) n++; res(n / (a.length / 4)); }, ms || 2000); });
      },
      set: function (more) { var reseed = false; if ('morphMode' in more || 'motion' in more) morphT = 0; for (var k in more) { if (k === 'motif' || k === 'count' || k === 'morphTo' || k === 'motion') reseed = true; o[k] = more[k]; } if (reseed) { seed(); animated = o.motion !== 'static' && !reduced; } if (gl) { gl.bindBuffer(gl.ARRAY_BUFFER, bufS); gl.bufferData(gl.ARRAY_BUFFER, S, gl.STATIC_DRAW); setBlend(); resize(); } dirty = true; },
      destroy: function () { dead = true; cancelAnimationFrame(raf); if (ro) ro.disconnect(); if (io) io.disconnect(); window.removeEventListener('pointermove', onMove); release(); }
    };
  }

  window.ParticleMotif = { mount: mount, fromText: fromText, fromPath: fromPath, motifs: Object.keys(MOTIFS), spreads: Object.keys(WIDTH), motions: ['static', 'drift', 'flow', 'breathe', 'morph'], define: function (name, m) { MOTIFS[name] = m; } };
})();
