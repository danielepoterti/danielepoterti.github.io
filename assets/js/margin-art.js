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
    var c0 = [0.28, 0.68], v = [0.44, -0.3];
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
    label(ctx, "h + α·v", W - 10, H - 6, C.ink, "right");
    label(ctx, "α = " + a.toFixed(2), 10, H - 6, C.faint);
  }

  /* 3. Linear probing: a linear classifier learns to read a concept off
     the activations; its decision boundary swings into place. */
  var probePts = (function () {
    var r = rng(11), pts = [];
    for (var i = 0; i < 64; i++) {
      var cls = i % 2;
      var cx = cls ? 0.64 : 0.36, cy = cls ? 0.38 : 0.62;
      pts.push([cx + gauss(r) * 0.1, cy + gauss(r) * 0.1, cls]);
    }
    return pts;
  })();
  function probing(ctx, t) {
    var cycle = 8, k = reduced ? 6 : t % cycle;
    var X = function (x) { return 10 + x * (W - 20); };
    var Y = function (y) { return 4 + y * (H - 26); };
    // Optimal boundary is perpendicular to the class-mean difference.
    var best = Math.atan2(-0.24, 0.28) + Math.PI / 2;
    var th = best + 1.3 * Math.exp(-0.75 * k) * Math.cos(2.2 * k);
    var nx = Math.cos(th - Math.PI / 2), ny = Math.sin(th - Math.PI / 2);
    var mx = 0.5, my = 0.5;
    var side = function (x, y) { return (x - mx) * nx + (y - my) * ny > 0 ? 1 : 0; };

    // shade the half-plane the probe calls "class 1", inside the plot area
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(6, 2, W - 12, H - 24, 8); else ctx.rect(6, 2, W - 12, H - 24);
    ctx.clip();
    ctx.beginPath();
    var d = 2, ux = Math.cos(th), uy = Math.sin(th);
    ctx.moveTo(X(mx - ux * d), Y(my - uy * d));
    ctx.lineTo(X(mx + ux * d), Y(my + uy * d));
    ctx.lineTo(X(mx + ux * d + nx * d), Y(my + uy * d + ny * d));
    ctx.lineTo(X(mx - ux * d + nx * d), Y(my - uy * d + ny * d));
    ctx.closePath();
    ctx.fillStyle = C.wash;
    ctx.fill();
    ctx.restore();

    var correct = 0;
    probePts.forEach(function (p) {
      if (side(p[0], p[1]) === p[2]) correct++;
      ctx.fillStyle = p[2] ? C.green : C.faint;
      ctx.beginPath();
      if (p[2]) ctx.arc(X(p[0]), Y(p[1]), 2.4, 0, 7);
      else ctx.rect(X(p[0]) - 2, Y(p[1]) - 2, 4, 4);
      ctx.fill();
    });

    ctx.strokeStyle = C.text;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(X(mx - ux * 0.62), Y(my - uy * 0.62));
    ctx.lineTo(X(mx + ux * 0.62), Y(my + uy * 0.62));
    ctx.stroke();
    arrow(ctx, X(mx), Y(my), X(mx + nx * 0.16), Y(my + ny * 0.16), C.ink, 1.6);
    label(ctx, "w", X(mx + nx * 0.16) + 4, Y(my + ny * 0.16) + 3, C.ink);

    label(ctx, "probe acc " + (correct / probePts.length).toFixed(2), 10, H - 6, C.faint);
    ctx.fillStyle = C.green;
    ctx.beginPath(); ctx.arc(W - 78, H - 9.5, 2.6, 0, 7); ctx.fill();
    label(ctx, "true", W - 72, H - 6, C.faint);
    ctx.fillStyle = C.faint;
    ctx.fillRect(W - 44, H - 12, 5, 5);
    label(ctx, "false", W - 36, H - 6, C.faint);
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

  var drawers = { grokking: grokking, steering: steering, probing: probing, superposition: superposition };
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var host = document.querySelector(".margin-art");
  if (!host) return;
  var figs = Array.prototype.slice.call(host.querySelectorAll(".art"));
  var items = [];

  figs.forEach(function (fig) {
    var cv = fig.querySelector("canvas[data-art]");
    var fn = cv && drawers[cv.getAttribute("data-art")];
    if (!fn) return;
    cv.width = W * dpr;
    cv.height = H * dpr;
    items.push({ fig: fig, cv: cv, ctx: cv.getContext("2d"), fn: fn, visible: false, t0: 0 });
  });
  if (!items.length) return;

  // Spread the figures down the page, alternating sides (set in the HTML);
  // drop the ones that don't fit on short pages.
  function place() {
    var h = host.parentNode.offsetHeight, top = 60, step = Math.max(420, (h - 400) / Math.max(1, items.length - 1));
    items.forEach(function (it, i) {
      var y = top + i * step;
      it.fig.style.top = y + "px";
      it.fig.hidden = y > h - 260;
    });
  }
  place();
  window.addEventListener("resize", place);
  window.addEventListener("load", place);

  // ?art_t=<seconds> freezes the animations at that time (for previews).
  var frozen = parseFloat((location.search.match(/[?&]art_t=([\d.]+)/) || [])[1]);

  // Reveal on scroll, and restart each animation when it comes into view.
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var it = items.filter(function (x) { return x.fig === e.target; })[0];
        if (!it) return;
        if (e.isIntersecting && !it.visible) it.t0 = performance.now();
        it.visible = e.isIntersecting;
        if (e.isIntersecting) it.fig.classList.add("art--in");
        if (reduced) draw(it, performance.now());
      });
    }, { rootMargin: "0px 0px -12% 0px" });
    items.forEach(function (it) { io.observe(it.fig); });
  } else {
    items.forEach(function (it) { it.visible = true; it.fig.classList.add("art--in"); });
  }

  function draw(it, now) {
    var t = isNaN(frozen) ? (now - it.t0) / 1000 : frozen;
    it.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    it.ctx.clearRect(0, 0, W, H);
    it.fn(it.ctx, t);
  }

  function frame(now) {
    items.forEach(function (it) {
      if (it.visible && it.cv.getClientRects().length) draw(it, now);
    });
    if (!reduced) requestAnimationFrame(frame);
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { requestAnimationFrame(frame); });
  } else {
    requestAnimationFrame(frame);
  }
})();
