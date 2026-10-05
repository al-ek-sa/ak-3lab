const D = SCHEMA;
const FONT = '"IBM Plex Sans", "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const COL = { data: "#7a1f45", addr: "#5b2a6e", ctrl: "#c2577f", stat: "#9a5a48" };
const PINK = ["#8c2350", "#55112e", "#2e0718"];
const CUC = ["#4a0d28", "#2a0616", "#2e0718"];
const INK = "#2a0f20";
const LIGHT = "#fde7f1";
const SIG = ["#f9d6e3", "#e591b2", "#b23a68"];
const STAT = ["#f6dcd5", "#5a2a24"];
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
const pctEl = document.getElementById("pct");
let scale = 1, ox = 0, oy = 0, dpr = 1, vw = 0, vh = 0, queued = false;
const MIN = 0.2, MAX = 8;

function resize() {
  dpr = window.devicePixelRatio || 1;
  const r = canvas.getBoundingClientRect();
  vw = r.width; vh = r.height;
  canvas.width = Math.round(vw * dpr);
  canvas.height = Math.round(vh * dpr);
  draw();
}

function fit() {
  const pad = 24;
  const s = Math.min((vw - pad * 2) / D.W, (vh - pad * 2 - 56) / D.H);
  scale = Math.max(MIN, Math.min(MAX, s));
  ox = (vw - D.W * scale) / 2;
  oy = Math.max(pad, (vh - 56 - D.H * scale) / 2);
  draw();
}

function zoomAt(f, cx, cy) {
  const ns = Math.max(MIN, Math.min(MAX, scale * f));
  const k = ns / scale;
  ox = cx - (cx - ox) * k;
  oy = cy - (cy - oy) * k;
  scale = ns;
  draw();
}

function draw() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(render);
}

function grad(x, y, h, c) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, c[0]);
  g.addColorStop(1, c[1]);
  return g;
}

function rrect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(lines, cx, cy, size, opts) {
  const o = opts || {};
  ctx.fillStyle = o.color || INK;
  ctx.font = (o.italic ? "italic " : "") + (o.bold ? "600 " : "400 ") + size + "px " + FONT;
  ctx.textAlign = o.align || "center";
  ctx.textBaseline = "middle";
  const lh = size * 1.2;
  const y0 = cy - (lh * (lines.length - 1)) / 2;
  lines.forEach((l, i) => ctx.fillText(l, cx, y0 + i * lh));
}

function insideCU(b) {
  const cu = D.blocks.find(q => q.kind === "cu");
  return cu && b.kind !== "cu" && b.x >= cu.x && b.y >= cu.y && b.x + b.w <= cu.x + cu.w && b.y + b.h <= cu.y + cu.h;
}

function box(b, c, radius) {
  ctx.fillStyle = grad(b.x, b.y, b.h, c);
  if (radius) rrect(b.x, b.y, b.w, b.h, radius); else { ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); }
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = c === PINK && insideCU(b) ? "#a0386a" : c[2];
  ctx.stroke();
}

const SIZE = { reg: 12, mem: 12, mux: 10, unit: 10, const: 9, sig: 10, status: 10 };

