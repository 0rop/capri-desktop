// Pose-to-pose acting, timed the way cel animation is: an act is an exposure sheet,
// a list of drawings, each held for a number of frames. Nothing is tweened. A move is
// a couple of key drawings, sometimes an anticipation or a smear frame, and holds.
//
// Pose fields (anything left out falls back to the stance underneath):
//   head    head tilt, radians, sprite space       mane   mane flare, + bristles, - settles
//   hair    mane sway, px                          tilt   whole-body lean, degrees, screen
//   bob     vertical offset, px, - is up           sx/sy  squash & stretch (sx < 0 mirrors her)
//   smear   [x, y] trail of head multiples, px     echo   [x, y] green/red afterimages, px
//   kickL / kickR   lower legs swinging outward, radians (when sitting)
//
// Directional acts are drawn leaning to screen-right; play them with dir -1 to mirror.

export const SHEET_FPS = 12;

const rep = (n, keys) => Array.from({ length: n }, () => keys).flat();

export const NEUTRAL = {
  head: 0, mane: 0, hair: 0, tilt: 0, bob: 0, sx: 1, sy: 1, smear: [0, 0], echo: [0, 0], kickL: 0, kickR: 0,
};

export const ACTS = {
  // ---- stances (looping) ----

  // floating: four drawings, a slow up-and-down with the mane swinging the other way
  stand: {
    loop: true,
    keys: [[6, { bob: 0, hair: -2.5 }], [4, { bob: -2, hair: 0 }], [6, { bob: -4, hair: 2.5 }], [4, { bob: -2, hair: 0 }]],
  },

  // perched on a window, legs dangling, kicking one after the other
  sit: {
    loop: true,
    keys: [
      [5, { kickL: 0.24, kickR: -0.03, hair: -1.5 }],
      [2, { kickL: 0.08, kickR: 0.08 }],
      [5, { kickL: -0.03, kickR: 0.24, hair: 1.5 }],
      [2, { kickL: 0.08, kickR: 0.08 }],
      [5, { kickL: 0.24, kickR: -0.03, hair: -1.5 }],
      [2, { kickL: 0.08, kickR: 0.08 }],
      [5, { kickL: -0.03, kickR: 0.24, hair: 1.5 }],
      [10, { kickL: 0.04, kickR: 0.04, head: 0.08 }], // a pause, head cocked
    ],
  },

  // leaning in from the edge of the screen, toward the middle
  peek: {
    loop: true,
    directional: true,
    keys: [
      [18, { tilt: 7, head: 0.14 }],
      [1, { tilt: 7, head: 0.2, smear: [-6, 0] }],
      [14, { tilt: 7.5, head: 0.24, mane: 0.08 }],
      [1, { tilt: 6, head: 0.14 }],
      [12, { tilt: 6.5, head: 0.12, bob: -2 }],
    ],
  },

  // asleep: head dropped, and every so often it falls a bit further and catches itself
  sleep: {
    loop: true,
    keys: [
      [18, { head: 0.1, mane: -0.12, bob: 2 }],
      [1, { head: 0.16, mane: -0.13, bob: 4 }],
      [10, { head: 0.21, mane: -0.15, bob: 5 }],
      [1, { head: 0.06, mane: -0.08, bob: 0, smear: [0, 8] }], // jolt awake
      [4, { head: 0.08, mane: -0.1, bob: 1 }],
    ],
  },

  // ---- one-shot acts ----

  // little nods while the words come out, two drawings on threes
  talk: { priority: 0, keys: rep(2, [[3, { head: 0.04, mane: 0.08 }], [3, { head: 0, mane: 0.03 }]]) },

  // the cocked head: anticipation the other way, a smear, then a long hold
  curious: {
    priority: 1,
    directional: true,
    keys: [
      [1, { head: -0.05, mane: 0.04 }],
      [1, { head: 0.12, mane: 0.15, tilt: 1, smear: [-12, 4] }],
      [10, { head: 0.19, mane: 0.14, tilt: 2 }],
      [6, { head: 0.16, mane: 0.1, tilt: 1.6 }],
      [1, { head: 0.07, tilt: 0.6 }],
    ],
  },

  // head snapping from one side to the other, held each time
  look: {
    priority: 1,
    keys: [
      [1, { head: 0.08, smear: [-8, 0] }],
      [8, { head: 0.16 }],
      [1, { head: 0 }],
      [1, { head: -0.08, smear: [8, 0] }],
      [8, { head: -0.16 }],
      [1, { head: -0.05 }],
      [3, { head: 0 }],
    ],
  },

  // looking up at the satellite: a dip, a smear up, and a long still hold; a start when it flares
  gaze: {
    priority: 1,
    directional: true,
    keys: [
      [1, { head: -0.04, bob: 2 }],
      [1, { head: 0.12, mane: 0.12, smear: [-6, 6] }],
      [30, { head: 0.21, mane: 0.1, hair: 0, tilt: 1.5 }],
      [2, { head: 0.24, mane: 0.24, tilt: 1.5 }],
      [14, { head: 0.21, mane: 0.1, hair: 0, tilt: 1.5 }],
      [1, { head: 0.1 }],
    ],
  },

  // manic laugh: the split into her other minds, then two drawings alternating on ones
  laugh: {
    priority: 2,
    keys: [
      [1, { echo: [10, 0], mane: 0.3 }],
      [1, { echo: [20, -2], mane: 0.45, sy: 1.05 }],
      ...rep(8, [[1, { head: -0.07, mane: 0.55, bob: -6, sy: 1.06 }], [1, { head: 0.07, mane: 0.62, bob: -10, sy: 1.08 }]]),
      [2, { head: 0.04, mane: 0.4, bob: -4 }],
      [2, { mane: 0.2 }],
    ],
  },

  // bristling, flickering, leaning toward you
  alarm: {
    priority: 2,
    directional: true,
    keys: rep(15, [[1, { mane: 0.34, head: 0.1, tilt: 3 }], [1, { mane: 0.12, head: 0.1, tilt: 3 }]]),
  },

  // knocked back by a failure
  flinch: {
    priority: 2,
    keys: [
      [2, { head: 0.22, tilt: 4, sx: 0.92, sy: 1.06, mane: -0.12, bob: 5, smear: [-10, 0] }],
      [5, { head: 0.18, tilt: 3.4, mane: -0.1, bob: 4 }],
      [1, { head: 0.09, tilt: 1.5, bob: 2 }],
    ],
  },

  // turnaround: the flat cut-out squashes to a sliver and comes back mirrored
  turn: {
    priority: 3,
    fps: 24,
    flip: true,
    keys: [
      [1, { sx: 0.7, sy: 1.02, echo: [6, 0] }],
      [1, { sx: 0.25, sy: 1.04, echo: [10, 0], mane: 0.2 }],
      [1, { sx: -0.25, sy: 1.04, echo: [10, 0], mane: 0.2 }],
      [1, { sx: -0.7, sy: 1.02 }],
      [2, { sx: -1 }],
    ],
  },

  // a full spin on ones, afterimages flying
  spin: {
    priority: 3,
    fps: 24,
    keys: [
      [2, { sy: 0.92, sx: 1.05, bob: 3 }], // wind-up
      [1, { sx: 0.7, echo: [8, 0], mane: 0.25 }],
      [1, { sx: 0.2, echo: [14, 0], mane: 0.35, bob: -4 }],
      [1, { sx: -0.3, echo: [14, 0], mane: 0.35, bob: -6 }],
      [1, { sx: -0.75, echo: [10, 0], mane: 0.3, bob: -6 }],
      [1, { sx: -1, echo: [6, 0], bob: -6 }],
      [1, { sx: -0.75, echo: [10, 0], mane: 0.3, bob: -5 }],
      [1, { sx: -0.3, echo: [14, 0], mane: 0.35, bob: -4 }],
      [1, { sx: 0.2, echo: [14, 0], mane: 0.35, bob: -2 }],
      [1, { sx: 0.7, echo: [8, 0], mane: 0.25 }],
      [2, { sx: 1.06, sy: 0.95, mane: 0.15 }], // overshoot
      [1, { sx: 1 }],
    ],
  },

  // a hop in place: crouch, stretch, hang at the top, squash on landing
  hop: {
    priority: 3,
    fps: 24,
    keys: [
      [3, { sy: 0.86, sx: 1.08, bob: 6, mane: -0.08 }],
      [1, { sy: 1.18, sx: 0.9, bob: -10, smear: [0, 16] }],
      [2, { sy: 1.08, sx: 0.95, bob: -32, mane: 0.15 }],
      [4, { bob: -42, mane: 0.3 }],
      [2, { sy: 1.06, bob: -26, mane: 0.2 }],
      [1, { sy: 1.12, sx: 0.92, bob: -8, smear: [0, -14] }],
      [2, { sy: 0.82, sx: 1.12, bob: 5, mane: -0.1 }],
      [2, { sy: 0.94, sx: 1.04, bob: 2 }],
      [1, {}],
    ],
  },

  // landing after a fall
  land: {
    priority: 3,
    fps: 24,
    keys: [
      [2, { sy: 0.72, sx: 1.22, bob: 6, mane: -0.22 }],
      [2, { sy: 0.88, sx: 1.08, bob: 3, mane: -0.1 }],
      [2, { sy: 1.05, sx: 0.97, mane: 0.1 }],
      [1, {}],
    ],
  },

  // plopping down on a window ledge
  plop: {
    priority: 3,
    fps: 24,
    keys: [
      [2, { sy: 0.85, sx: 1.1, mane: -0.12, kickL: 0.3, kickR: 0.3 }],
      [2, { sy: 1.05, sx: 0.97, kickL: 0.12, kickR: 0.12 }],
      [1, {}],
    ],
  },

  // while falling: stretched, mane blown up, fluttering every other frame
  fall: {
    loop: true,
    fps: 24,
    keys: [[2, { sy: 1.12, sx: 0.92, mane: 0.36, head: 0.05, smear: [0, -16] }], [2, { sy: 1.1, sx: 0.93, mane: 0.26, head: -0.04, smear: [0, -12] }]],
  },
};

