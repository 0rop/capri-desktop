// Capri herself: where she floats, how she moves, how she reacts.
// She acts with her head and her mane, like in the show: the cocked head, the bristling
// shards, the manic laugh, looking up at the satellite.
// The body is drawn "on twos" (12 drawings a second) like cel animation,
// and "on ones" (24) for the teleport, which is the action beat.

import { SpriteRenderer, SPRITE } from './sprite.js';
import { sleep, rand, clamp, ease, tween, reducedMotion } from './util.js';

const ON_TWOS = 1000 / 12;
const ON_ONES = 1000 / 24;
const ASLEEP = 1000 / 6;
const SLEEP_AFTER = 10 * 60 * 1000;

const GREEN = [0.21, 1, 0.48];
const INK = [0.08, 0.06, 0.11];
const RED = [1, 0.13, 0.32];

export class Capri {
  constructor({ root, canvas, image, fx, voice }) {
    this.root = root;
    this.canvas = canvas;
    this.sprite = new SpriteRenderer(canvas, image);
    this.fx = fx;
    this.voice = voice;

    this.scale = 0.6;
    this.view = { w: innerWidth, h: innerHeight };
    this.pos = { x: innerWidth - 200, y: innerHeight - 6 };
    this.facing = 1; // 1: as drawn (reaching left), -1: mirrored
    this.mode = 'idle'; // idle | work | alert | sleep
    this.busy = false;
    this.hidden = false;
    this.wander = true;
    this.dragging = false;

    this.p = {
      seed: 0, boil: 0.9, hair: 0, head: 0, mane: 0, glitch: 0, glitchSeed: 0, split: 0,
      collapse: 0, dissolve: 0, sparkle: 1, grade: 1, sil: INK, silAmount: 0, misreg: [-2.6, 2.2], alpha: 1,
    };
    this.bob = 0;
    this.tilt = 0; // whole-body lean, degrees
    this.gesture = null;
    this.frameMs = ON_TWOS;
    this.lastDraw = 0;

    const now = performance.now();
    this.lastActivity = now;
    this.nextTwitch = now + rand(4000, 9000);
    this.nextWander = now + rand(50000, 100000);
    this.nextGaze = now + rand(40000, 90000);
    this.nextShed = now + rand(3000, 8000);
    this.nextNotice = 0;
    this.lastGlyph = 0;

    this.onMove = null;        // called whenever her head moves on screen
    this.onTeleport = null;    // (phase: 'start' | 'end')
    this.onClick = null;

    this.alphaMap = this.buildAlphaMap(image);
    this.setScale(this.scale);
    this.bindPointer();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  // ---------- geometry ----------

  buildAlphaMap(image) {
    const c = document.createElement('canvas');
    c.width = SPRITE.width;
    c.height = SPRITE.height;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    return ctx.getImageData(0, 0, c.width, c.height).data;
  }

  setScale(scale) {
    this.scale = scale;
    this.sprite.resize(scale);
    // flip and lean both pivot on her feet
    const fx = (SPRITE.pad + SPRITE.feet.x) * scale;
    const fy = (SPRITE.pad + SPRITE.feet.y) * scale;
    this.canvas.style.transformOrigin = `${fx}px ${fy}px`;
    this.place();
  }

  setView(w, h) {
    this.view = { w, h };
    this.pos.x = clamp(this.pos.x, 60, w - 60);
    this.pos.y = clamp(this.pos.y, SPRITE.height * this.scale, h - 4);
    this.place();
  }

  place() {
    const s = this.scale;
    const left = this.pos.x - (SPRITE.pad + SPRITE.feet.x) * s;
    const top = this.pos.y - (SPRITE.pad + SPRITE.feet.y) * s + this.bob;
    this.root.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
    this.canvas.style.transform = `rotate(${this.tilt.toFixed(2)}deg)${this.facing === -1 ? ' scaleX(-1)' : ''}`;
    this.onMove?.(this.head());
  }

  // her face on screen, plus `top`: the tips of her mane
  head(at = this.pos, facing = this.facing) {
    const s = this.scale;
    const bob = at === this.pos ? this.bob : 0;
    return {
      x: at.x + (SPRITE.head.x - SPRITE.feet.x) * s * facing,
      y: at.y - (SPRITE.feet.y - SPRITE.head.y) * s + bob,
      top: at.y - SPRITE.feet.y * s + bob,
    };
  }

  // Is this screen point on her body? Uses the cut-out's alpha so empty space stays click-through.
  hit(x, y) {
    if (this.hidden || this.p.alpha < 0.5) return false;
    const s = this.scale;
    const sx = SPRITE.feet.x + ((x - this.pos.x) / s) * this.facing;
    const sy = SPRITE.feet.y - (this.pos.y + this.bob - y) / s;
    for (const [dx, dy] of [[0, 0], [4, 0], [-4, 0], [0, 4], [0, -4]]) {
      const px = Math.round(sx + dx), py = Math.round(sy + dy);
      if (px < 0 || py < 0 || px >= SPRITE.width || py >= SPRITE.height) continue;
      if (this.alphaMap[(py * SPRITE.width + px) * 4 + 3] > 40) return true;
    }
    return false;
  }

  faceCenter() {
    this.facing = this.pos.x > this.view.w / 2 ? 1 : -1;
  }

  spot(name) {
    const { w, h } = this.view;
    const s = this.scale;
    const side = 150 * s + 30;
    const floor = h - 6;
    switch (name) {
      case 'post':
        return { x: w - side - 30, y: floor };
      case 'stage':
        return { x: w * 0.5 + rand(-w * 0.12, w * 0.12), y: floor };
      default: {
        const y = Math.random() < 0.65 ? floor : rand(SPRITE.height * s + 200, floor);
        let x = rand(side, w - side);
        if (Math.abs(x - this.pos.x) < w * 0.2) x = clamp(w - x, side, w - side);
        return { x, y };
      }
    }
  }

  // ---------- frame loop ----------

  loop(now) {
    requestAnimationFrame(this.loop);
    if (this.hidden) return;
    if (now - this.lastDraw < this.frameMs - 1) return;
    this.drawFrame(now);
    this.behave(now);
  }

  drawFrame(now = performance.now()) {
    this.lastDraw = now;
    this.animate(now);
    this.sprite.draw(this.p);
    this.place();
  }

  animate(now) {
    const t = now / 1000;
    const p = this.p;
    const sleeping = this.mode === 'sleep';
    const calm = sleeping ? 0.3 : 1;
    const odd = Math.floor(t * 12) % 2 === 1; // alternates every drawing
    p.seed = Math.random() * 100;

    // weightless: she's a projection, she never quite touches the ground
    p.hair = (3.4 * Math.sin(t * 1.25) + 1.6 * Math.sin(t * 2.9 + 1)) * calm;
    let bob = Math.sin(t * 1.6) * 5 * calm;
    let tilt = Math.sin(t * 0.7) * 1.2 * calm;
    let head = 0.025 * Math.sin(t * 0.55 + 0.8) * calm;
    let mane = 0;
    if (sleeping) {
      head += 0.1;   // head drops to one side
      mane -= 0.12;  // and the mane settles
    }

    // Head turns are given in screen direction (-1 left, 1 right); the sprite may be mirrored.
    const g = this.gesture;
    if (g && now < g.until) {
      const k = (now - g.start) / (g.until - g.start);
      const lean = g.dir * this.facing;
      switch (g.name) {
        case 'talk': // little nods, the mane breathing with the words
          head += 0.035 * Math.sin(t * 13);
          mane += 0.05 + 0.05 * Math.abs(Math.sin(t * 9));
          break;
        case 'curious': // the cocked head
          head += 0.16 * lean * Math.min(1, k * 6);
          mane += 0.12;
          tilt += 2 * g.dir;
          break;
        case 'laugh': // manic: head shaking on every drawing, mane blown wide
          head += odd ? 0.07 : -0.07;
          mane += 0.55 * (1 - k * 0.6);
          bob -= 10 * Math.abs(Math.sin(t * 7));
          break;
        case 'alarm': // bristling and flickering, leaning toward you
          mane += odd ? 0.32 : 0.12;
          head += 0.1 * lean;
          tilt += 3 * g.dir;
          break;
        case 'flinch': // snapped back by the hit
          head += 0.18 * (1 - k);
          tilt += 3 * this.facing * (1 - k);
          mane -= 0.1;
          bob += 4;
          break;
        case 'gaze': // looking up at the satellite, very still
          head += 0.2 * lean * Math.min(1, k * 4);
          mane += 0.1;
          p.hair *= 0.4;
          tilt += 1.5 * g.dir;
          break;
      }
    } else {
      this.gesture = null;
    }

    p.head = head;
    p.mane = mane;
    this.bob = this.dragging ? 0 : bob;
    this.tilt = this.dragging ? 0 : tilt;
    if (this.debug) Object.assign(p, this.debug); // --dev pose overrides
  }

  behave(now) {
    if (this.busy || this.dragging) return;

    if (now > this.nextTwitch) {
      this.nextTwitch = now + rand(5000, 13000);
      if (!reducedMotion.matches && this.mode !== 'sleep') this.twitch();
    }

    // a shard of her mane breaks off now and then and drifts away
    if (now > this.nextShed) {
      this.nextShed = now + rand(4000, 11000) * (this.mode === 'sleep' ? 2.5 : 1);
      if (!reducedMotion.matches) this.shed();
    }

    if (this.mode === 'idle' && now > this.nextGaze) {
      this.nextGaze = now + rand(90000, 180000);
      this.gaze();
    }

    if (this.mode === 'idle' && now - this.lastActivity > SLEEP_AFTER) this.setMode('sleep');

    if (this.wander && (this.mode === 'idle' || this.mode === 'sleep') && now > this.nextWander) {
      this.nextWander = now + rand(55000, 120000);
      if (this.mode === 'idle') this.teleport(this.spot('random'));
    }

    if (this.mode === 'work' && now - this.lastGlyph > 420) {
      this.lastGlyph = now;
      const h = this.head();
      this.fx.glyph(h.x, h.y - 30);
    }
  }

  // ---------- acting ----------

  setMode(mode) {
    const now = performance.now();
    if (mode !== 'sleep') this.lastActivity = now;
    // after anything happens, stay put a while (so she doesn't wander off right after "done")
    this.nextWander = Math.max(this.nextWander, now + rand(55000, 120000));
    this.nextGaze = Math.max(this.nextGaze, now + rand(30000, 70000));
    if (this.mode === mode) return;
    this.mode = mode;
    const p = this.p;
    if (mode === 'sleep') {
      this.frameMs = ASLEEP;
      tween(p, { alpha: 0.55, sparkle: 0.35, boil: 0.4 }, 900, ease.inOut);
    } else {
      this.frameMs = ON_TWOS;
      tween(p, { alpha: 1, sparkle: 1, boil: 0.9 }, 250, ease.out);
    }
  }

  wake() {
    if (this.mode === 'sleep') this.setMode('idle');
    this.lastActivity = performance.now();
  }

  // dir: screen direction the gesture leans to (-1 left, 1 right), for the head turns
  gestureFor(name, ms, dir = 0) {
    const now = performance.now();
    this.gesture = { name, start: now, until: now + ms, dir };
  }

  // Which way is the middle of the screen from her, -1 or 1.
  towardCenter() {
    return this.pos.x > this.view.w / 2 ? -1 : 1;
  }

  // the reaching side of the cut-out points toward screen x
  faceToward(x) {
    this.facing = x < this.pos.x ? 1 : -1;
  }

  shed() {
    const s = this.scale;
    const h = this.head();
    const a = rand(-Math.PI * 0.95, -Math.PI * 0.05); // somewhere on the upper rim of the mane
    const r = rand(70, 100) * s;
    this.fx.drift(h.x + Math.cos(a) * r, h.y - 40 * s + Math.sin(a) * r * 0.85, a);
  }

  // She looks up at a star (the satellite) above the open side of the screen, and holds it.
  gaze() {
    if (this.busy || this.hidden || this.gesture) return;
    const h = this.head();
    const dir = this.towardCenter();
    const x = clamp(h.x + dir * rand(140, 300), 40, this.view.w - 40);
    const y = rand(40, Math.max(60, Math.min(160, h.top - 120)));
    this.faceToward(x);
    this.fx.star(x, y, { life: 4400 });
    this.voice.play('star');
    this.gestureFor('gaze', 4200, dir);
    this.onGaze?.();
  }

  twitch() {
    const p = this.p;
    p.glitchSeed = Math.random() * 100;
    p.glitch = rand(0.15, 0.3);
    p.split = 2;
    setTimeout(() => {
      p.glitch = 0;
      p.split = 0;
    }, ON_TWOS * 2);
  }

  // a small jolt each time Claude touches something
  pulse() {
    if (this.busy || reducedMotion.matches) return;
    const p = this.p;
    p.glitchSeed = Math.random() * 100;
    p.glitch = 0.12;
    setTimeout(() => { p.glitch = 0; }, ON_TWOS);
  }

  async hurt() {
    this.gestureFor('flinch', 600);
    if (reducedMotion.matches) return;
    const p = this.p;
    p.sil = RED;
    p.silAmount = 1;
    this.drawFrame();
    await sleep(ON_TWOS);
    p.silAmount = 0;
    p.glitchSeed = Math.random() * 100;
    p.glitch = 0.7;
    p.split = 7;
    await tween(p, { glitch: 0, split: 0 }, 450, ease.out);
  }

  // The manic laugh: mane blown wide and shedding shards, flash frames, then a cut-in of her grin.
  async celebrate() {
    const dir = this.towardCenter();
    this.gestureFor('laugh', 1500, dir);
    if (reducedMotion.matches) return;
    const s = this.scale;
    const h = this.head();
    this.fx.burst(h.x, h.y - 40 * s, { count: 30, power: 1.1, spread: 130 * s });
    const p = this.p;
    for (const color of [GREEN, INK, GREEN]) {
      p.sil = color;
      p.silAmount = 1;
      this.drawFrame();
      await sleep(ON_ONES);
    }
    p.silAmount = 0;
    await this.fx.cutin(h.x + dir * (85 * s + 24), h.y - 18, dir);
  }

  // Leave in a column of light, reappear somewhere else.
  async teleport(to, { face = null } = {}) {
    if (this.busy) {
      this.pending = { to, face };
      return;
    }
    this.busy = true;
    this.wake();
    const p = this.p;
    const s = this.scale;
    this.onTeleport?.('start');

    if (reducedMotion.matches) {
      await tween(p, { alpha: 0 }, 160, ease.linear);
      this.pos = { ...to };
      this.facing = face ?? (to.x > this.view.w / 2 ? 1 : -1);
      this.place();
      await tween(p, { alpha: 1 }, 160, ease.linear);
    } else {
      this.frameMs = ON_ONES;
      const from = { ...this.pos };
      const fromHead = this.head();

      this.voice.play('teleport-out');
      p.glitchSeed = Math.random() * 100;
      await tween(p, { glitch: 0.35, split: 3 }, 90, ease.linear);
      this.fx.burst(fromHead.x, fromHead.y + 70 * s, { count: 22, spread: 150 * s });
      this.fx.slices(fromHead.x - 70 * s, fromHead.y - 40 * s, 170 * s, 320 * s);
      await tween(p, { collapse: 1, glitch: 1, dissolve: 0.5, split: 9 }, 170, ease.in);
      p.alpha = 0;
      this.fx.beam(from.x, from.y, { width: 40 * s + 8 });
      await sleep(70);

      const facing = face ?? (to.x > this.view.w / 2 ? 1 : -1);
      const toHead = this.head(to, facing);
      this.fx.streak(fromHead.x, fromHead.y, toHead.x, toHead.y);
      await sleep(60);

      this.pos = { ...to };
      this.facing = facing;
      this.place();
      this.fx.beam(to.x, to.y, { down: true, width: 40 * s + 8 });
      this.voice.play('teleport-in');
      await sleep(50);

      p.alpha = this.mode === 'sleep' ? 0.55 : 1;
      p.glitchSeed = Math.random() * 100;
      await tween(p, { collapse: 0, dissolve: 0, glitch: 0.6, split: 6 }, 200, ease.out);

      // two impact frames, the anime way
      p.sil = GREEN;
      p.silAmount = 1;
      this.drawFrame();
      await sleep(ON_ONES);
      p.sil = INK;
      this.drawFrame();
      await sleep(ON_ONES);
      p.silAmount = 0;
      this.fx.burst(toHead.x, toHead.y + 60 * s, { count: 10, power: 0.55, spread: 110 * s });
      await tween(p, { glitch: 0, split: 0 }, 220, ease.out);
      this.frameMs = this.mode === 'sleep' ? ASLEEP : ON_TWOS;
    }

    this.busy = false;
    this.nextWander = Math.max(this.nextWander, performance.now() + rand(55000, 120000));
    this.onTeleport?.('end');
    if (this.pending) {
      const next = this.pending;
      this.pending = null;
      await this.teleport(next.to, { face: next.face });
    }
  }

  // First appearance: drop in from the top of the screen.
  async materialize(at) {
    const p = this.p;
    this.pos = { ...at };
    this.faceCenter();
    if (reducedMotion.matches) {
      p.alpha = 0;
      this.place();
      await tween(p, { alpha: 1 }, 300, ease.linear);
      return;
    }
    this.busy = true;
    p.alpha = 0;
    p.collapse = 1;
    p.dissolve = 0.5;
    this.place();
    await sleep(250);
    this.fx.beam(at.x, at.y, { down: true, width: 40 * this.scale + 8, life: 260 });
    this.voice.play('teleport-in');
    await sleep(80);
    p.alpha = 1;
    await tween(p, { collapse: 0, dissolve: 0, glitch: 0.5, split: 5 }, 240, ease.out);
    await tween(p, { glitch: 0, split: 0 }, 260, ease.out);
    this.busy = false;
  }

  // Show up next to the mouse pointer (used when Claude needs you).
  async summon(cursor) {
    const { w, h } = this.view;
    const s = this.scale;
    const side = 150 * s + 30;
    const dx = cursor.x > w / 2 ? -260 : 260;
    const to = {
      x: clamp(cursor.x + dx, side, w - side),
      y: clamp(cursor.y + SPRITE.height * s * 0.45, SPRITE.height * s + 120, h - 6),
    };
    if (Math.hypot(to.x - this.pos.x, to.y - this.pos.y) < 160) {
      this.facing = cursor.x < this.pos.x ? 1 : -1;
      return;
    }
    await this.teleport(to, { face: cursor.x < to.x ? 1 : -1 });
  }

  setHidden(hidden) {
    this.hidden = hidden;
    this.root.hidden = hidden;
  }

  // ---------- pointer ----------

  bindPointer() {
    let down = null;
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || !this.hit(e.clientX, e.clientY)) return;
      down = { x: e.clientX, y: e.clientY, pos: { ...this.pos } };
    });
    window.addEventListener('mousemove', (e) => {
      if (down) {
        const dx = e.clientX - down.x, dy = e.clientY - down.y;
        if (!this.dragging && Math.hypot(dx, dy) > 5 && !this.busy) {
          this.dragging = true;
          this.p.glitch = 0.18;
          this.p.split = 2;
          this.onTeleport?.('start');
        }
        if (this.dragging) {
          this.pos = {
            x: clamp(down.pos.x + dx, 40, this.view.w - 40),
            y: clamp(down.pos.y + dy, SPRITE.height * this.scale * 0.5, this.view.h - 4),
          };
          this.p.glitchSeed = Math.random() * 100;
          this.place();
        }
        return;
      }
      this.notice(e.clientX, e.clientY);
    });
    window.addEventListener('mouseup', () => {
      if (!down) return;
      const wasDragging = this.dragging;
      down = null;
      this.dragging = false;
      if (wasDragging) {
        tween(this.p, { glitch: 0, split: 0 }, 200, ease.out);
        const h = this.head();
        this.fx.burst(h.x, h.y + 80 * this.scale, { count: 8, power: 0.5, spread: 80 * this.scale });
        this.faceCenter();
        this.onTeleport?.('end');
      } else {
        this.onClick?.();
      }
    });
  }

  // When the pointer comes close she turns to it, and waves if she's been left alone a while.
  notice(x, y) {
    if (this.busy || this.hidden) return;
    const h = this.head();
    const d = Math.hypot(x - h.x, y - h.y);
    if (d > 230) return;
    const now = performance.now();
    if (this.mode === 'sleep') this.wake();
    if (now < this.nextNotice) return;
    this.nextNotice = now + 15000;
    const facing = x < this.pos.x ? 1 : -1;
    if (facing !== this.facing) {
      this.facing = facing;
      this.twitch();
    }
    // she cocks her head at you
    if (this.mode === 'idle' && !this.gesture) this.gestureFor('curious', 1400, x < h.x ? -1 : 1);
  }
}
