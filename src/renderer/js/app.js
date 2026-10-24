import { Capri } from './capri.js';
import { FxLayer } from './fx.js';
import { Panel } from './panel.js';
import { Voice } from './voice.js';
import { Brain } from './brain.js';
import { LINES } from './lines.js';
import { pick, fmt } from './util.js';

const host = window.host;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function boot() {
  const [config, image, face] = await Promise.all([
    host.getConfig(),
    loadImage('../../assets/capri/capri-full.png'),
    loadImage('../../assets/capri/capri-face.png'),
    document.fonts.load('600 16px "Chakra Petch"'),
    document.fonts.load('400 11px "JetBrains Mono"'),
  ]);
  document.documentElement.lang = config.lang;

  const fx = new FxLayer(document.getElementById('fx'), { face });
  fx.resize(innerWidth, innerHeight);

  const voice = new Voice();
  voice.configure(config);
  host.listSounds().then((list) => list.length && voice.loadCustom(list));

  const panel = new Panel({
    panel: document.getElementById('panel'),
    ticker: document.getElementById('ticker'),
    labels: LINES[config.lang] || LINES.fr,
  });

  const capri = new Capri({
    root: document.getElementById('capri'),
    canvas: document.getElementById('sprite'),
    image,
    fx,
    voice,
  });
  capri.wander = config.wander;
  capri.setScale(config.scale);

  const brain = new Brain({ capri, panel, voice, host, lang: config.lang });

  // Click-through everywhere except on her body and the panel.
  let interactive = false;
  let mouse = null;
  const setInteractive = (on) => {
    if (on === interactive) return;
    interactive = on;
    host.setInteractive(on);
  };
  const refreshHit = () => {
    if (capri.dragging) return setInteractive(true);
    if (!mouse) return setInteractive(false);
    const r = panel.rect();
    const onPanel = r && mouse.x >= r.left && mouse.x <= r.right && mouse.y >= r.top && mouse.y <= r.bottom;
    return setInteractive(Boolean(onPanel || capri.hit(mouse.x, mouse.y)));
  };
  window.addEventListener('mousemove', (e) => {
    mouse = { x: e.clientX, y: e.clientY };
    refreshHit();
  });
  document.addEventListener('mouseleave', () => {
    mouse = null;
    refreshHit();
  });

  // wiring
  capri.onMove = (head) => {
    panel.setAnchor(head, capri.view);
    // she may have moved out from under a still pointer: never leave a dead click zone behind
    refreshHit();
  };
  capri.onTeleport = (phase) => (phase === 'start' ? panel.suspend() : panel.resume());
  // now and then she says something while staring at the satellite
  capri.onGaze = () => {
    if (!panel.visible && Math.random() < 0.4) panel.say({ kind: 'info', line: pick(brain.t.gaze), hold: 3800 });
  };
  capri.onClick = () => {
    if (panel.visible) panel.hide();
    else brain.status();
  };
  panel.onChar = (kind) => voice.play('blip', { mood: kind });
  panel.onTalk = (talking) => talking && capri.perform('talk');

  host.onClaudeEvent((evt) => brain.handle(evt));
  host.onWindows((data) => capri.setWindows(data));

  host.onResize(({ width, height }) => {
    fx.resize(width, height);
    capri.setView(width, height);
  });
  window.addEventListener('resize', () => {
    fx.resize(innerWidth, innerHeight);
    capri.setView(innerWidth, innerHeight);
  });

  host.onConfig((cfg) => {
    voice.configure(cfg);
    capri.wander = cfg.wander;
    if (cfg.scale !== capri.scale) capri.setScale(cfg.scale);
    if (cfg.lang !== brain.lang) {
      brain.lang = cfg.lang;
      panel.labels = LINES[cfg.lang] || LINES.fr;
      document.documentElement.lang = cfg.lang;
    }
  });

  host.onCommand(async (cmd) => {
    const t = brain.t;
    switch (cmd.name) {
      case 'teleport':
        capri.teleport(capri.spot('random'));
        break;
      case 'status':
        brain.status();
        break;
      case 'hooks':
        if (cmd.ok) panel.say({ kind: 'info', line: cmd.action === 'install' ? t.hooksOk : t.hooksRemoved, hold: 6000 });
        else panel.say({ kind: 'error', line: fmt(t.hooksFail, { error: cmd.error }), hold: 9000 });
        break;
      // --dev helpers
      case 'pose':
        capri.debug = cmd.params || null;
        if (cmd.hush) {
          panel.setTicker(null);
          panel.hide();
        }
        if (cmd.scale) capri.setScale(cmd.scale);
        if (cmd.stance) capri.setStance(cmd.stance, cmd);
        if (cmd.at) capri.pos = cmd.at;
        if (cmd.facing) capri.facing = cmd.facing;
        capri.drawFrame();
        break;
      case 'freeze':
        capri.hidden = Boolean(cmd.on);
        break;
      case 'act':
        // behaviours by method name (gaze, celebrate, hurt, shed, peek, fall, wanderStep...) or acts by name
        if (cmd.act === 'sit') {
          const seat = capri.pickSeat();
          if (seat) capri.sitOn(seat);
        } else if (typeof capri[cmd.act] === 'function') capri[cmd.act](...(cmd.args || []));
        else capri.perform(cmd.act, cmd.dir || 0);
        break;
      default:
        break;
    }
  });

  // entrance
  await capri.materialize(capri.spot('post'));
  const hooks = await host.hooksStatus();
  if (!hooks.installed) {
    panel.say({ kind: 'info', line: t0(config.lang).noHooks, hold: 9000 });
  } else {
    panel.say({ kind: 'info', line: pick(t0(config.lang).online), hold: 4000 });
  }
}

// boot-time lines that only make sense here
function t0(lang) {
  return lang === 'en'
    ? {
      online: ['Capri online.', 'Back on your desktop, choom.'],
      noHooks: 'I can’t see Claude yet. Tray icon › “Install Claude Code hooks”.',
    }
    : {
      online: ['Capri en ligne.', 'De retour sur ton bureau, choom.'],
      noHooks: 'Je ne vois pas encore Claude. Clique sur mon icône près de l’horloge, puis « Installer les hooks ».',
    };
}

boot().catch((err) => {
  console.error('[capri] boot failed', err);
});