export class Player {
  constructor(name, { dir = 0, at = performance.now() } = {}) {
    this.name = name;
    this.act = ACTS[name];
    this.dir = dir;
    this.start = at;
    this.total = this.act.keys.reduce((n, [hold]) => n + hold, 0);
  }

  get priority() {
    return this.act.priority ?? 0;
  }

  // The drawing on screen at `now`, or null once a one-shot act is over.
  sample(now) {
    const fps = this.act.fps || SHEET_FPS;
    let f = Math.floor((now - this.start) / (1000 / fps));
    if (f >= this.total) {
      if (!this.act.loop) return null;
      f %= this.total;
    }
    for (const [hold, pose] of this.act.keys) {
      if (f < hold) return pose;
      f -= hold;
    }
    return null;
  }

  // Mirror a directional drawing toward the act's direction. `facing` maps screen to sprite space.
  aim(pose, facing) {
    if (!this.act.directional || !this.dir) return pose;
    const lean = this.dir * facing;
    const out = { ...pose };
    if (pose.head !== undefined) out.head = pose.head * lean;
    if (pose.tilt !== undefined) out.tilt = pose.tilt * this.dir;
    if (pose.smear) out.smear = [pose.smear[0] * lean, pose.smear[1]];
    if (pose.echo) out.echo = [pose.echo[0] * lean, pose.echo[1]];
    return out;
  }
}