function drawBlock(b) {
  const k = b.kind;
  if (k === "junction") {
    ctx.fillStyle = "#500724";
    ctx.beginPath();
    ctx.arc(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (k === "alu") {
    const ins = 0.2 * b.w;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x + b.w, b.y);
    ctx.lineTo(b.x + b.w - ins, b.y + b.h);
    ctx.lineTo(b.x + ins, b.y + b.h);
    ctx.closePath();
    ctx.fillStyle = grad(b.x, b.y, b.h, PINK);
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = PINK[2];
    ctx.stroke();
    text(["ALU"], b.x + b.w / 2, b.y + b.h / 2, 16, { bold: true, color: LIGHT });
    return;
  }
  if (k === "cu") {
    box(b, CUC, 0);
    text(["Control Unit (microprogrammed)"], b.x + 8, b.y + 14, 12, { bold: true, align: "left", color: LIGHT });
    return;
  }
  if (k === "rf") {
    box(b, PINK, 0);
    text(["Register File"], b.x + b.w / 2, b.y + 18, 12, { bold: true, color: LIGHT });
    return;
  }
  if (k === "status") {
    ctx.fillStyle = "#ecd9a4";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    text(b.label.split("\n"), b.x + b.w / 2, b.y + b.h / 2, 10, { italic: true, color: "#3a2f10" });
    return;
  }
  if (k === "sig") {
    box(b, SIG, 0);
    text(b.label.split("\n"), b.x + b.w / 2, b.y + b.h / 2, 10, { italic: true });
    return;
  }
  box(b, PINK, k === "mux" ? 7 : 0);
  if (b.id === "IR") {
    text(["IR"], b.x + b.w / 2, b.y + 17, 12, { bold: true, color: LIGHT });
    text(["opcode · mode · src · dst · idx"], b.x + b.w / 2, b.y + 36, 8, { color: LIGHT });
    return;
  }
  text(b.label.split("\n"), b.x + b.w / 2, b.y + b.h / 2, SIZE[k] || 10, { bold: k === "reg", color: LIGHT });
}

function drawEdge(e) {
  const col = COL[e.kind];
  const thick = e.kind === "data" || e.kind === "addr";
  const r = 5;
  ctx.strokeStyle = col;
  ctx.lineWidth = thick ? 1.5 : 1;
  ctx.setLineDash(thick ? [] : [4, 3]);
  ctx.beginPath();
  ctx.moveTo(e.pts[0][0], e.pts[0][1]);
  for (let i = 0; i < e.pts.length - 1; i++) {
    const a = e.pts[i], b = e.pts[i + 1];
    const horiz = a[1] === b[1];
    const dir = horiz ? Math.sign(b[0] - a[0]) : Math.sign(b[1] - a[1]);
    const hops = (e.hops[i] || []).slice().sort((p, q) => horiz ? (p[0] - q[0]) * dir : (p[1] - q[1]) * dir);
    for (const [hx, hy] of hops) {
      if (horiz) {
        ctx.lineTo(hx - dir * r, hy);
        ctx.arc(hx, hy, r, dir > 0 ? Math.PI : 0, dir > 0 ? 0 : Math.PI, dir < 0);
      } else {
        ctx.lineTo(hx, hy - dir * r);
        ctx.arc(hx, hy, r, dir > 0 ? -Math.PI / 2 : Math.PI / 2, dir > 0 ? Math.PI / 2 : -Math.PI / 2, dir < 0);
      }
    }
    ctx.lineTo(b[0], b[1]);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  if (e.toJ) return;
  const a = e.pts[e.pts.length - 2], b = e.pts[e.pts.length - 1];
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L, s = 4.5;
  const p1 = [b[0] - ux * s * 1.4 - uy * s * 0.6, b[1] - uy * s * 1.4 + ux * s * 0.6];
  const p2 = [b[0] - ux * s * 1.4 + uy * s * 0.6, b[1] - uy * s * 1.4 - ux * s * 0.6];
  ctx.beginPath();
  ctx.moveTo(p1[0], p1[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.lineTo(p2[0], p2[1]);
  if (thick) { ctx.closePath(); ctx.fillStyle = col; ctx.fill(); } else { ctx.lineWidth = 1; ctx.stroke(); }
}

function render() {
  queued = false;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, vw, vh);
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
  ctx.fillStyle = "#fff5fa";
  ctx.shadowColor = "rgba(90, 30, 60, 0.18)";
  ctx.shadowBlur = 24;
  ctx.fillRect(0, 0, D.W, D.H);
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
  const cu = D.blocks.find(b => b.kind === "cu");
  if (cu) drawBlock(cu);
  D.edges.forEach(drawEdge);
  D.blocks.forEach(b => { if (b.kind !== "cu") drawBlock(b); });
  D.cells.forEach(c => {
    box(c, c.sp ? SIG : PINK, 0);
    text([c.t], c.x + c.w / 2, c.y + c.h / 2, 10, { color: c.sp ? INK : LIGHT });
  });
  D.texts.forEach(t => {
    const inCU = cu && t.x > cu.x && t.x < cu.x + cu.w && t.y > cu.y && t.y < cu.y + cu.h;
    const base = t.c === "#333333" ? "#4a2a3c" : t.c;
    text([t.t], t.x, t.y, t.s, { align: "left", color: inCU ? LIGHT : base });
  });
  legend();
  pctEl.textContent = Math.round(scale * 100) + "%";
}

const pointers = new Map();
let pinchDist = 0;
canvas.addEventListener("pointerdown", e => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  canvas.classList.add("dragging");
  if (pointers.size === 2) {
    const [p, q] = [...pointers.values()];
    pinchDist = Math.hypot(p.x - q.x, p.y - q.y);
  }
});
canvas.addEventListener("pointermove", e => {
  if (!pointers.has(e.pointerId)) return;
  const prev = pointers.get(e.pointerId);
  const cur = { x: e.clientX, y: e.clientY };
  pointers.set(e.pointerId, cur);
  if (pointers.size === 1) {
    ox += cur.x - prev.x;
    oy += cur.y - prev.y;
    draw();
  } else if (pointers.size === 2) {
    const [p, q] = [...pointers.values()];
    const d = Math.hypot(p.x - q.x, p.y - q.y);
    const r = canvas.getBoundingClientRect();
    if (pinchDist > 0) zoomAt(d / pinchDist, (p.x + q.x) / 2 - r.left, (p.y + q.y) / 2 - r.top);
    pinchDist = d;
  }
});
function up(e) {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinchDist = 0;
  if (pointers.size === 0) canvas.classList.remove("dragging");
}
canvas.addEventListener("pointerup", up);
canvas.addEventListener("pointercancel", up);
canvas.addEventListener("wheel", e => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  if (e.ctrlKey || Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
    zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), e.clientX - r.left, e.clientY - r.top);
  } else {
    ox -= e.deltaX;
    draw();
  }
}, { passive: false });
canvas.addEventListener("dblclick", e => {
  const r = canvas.getBoundingClientRect();
  zoomAt(2, e.clientX - r.left, e.clientY - r.top);
});
document.getElementById("in").onclick = () => zoomAt(1.25, vw / 2, vh / 2);
document.getElementById("out").onclick = () => zoomAt(0.8, vw / 2, vh / 2);
document.getElementById("fit").onclick = fit;
window.addEventListener("keydown", e => {
  if (e.key === "+" || e.key === "=") zoomAt(1.25, vw / 2, vh / 2);
  else if (e.key === "-" || e.key === "_") zoomAt(0.8, vw / 2, vh / 2);
  else if (e.key === "0") fit();
  else if (e.key === "ArrowLeft") { ox += 60; draw(); }
  else if (e.key === "ArrowRight") { ox -= 60; draw(); }
  else if (e.key === "ArrowUp") { oy += 60; draw(); }
  else if (e.key === "ArrowDown") { oy -= 60; draw(); }
});
window.addEventListener("resize", resize);
resize();
fit();
if (document.fonts && document.fonts.load) {
  Promise.all([
    document.fonts.load('400 12px "IBM Plex Sans"'),
    document.fonts.load('600 12px "IBM Plex Sans"'),
    document.fonts.load('italic 400 12px "IBM Plex Sans"')
  ]).then(draw).catch(draw);
}
