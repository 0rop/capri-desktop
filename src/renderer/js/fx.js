// Full-screen effect layer: shards, light beams, the zigzag streak between two
// teleport points, and the little data glyphs Capri sheds while Claude works.
// Drawn on whole frames (24 fps) and only while something is alive.

import { rand, pick } from './util.js';

const COLORS = {
  red: '#ff2152',
  green: '#36ff7a',
  ink: '#14101c',
  violet: '#7b3dff',
  paper: '#fff4f6',
  blue: '#3d6bff',
};

const SHARD_PALETTE = ['red', 'red', 'red', 'red', 'ink', 'ink', 'green', 'green', 'violet', 'paper'];
const GLYPHS = ['01', '10', '▚', '▞', '◢', '◣', '>_', '{}', '#', '⌁', '//', '0x'];
const FRAME_MS = 1000 / 24;

export class FxLayer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.items = [];
    this.running = false;
    this.last = 0;
  }

  resize(width, height) {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  add(item) {
    item.born = performance.now();
    this.items.push(item);
    if (!this.running) {
      this.running = true;
      requestAnimationFrame((t) => this.frame(t));
    }
  }

  // Shards thrown out (or sucked in) around a point.
  burst(x, y, { count = 22, power = 1, inward = false, spread = 70 } = {}) {
    for (let i = 0; i < count; i++) {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(220, 680) * power;
      const ox = x + rand(-spread, spread) * 0.5;
      const oy = y + rand(-spread, spread);
      const life = rand(260, 620);
      this.add({
        type: 'shard',
        life,
        x: inward ? ox + Math.cos(angle) * speed * life / 1600 : ox,
        y: inward ? oy + Math.sin(angle) * speed * life / 1600 : oy,
        vx: Math.cos(angle) * speed * (inward ? -1 : 1),
        vy: Math.sin(angle) * speed * (inward ? -1 : 1),
        rot: rand(0, Math.PI * 2),
        vr: rand(-9, 9),
        len: rand(10, 36),
        wid: rand(3, 10),
        color: COLORS[pick(SHARD_PALETTE)],
      });
    }
  }

  // Vertical pillar of light, from the feet up to the top of the screen (or reversed).
  beam(x, bottom, { down = false, life = 200, width = 30 } = {}) {
    this.add({ type: 'beam', life, x, bottom, down, width, seed: Math.random() * 1000 });
  }

  // Jagged line between two points, a frame or two long. It tells the eye where she went.
  streak(x1, y1, x2, y2, { life = 120 } = {}) {
    const pts = [];
    const n = 9;
    const nx = -(y2 - y1), ny = x2 - x1;
    const len = Math.hypot(nx, ny) || 1;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const off = i === 0 || i === n ? 0 : rand(-1, 1) * Math.min(60, len * 0.08);
      pts.push([x1 + (x2 - x1) * t + (nx / len) * off, y1 + (y2 - y1) * t + (ny / len) * off]);
    }
    this.add({ type: 'streak', life, pts });
  }

  // Horizontal slivers of the body knocked sideways.
  slices(x, y, w, h, { count = 7, life = 160 } = {}) {
    for (let i = 0; i < count; i++) {
      this.add({
        type: 'slice',
        life: life * rand(0.6, 1),
        x: x + rand(-w * 0.3, w * 0.3),
        y: y + rand(0, h),
        w: rand(w * 0.3, w * 1.1),
        h: rand(2, 7),
        dx: rand(-60, 60),
        color: COLORS[pick(['red', 'green', 'violet', 'paper'])],
      });
    }
  }

  glyph(x, y) {
    this.add({ type: 'glyph', life: rand(900, 1400), x: x + rand(-40, 40), y, text: pick(GLYPHS), drift: rand(-12, 12) });
  }

  frame(now) {
    if (now - this.last < FRAME_MS - 2) {
      requestAnimationFrame((t) => this.frame(t));
      return;
    }
    const dt = Math.min(0.08, (now - (this.last || now)) / 1000);
    this.last = now;

    const { ctx } = this;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.items = this.items.filter((it) => now - it.born < it.life);
    for (const it of this.items) this.draw(it, (now - it.born) / it.life, dt);

    if (this.items.length) {
      requestAnimationFrame((t) => this.frame(t));
    } else {
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.running = false;
      this.last = 0;
    }
  }

  draw(it, t, dt) {
    const { ctx } = this;
    switch (it.type) {
      case 'shard': {
        it.x += it.vx * dt;
        it.y += it.vy * dt;
        it.vx *= 0.86;
        it.vy *= 0.86;
        it.rot += it.vr * dt;
        const k = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
        const l = it.len * k, w = it.wid * k;
        const shape = () => {
          ctx.beginPath();
          ctx.moveTo(-l * 0.5, 0);
          ctx.lineTo(0, -w * 0.5);
          ctx.lineTo(l * 0.5, w * 0.15);
          ctx.lineTo(-l * 0.1, w * 0.5);
          ctx.closePath();
        };
        ctx.save();
        ctx.translate(it.x, it.y);
        ctx.rotate(it.rot);
        ctx.translate(-2, 2);
        shape();
        ctx.fillStyle = COLORS.violet;
        ctx.fill();
        ctx.translate(2, -2);
        shape();
        ctx.fillStyle = it.color;
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'beam': {
        const k = it.down ? 1 - t : t;
        const w = it.width * (1 - t) + 2;
        const top = it.down ? it.bottom * k * 0.15 : 0;
        const h = it.bottom - top;
        ctx.save();
        // jagged edges, re-rolled every frame
        const edge = (side) => {
          const pts = [];
          for (let y = top; y <= it.bottom; y += 18) pts.push([it.x + side * (w / 2 + rand(0, w * 0.35)), y]);
          return pts;
        };
        const left = edge(-1), right = edge(1).reverse();
        const poly = (dx) => {
          ctx.beginPath();
          [...left, ...right].forEach(([x, y], i) => (i ? ctx.lineTo(x + dx, y) : ctx.moveTo(x + dx, y)));
          ctx.closePath();
        };
        poly(-4);
        ctx.fillStyle = COLORS.violet;
        ctx.fill();
        poly(0);
        ctx.fillStyle = COLORS.red;
        ctx.fill();
        ctx.fillStyle = COLORS.paper;
        ctx.fillRect(it.x - Math.max(1, w * 0.12), top, Math.max(2, w * 0.24), h);
        ctx.restore();
        break;
      }
      case 'streak': {
        ctx.save();
        ctx.lineJoin = 'miter';
        const path = (dx, dy) => {
          ctx.beginPath();
          it.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x + dx, y + dy) : ctx.moveTo(x + dx, y + dy)));
        };
        ctx.globalAlpha = 1 - t * 0.6;
        path(-3, 3);
        ctx.strokeStyle = COLORS.violet;
        ctx.lineWidth = 5;
        ctx.stroke();
        path(0, 0);
        ctx.strokeStyle = COLORS.red;
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.strokeStyle = COLORS.paper;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'slice': {
        ctx.fillStyle = it.color;
        ctx.globalAlpha = 1 - t;
        ctx.fillRect(it.x + it.dx * t, it.y, it.w, it.h);
        ctx.globalAlpha = 1;
        break;
      }
      case 'glyph': {
        ctx.save();
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.globalAlpha = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
        // stepped rise: whole pixels, every frame
        const y = Math.round(it.y - t * 46);
        const x = Math.round(it.x + it.drift * t);
        ctx.fillStyle = COLORS.violet;
        ctx.fillText(it.text, x - 1, y + 1);
        ctx.fillStyle = COLORS.green;
        ctx.fillText(it.text, x, y);
        ctx.restore();
        break;
      }
    }
  }
}
