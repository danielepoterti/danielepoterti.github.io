/* Small looping canvas animations of ML / interpretability ideas, shown in
   the page margins on wide screens. Each <canvas data-art="name"> gets a
   drawer; one requestAnimationFrame loop drives them all. */
(function () {
  var C = {
    green: "#0f9d76",
    ink: "#0a7457",
    text: "#16181a",
    faint: "#8a918e",
    rule: "#e2ebe7",
    wash: "#e8f5f0"
  };
  var W = 200, H = 150;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return (1 - Math.cos(Math.PI * t)) / 2; }

  // Deterministic pseudo-random so the scatter looks the same every visit.
  function rng(seed) {
    return function () {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  }
  function gauss(r) {
    var u = r() || 1e-6, v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function label(ctx, txt, x, y, color, align) {
    ctx.fillStyle = color || C.faint;
    ctx.font = "500 9.5px 'DM Sans', sans-serif";
    ctx.textAlign = align || "left";
    ctx.fillText(txt, x, y);
  }

  function arrow(ctx, x0, y0, x1, y1, color, width) {
    var a = Math.atan2(y1 - y0, x1 - x0), len = Math.hypot(x1 - x0, y1 - y0);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width || 1.6;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    if (len < 4) return;
    var h = 6;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - h * Math.cos(a - 0.45), y1 - h * Math.sin(a - 0.45));
    ctx.lineTo(x1 - h * Math.cos(a + 0.45), y1 - h * Math.sin(a + 0.45));
    ctx.closePath();
    ctx.fill();
  }

  /* 1. Grokking: train accuracy saturates early, test accuracy jumps late. */
  function grokking(ctx, t) {
    var L = 22, R = W - 10, T = 14, B = H - 24;
    var cycle = 7, p = Math.min(1, (t % cycle) / 5);
    if (reduced) p = 1;
    var train = function (x) { return 0.02 + 0.97 * sigmoid((x - 0.28) * 20); };
    var test = function (x) { return 0.04 + 0.93 * sigmoid((x - 0.76) * 26); };
    var X = function (x) { return L + x * (R - L); };
    var Y = function (y) { return B - y * (B - T); };

    ctx.strokeStyle = C.rule;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(L, T); ctx.lineTo(L, B); ctx.lineTo(R, B);
    ctx.stroke();
    ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(L, Y(1)); ctx.lineTo(R, Y(1)); ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, "1", L - 5, Y(1) + 3, C.faint, "right");
    label(ctx, "0", L - 5, B + 3, C.faint, "right");
    label(ctx, "steps (log) →", R, B + 14, C.faint, "right");

    [[train, C.text], [test, C.green]].forEach(function (c) {
      ctx.strokeStyle = c[1];
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (var i = 0; i <= 120 * p; i++) {
        var x = i / 120;
        if (i === 0) ctx.moveTo(X(x), Y(c[0](x))); else ctx.lineTo(X(x), Y(c[0](x)));
      }
      ctx.stroke();
      ctx.fillStyle = c[1];
      ctx.beginPath();
      ctx.arc(X(p), Y(c[0](p)), 2.6, 0, 7);
      ctx.fill();
    });
    if (p > 0.55) label(ctx, "train", X(0.52), Y(1) + 12, C.text);
    if (p > 0.9) label(ctx, "test", X(0.8), Y(0.62), C.ink);
  }

  /* 2. Steering: shift a cluster of activations along a direction v. */
  var steerPts = (function () {
    var r = rng(7), pts = [];
    for (var i = 0; i < 46; i++) pts.push([gauss(r) * 0.075, gauss(r) * 0.075]);
    return pts;
  })();
  function steering(ctx, t) {
    var a = reduced ? 0.8 : ease(((t / 3) % 2) < 1 ? (t / 3) % 1 : 1 - (t / 3) % 1);
    var c0 = [0.3, 0.64], v = [0.42, -0.36];
    var X = function (x) { return 10 + x * (W - 20); };
    var Y = function (y) { return 6 + y * (H - 26); };

    ctx.strokeStyle = C.rule;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(X(c0[0]), Y(c0[1]), 30, 0, 7);
    ctx.stroke();
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(X(c0[0]), Y(c0[1]));
    ctx.lineTo(X(c0[0] + v[0]), Y(c0[1] + v[1]));
    ctx.stroke();
    ctx.setLineDash([]);

    steerPts.forEach(function (p) {
      var x = c0[0] + p[0] + a * v[0], y = c0[1] + p[1] + a * v[1];
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = mix(C.faint, C.green, a);
      ctx.beginPath();
      ctx.arc(X(x), Y(y), 2.3, 0, 7);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    arrow(ctx, X(c0[0]), Y(c0[1]), X(c0[0] + a * v[0]), Y(c0[1] + a * v[1]), C.ink, 2);
    label(ctx, "h + α·v", X(c0[0] + v[0]) - 4, Y(c0[1] + v[1]) - 6, C.ink, "right");
    label(ctx, "α = " + a.toFixed(2), 10, H - 6, C.faint);
  }

  /* 3. Induction head: on a repeated sequence, attend to the token after
     the previous occurrence of the current token. */
  var seq = "ABCDEFABCDEF".split("");
  function induction(ctx, t) {
    var n = seq.length, s = 10, ox = (W - n * s) / 2 + 6, oy = 4;
    var q = reduced ? n - 1 : Math.floor(t * 1.6) % (n + 3);
    for (var i = 0; i < n; i++) {
      for (var j = 0; j <= i; j++) {
        var w = i >= 6 ? (j === i - 5 ? 1 : 0.04) : (j === 0 ? 0.35 : 0.06);
        var shown = i <= q;
        ctx.fillStyle = shown ? C.green : C.rule;
        ctx.globalAlpha = shown ? 0.1 + 0.9 * w : 0.6;
        ctx.fillRect(ox + j * s, oy + i * s, s - 1, s - 1);
      }
    }
    ctx.globalAlpha = 1;
    if (q < n) {
      ctx.strokeStyle = C.text;
      ctx.lineWidth = 1;
      ctx.strokeRect(ox - 0.5, oy + q * s - 0.5, (q + 1) * s, s);
    }
    ctx.font = "500 8.5px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    for (var k = 0; k < n; k++) {
      var hot = q < n && (k === q || (q >= 6 && k === q - 5));
      ctx.fillStyle = hot ? C.ink : C.faint;
      ctx.fillText(seq[k], ox + k * s + s / 2 - 0.5, oy + n * s + 11);
      ctx.save();
      ctx.translate(ox - 7, oy + k * s + s / 2 + 3);
      ctx.fillStyle = q === k ? C.ink : C.faint;
      ctx.fillText(seq[k], 0, 0);
      ctx.restore();
    }
  }

  /* 4. Superposition: as features get sparser, 5 of them share 2 dims. */
  function superposition(ctx, t) {
    var s = reduced ? 1 : ease(((t / 4) % 2) < 1 ? (t / 4) % 1 : 1 - (t / 4) % 1);
    var cx = W / 2, cy = 64, r = 46;
    var start = [90, 0, 234, 306, 162], target = [90, 18, 234, 306, 162];
    ctx.strokeStyle = C.rule;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r - 6, cy); ctx.lineTo(cx + r + 6, cy);
    ctx.moveTo(cx, cy - r - 6); ctx.lineTo(cx, cy + r + 6);
    ctx.stroke();
    for (var k = 0; k < 5; k++) {
      var ang = lerp(start[k], target[k], s) * Math.PI / 180;
      var len = k < 2 ? 1 : s;
      arrow(ctx, cx, cy, cx + Math.cos(ang) * r * len, cy - Math.sin(ang) * r * len,
        k < 2 ? C.ink : mix(C.rule, C.green, s), 1.8);
    }
    var bx = 40, bw = W - 80, by = H - 22;
    label(ctx, "dense", bx - 4, by + 6, C.faint, "right");
    label(ctx, "sparse", bx + bw + 4, by + 6, C.faint, "left");
    ctx.fillStyle = C.rule;
    ctx.fillRect(bx, by, bw, 5);
    ctx.fillStyle = C.green;
    ctx.fillRect(bx, by, bw * s, 5);
  }

  function mix(a, b, t) {
    var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    var ch = function (sh) {
      return Math.round(lerp((pa >> sh) & 255, (pb >> sh) & 255, t));
    };
    return "rgb(" + ch(16) + "," + ch(8) + "," + ch(0) + ")";
  }

  var drawers = { grokking: grokking, steering: steering, induction: induction, superposition: superposition };
  var items = [];
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  Array.prototype.forEach.call(document.querySelectorAll("canvas[data-art]"), function (cv) {
    var fn = drawers[cv.getAttribute("data-art")];
    if (!fn) return;
    cv.width = W * dpr;
    cv.height = H * dpr;
    var ctx = cv.getContext("2d");
    items.push({ cv: cv, ctx: ctx, fn: fn });
  });
  if (!items.length) return;

  // ?art_t=<seconds> freezes the animations at that time (for previews).
  var frozen = parseFloat((location.search.match(/[?&]art_t=([\d.]+)/) || [])[1]);
  var t0 = performance.now();
  function frame(now) {
    var t = isNaN(frozen) ? (now - t0) / 1000 : frozen;
    items.forEach(function (it) {
      if (!it.cv.getClientRects().length) return; // hidden (narrow screen): skip work
      it.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      it.ctx.clearRect(0, 0, W, H);
      it.fn(it.ctx, t);
    });
    if (!reduced) requestAnimationFrame(frame);
  }
  // With reduced motion only a static frame is drawn; redraw it on resize
  // in case the rails were hidden when it was first drawn.
  if (reduced) window.addEventListener("resize", function () { frame(performance.now()); });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { requestAnimationFrame(frame); });
  } else {
    requestAnimationFrame(frame);
  }
})();
