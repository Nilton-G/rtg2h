// ============================================================
// MOTOR DO JOGO — Canvas 2D, sem dependências
// ============================================================
import { CONFIG, SKIN_MAP, SECTORS } from './data.js';

const VW = 420;                        // largura lógica fixa
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const sectorFor = (wave) => SECTORS[Math.floor((wave - 1) / 5) % SECTORS.length];
export const waveNeed = (wave) =>
  Math.min(CONFIG.waveKillsCap, Math.round(CONFIG.waveKillsBase + (wave - 1) * CONFIG.waveKillsGrow));

// ---------------- TIPOS DE INIMIGO ----------------
const TYPES = {
  drone:    { r: 13, hp: 2,  speed: 78,  value: 1,  dmg: 1, score: 10, color: '#ff6b86', shape: 'diamond' },
  zig:      { r: 14, hp: 3,  speed: 88,  value: 2,  dmg: 1, score: 16, color: '#ffb648', shape: 'tri' },
  shooter:  { r: 16, hp: 6,  speed: 60,  value: 3,  dmg: 1, score: 26, color: '#b06bff', shape: 'hex', shoot: 1.7 },
  tank:     { r: 22, hp: 16, speed: 40,  value: 6,  dmg: 2, score: 55, color: '#4aa3ff', shape: 'tank' },
  splitter: { r: 18, hp: 9,  speed: 64,  value: 4,  dmg: 1, score: 34, color: '#3ff0a0', shape: 'circle' },
  boss:     { r: 52, hp: 200, speed: 26, value: 60, dmg: 2, score: 400, color: '#ffd24d', shape: 'boss' },
};

const POWER_LABEL = { rapid: 'R', triple: 'T', magnet: 'M', x2: '×2', shield: 'S', nova: 'N' };
const POWER_COLOR = {
  rapid: '#ffb648', triple: '#b06bff', magnet: '#3ff0a0',
  x2: '#ffd24d', shield: '#37d0ff', nova: '#ff4d9d',
};

export class Game {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.save = opts.save;
    this.audio = opts.audio;
    this.onHud = opts.onHud || (() => {});
    this.onWave = opts.onWave || (() => {});
    this.onGameOver = opts.onGameOver || (() => {});
    this.onToast = opts.onToast || (() => {});

    this.skin = this.save.equippedSkin();
    const perks = this.save.perks();
    const up = this.save.upgradeLevels();
    const crit = up.crit * 0.015 + (perks.crit || 0);

    this.stats = {
      dmgMul: (1 + up.dmg * 0.08) * (1 + (perks.dmg || 0)),
      fireRate: CONFIG.fireInterval * Math.max(0.42, 1 - up.rate * 0.02) * (1 - (perks.rate || 0)),
      maxShields: CONFIG.playerShields + up.hull + (perks.shield || 0),
      speed: CONFIG.playerSpeed * (1 + up.speed * 0.02 + (perks.speed || 0)),
      magnet: CONFIG.magnetBase * (1 + up.magnet * 0.1) * (1 + (perks.magnet || 0)),
      crit,
      nova: CONFIG.startNova + Math.floor(up.nova / 2),
      creditsMul: (1 + up.greed * 0.04 + up.magnet * 0.02) * (1 + (perks.credits || 0)),
    };

    this.raf = null;
    this.running = false;
    this.paused = false;
    this.dead = false;
    this.reported = false;
    this.hudT = 0;
    this.shake = 0;
    this.drag = null;
    this.keys = {};
    this.lastX = 0;
    this.tilt = 0;

    this.resize = this.resize.bind(this);
    this.loop = this.loop.bind(this);
    this._onDown = this._onDown.bind(this);
    this._onMove = this._onMove.bind(this);
    this._onUp = this._onUp.bind(this);
    this._onKey = this._onKey.bind(this);
    this._onVis = () => {
      if (document.hidden) return;
      this.resize();
      this.lastTime = performance.now();
    };

    window.addEventListener('resize', this.resize);
    window.addEventListener('orientationchange', this.resize);
    document.addEventListener('visibilitychange', this._onVis);
    this.canvas.addEventListener('pointerdown', this._onDown, { passive: false });
    this.canvas.addEventListener('pointermove', this._onMove, { passive: false });
    this.canvas.addEventListener('pointerup', this._onUp);
    this.canvas.addEventListener('pointercancel', this._onUp);
    window.addEventListener('keydown', this._onKey);
    window.addEventListener('keyup', this._onKey);

    this.resize();
    this.resetRun();
  }

  // ---------------- CICLO DE VIDA ----------------
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    this.dpr = dpr;
    this.pixelScale = (w / VW) * dpr;
    this.H = h / (w / VW);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.buildBackground();
    if (this.player) {
      this.player.y = clamp(this.player.y, 60, this.H - 40);
      this.player.ty = clamp(this.player.ty, 60, this.H - 40);
    }
  }

  buildBackground() {
    const c = document.createElement('canvas');
    c.width = Math.round(VW);
    c.height = Math.round(this.H);
    const g = c.getContext('2d');
    g.fillStyle = '#05030f';
    g.fillRect(0, 0, c.width, c.height);

    const blobs = [
      { x: 0.15, y: 0.08, r: 0.85, c: 'rgba(96, 40, 220, 0.55)' },
      { x: 0.92, y: 0.3, r: 0.7, c: 'rgba(0, 120, 210, 0.4)' },
      { x: 0.4, y: 0.95, r: 0.9, c: 'rgba(200, 40, 150, 0.28)' },
      { x: 0.05, y: 0.62, r: 0.55, c: 'rgba(40, 200, 200, 0.16)' },
    ];
    for (const b of blobs) {
      const rg = g.createRadialGradient(b.x * c.width, b.y * c.height, 0, b.x * c.width, b.y * c.height, b.r * c.height);
      rg.addColorStop(0, b.c);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg;
      g.fillRect(0, 0, c.width, c.height);
    }

    // poeira estelar estática
    for (let i = 0; i < 70; i++) {
      g.fillStyle = `rgba(255,255,255,${rand(0.05, 0.35).toFixed(2)})`;
      const s = rand(0.6, 1.7);
      g.fillRect(rand(0, c.width), rand(0, c.height), s, s);
    }
    this.bg = c;

    // vinheta
    const v = g.createRadialGradient(c.width / 2, c.height / 2, c.height * 0.25, c.width / 2, c.height / 2, c.height * 0.78);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.55)');
    this.vignette = v;
  }

  resetRun() {
    this.skin = this.save.equippedSkin();
    this.t = 0;
    this.wave = 1;
    this.score = 0;
    this.credits = 0;
    this.crystals = 0;
    this.kills = 0;
    this.bossKills = 0;
    this.combo = 0;
    this.comboT = 0;
    this.bestCombo = 0;
    this.waveKills = 0;
    this.waveNeed = waveNeed(1);
    this.shields = this.stats.maxShields;
    this.maxShields = this.stats.maxShields;
    this.nova = this.stats.nova;
    this.invuln = 2.6;
    this.fireT = 0;
    this.powers = { rapid: 0, triple: 0, magnet: 0, x2: 0 };
    const py = Math.max(150, this.H - 130);
    this.player = { x: VW / 2, y: py, tx: VW / 2, ty: py, r: 15, hitFlash: 0 };
    this.bullets = [];
    this.ebullets = [];
    this.enemies = [];
    this.pickups = [];
    this.particles = [];
    this.texts = [];
    this.spawnT = 1.1;
    this.boss = null;
    this.bossScheduled = false;
    this.dead = false;
    this.reported = false;
    this.deathT = 0;
    this.revives = 0;
    this.lastX = this.player.x;
    this.shake = 0;
    this.tilt = 0;
    this.makeStars();
    this.pushHud(true);
  }

  makeStars() {
    this.stars = [];
    const layers = [
      { n: 46, sp: 22, size: 0.9, alpha: 0.45 },
      { n: 30, sp: 48, size: 1.3, alpha: 0.65 },
      { n: 16, sp: 88, size: 1.9, alpha: 0.9 },
    ];
    for (const L of layers) {
      for (let i = 0; i < L.n; i++) {
        this.stars.push({ x: rand(0, VW), y: rand(0, this.H), sp: L.sp * rand(0.8, 1.2), size: L.size, a: L.alpha });
      }
    }
  }

  start() {
    if (this.running) return;
    this.resize();
    this.resetRun();
    this.running = true;
    this.paused = false;
    this.lastTime = performance.now();
    this.audio.unlock();
    this.raf = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  pause() { this.paused = true; }
  resume() { this.paused = false; this.lastTime = performance.now(); }

  revive() {
    this.dead = false;
    this.reported = false;
    this.deathT = 0;
    this.shields = this.maxShields;
    this.invuln = 3.2;
    this.ebullets = [];
    this.powers = { rapid: 6, triple: 6, magnet: 6, x2: 6 };
    this.revives++;
    this.player.x = VW / 2;
    this.player.tx = VW / 2;
    this.player.y = Math.max(150, this.H - 140);
    this.player.ty = this.player.y;
    this.pushHud(true);
  }

  result() {
    return {
      wave: this.wave,
      sector: sectorFor(this.wave),
      score: Math.floor(this.score),
      credits: Math.floor(this.credits),
      crystals: this.crystals,
      kills: this.kills,
      bosses: this.bossKills,
      bestCombo: this.bestCombo,
      time: this.t,
      revives: this.revives,
    };
  }

  // ---------------- INPUT ----------------
  toLocal(e) {
    const rect = this.canvas.getBoundingClientRect();
    const s = rect.width / VW;
    return { x: (e.clientX - rect.left) / s, y: (e.clientY - rect.top) / s };
  }

  _onDown(e) {
    e.preventDefault();
    this.audio.unlock();
    if (this.paused || this.dead || !this.running) return;
    const p = this.toLocal(e);
    this.drag = { px: p.x, py: p.y, sx: this.player.x, sy: this.player.y };
    if (this.canvas.setPointerCapture) {
      try { this.canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }
  }

  _onMove(e) {
    if (!this.drag || this.paused || this.dead) return;
    e.preventDefault();
    const p = this.toLocal(e);
    this.player.tx = clamp(this.drag.sx + (p.x - this.drag.px), 22, VW - 22);
    this.player.ty = clamp(this.drag.sy + (p.y - this.drag.py), 70, this.H - 32);
  }

  _onUp() { this.drag = null; }

  _onKey(e) {
    const down = e.type === 'keydown';
    const k = e.key.toLowerCase();
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's'].includes(k)) {
      this.keys[k] = down;
      if (down) e.preventDefault();
    }
    if (down && k === ' ') this.useNova();
  }

  // ---------------- UPDATE ----------------
  loop(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.lastTime) / 1000 || 0.016);
    this.lastTime = now;
    if (!this.paused) this.update(dt);
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  }

  update(dt) {
    this.t += dt;
    this.shake = Math.max(0, this.shake - dt * 60);
    if (this.player.hitFlash > 0) this.player.hitFlash -= dt;

    for (const s of this.stars) {
      s.y += s.sp * dt * (this.dead ? 0.25 : 1);
      if (s.y > this.H + 4) { s.y = -4; s.x = rand(0, VW); }
    }

    if (this.dead) {
      this.deathT += dt;
      this.updateParticles(dt);
      if (this.deathT > 0.9 && !this.reported) {
        this.reported = true;
        this.onGameOver(this.result());
      }
      return;
    }

    this.updatePlayer(dt);
    this.updateSpawning(dt);
    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.updatePickups(dt);
    this.updateParticles(dt);

    if (this.combo > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) { this.combo = 0; this.comboT = 0; }
    }

    this.hudT -= dt;
    if (this.hudT <= 0) { this.hudT = 0.08; this.pushHud(); }
  }

  updatePlayer(dt) {
    const p = this.player;
    // teclado (desktop)
    let kx = 0, ky = 0;
    if (this.keys.arrowleft || this.keys.a) kx -= 1;
    if (this.keys.arrowright || this.keys.d) kx += 1;
    if (this.keys.arrowup || this.keys.w) ky -= 1;
    if (this.keys.arrowdown || this.keys.s) ky += 1;
    if (kx || ky) {
      const len = Math.hypot(kx, ky) || 1;
      p.tx = clamp(p.tx + (kx / len) * this.stats.speed * dt, 22, VW - 22);
      p.ty = clamp(p.ty + (ky / len) * this.stats.speed * dt, 70, this.H - 32);
    }

    const dx = p.tx - p.x;
    const dy = p.ty - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.4) {
      const step = Math.min(dist, this.stats.speed * dt * 1.4);
      p.x += (dx / dist) * step;
      p.y += (dy / dist) * step;
    }
    this.tilt += ((p.x - this.lastX) * 0.02 - this.tilt) * Math.min(1, dt * 10);
    this.tilt = clamp(this.tilt, -0.35, 0.35);
    this.lastX = p.x;

    // tiro automático
    this.fireT -= dt;
    if (this.fireT <= 0) {
      this.shoot();
      const rapid = this.powers.rapid > 0 ? 0.55 : 1;
      this.fireT = this.stats.fireRate * rapid;
    }

    for (const k of Object.keys(this.powers)) {
      if (this.powers[k] > 0) {
        this.powers[k] = Math.max(0, this.powers[k] - dt);
      }
    }

    if (this.invuln > 0) this.invuln -= dt;
  }

  shoot() {
    const p = this.player;
    const dmg = this.stats.dmgMul * (1 + (this.wave - 1) * 0.04) * (this.powers.x2 > 0 ? 1 : 1);
    const spread = this.powers.triple > 0;
    const angles = spread ? [-0.17, 0, 0.17] : [0];
    for (const a of angles) {
      const crit = Math.random() < this.stats.crit;
      this.bullets.push({
        x: p.x + Math.sin(a) * 6,
        y: p.y - 16,
        vx: Math.sin(a) * 600,
        vy: -Math.cos(a) * CONFIG.bulletSpeed,
        dmg: crit ? dmg * CONFIG.critMult : dmg,
        crit,
        r: crit ? 4 : 3.2,
      });
    }
    this.audio.shoot();
    for (let i = 0; i < 2; i++) {
      this.particles.push({
        x: p.x + rand(-3, 3), y: p.y - 16, vx: rand(-30, 30), vy: rand(-120, -60),
        life: 0.16, max: 0.16, size: rand(1.5, 3), color: this.skin.trail,
      });
    }
  }

  // ---------------- SPAWN ----------------
  startWaveEnemies() {
    this.spawnT = Math.min(this.spawnT, 0.6);
  }

  updateSpawning(dt) {
    // chefe a cada 5 ondas
    if (this.wave % CONFIG.bossEvery === 0 && !this.bossScheduled && !this.boss) {
      this.bossScheduled = true;
      this.spawnBoss();
      return;
    }
    if (this.boss) {
      if (this.enemies.length < 4) {
        this.spawnT -= dt;
        if (this.spawnT <= 0) {
          this.spawnEnemy(pick(['drone', 'zig']));
          this.spawnT = rand(2.2, 3.4);
        }
      }
      return;
    }

    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      const base = Math.max(0.34, 1.15 - this.wave * 0.028);
      this.spawnT = base * rand(0.72, 1.28);
      this.spawnEnemy(this.rollType());
    }
  }

  rollType() {
    const w = this.wave;
    const table = [
      ['drone', 100],
      ['zig', w >= 2 ? 62 : 0],
      ['shooter', w >= 3 ? 48 : 0],
      ['tank', w >= 4 ? 24 : 0],
      ['splitter', w >= 6 ? 22 : 0],
    ];
    const total = table.reduce((a, [, v]) => a + v, 0);
    let roll = Math.random() * total;
    for (const [t, v] of table) {
      if (roll < v) return t;
      roll -= v;
    }
    return 'drone';
  }

  spawnEnemy(type, x = rand(38, VW - 38), y = -46) {
    const def = TYPES[type] || TYPES.drone;
    const hpMul = 1 + (this.wave - 1) * 0.2;
    const speedMul = Math.min(1.7, 1 + (this.wave - 1) * 0.018);
    const e = {
      type,
      def,
      x,
      y,
      r: def.r,
      hp: def.hp * hpMul,
      maxHp: def.hp * hpMul,
      speed: def.speed * speedMul,
      vx: 0,
      vy: def.speed * speedMul,
      t: rand(0, 10),
      hitT: 0,
      fireT: rand(1, 2),
      stopY: rand(80, this.H * 0.45),
      dir: Math.random() < 0.5 ? -1 : 1,
      baseX: x,
    };
    this.enemies.push(e);
    return e;
  }

  spawnBoss() {
    const num = this.wave / CONFIG.bossEvery;
    const hp = 60 + 13 * Math.pow(this.wave, 1.18) * (1 + (num - 1) * 0.06);
    const speedMul = Math.min(1.8, 1 + (this.wave - 1) * 0.015);
    const names = ['NAVE-MÃE', 'DESTRUIDOR', 'TITÃ DE FERRO', 'DEVASTADOR', 'ENTIDADE DO VAZIO'];
    this.boss = {
      type: 'boss',
      def: TYPES.boss,
      x: VW / 2,
      y: -70,
      r: 52,
      hp,
      maxHp: hp,
      max: hp,
      speed: 26 * speedMul,
      vx: 0,
      vy: 0,
      t: 0,
      hitT: 0,
      attackT: 1.6,
      pattern: 0,
      isBoss: true,
      name: `${names[Math.min(names.length - 1, Math.floor(this.wave / CONFIG.bossEvery) - 1)]} · SETOR ${Math.floor((this.wave - 1) / 5) + 1}`,
      color: '#ffd24d',
    };
    this.enemies.push(this.boss);
    this.audio.boss();
    this.onToast('⚠ CHEFE APROXIMANDO', 'bad');
    this.shake = 10;
  }

  // ---------------- INIMIGOS ----------------
  updateEnemies(dt) {
    const p = this.player;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.t += dt;
      if (e.hitT > 0) e.hitT -= dt;

      if (e.isBoss) {
        this.updateBoss(e, dt);
      } else if (e.type === 'zig') {
        e.y += e.speed * dt;
        e.x = e.baseX + Math.sin(e.t * 2.6) * 52;
      } else if (e.type === 'shooter') {
        if (e.y < e.stopY) e.y += e.speed * dt;
        else {
          e.x += Math.cos(e.t * 0.9) * 42 * dt;
          e.fireT -= dt;
          if (e.fireT <= 0) {
            e.fireT = Math.max(0.9, 1.9 - this.wave * 0.02);
            const a = Math.atan2(p.y - e.y, p.x - e.x);
            this.spawnEBullet(e.x, e.y, Math.cos(a) * 190, Math.sin(a) * 190, 6);
          }
        }
        e.x = clamp(e.x, 24, VW - 24);
      } else if (e.type === 'tank') {
        e.y += e.speed * dt;
        e.fireT -= dt;
        if (e.fireT <= 0 && e.y < this.H * 0.6) {
          e.fireT = 2.3;
          const a = Math.atan2(p.y - e.y, p.x - e.x);
          [-0.26, 0, 0.26].forEach((o) =>
            this.spawnEBullet(e.x, e.y, Math.cos(a + o) * 175, Math.sin(a + o) * 175, 7));
        }
      } else if (e.type === 'splitter') {
        e.y += e.speed * dt;
        e.x = e.baseX + Math.sin(e.t * 1.7) * 24;
      } else {
        e.y += e.speed * dt;
        e.x += Math.sin(e.t * 1.3) * 14 * dt;
      }

      // saiu da tela
      if (e.y > this.H + 70 && !e.isBoss) {
        this.enemies.splice(i, 1);
        continue;
      }

      // colisão com o jogador
      if (!this.dead && this.invuln <= 0 && this.overlap(e, p, e.r + p.r * 0.72)) {
        this.hitPlayer(e.def.dmg);
        if (!e.isBoss) {
          this.burst(e.x, e.y, e.def.color, 12, 2);
          this.enemies.splice(i, 1);
        } else {
          this.player.ty = this.H - 120;
          this.player.tx = clamp(this.player.x + 60 * (Math.random() < 0.5 ? -1 : 1), 22, VW - 22);
        }
      }
    }
  }

  updateBoss(b, dt) {
    if (b.y < 118) {
      b.y += 62 * dt;
      return;
    }
    b.x = VW / 2 + Math.sin(b.t * 0.62) * (VW / 2 - 108);
    b.attackT -= dt;
    if (b.attackT > 0) return;

    const hpPct = b.hp / b.maxHp;
    b.attackT = hpPct < 0.4 ? 0.92 : hpPct < 0.75 ? 1.2 : 1.55;
    b.pattern = (b.pattern + 1) % 3;
    const speed = Math.min(300, 155 + this.wave * 4);

    if (b.pattern === 0) {
      const n = 14 + Math.min(10, Math.floor(this.wave / 5));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + b.t * 0.6;
        this.spawnEBullet(b.x, b.y, Math.cos(a) * speed * 0.8, Math.sin(a) * speed * 0.8, 7);
      }
      this.shake = Math.max(this.shake, 4);
    } else if (b.pattern === 1) {
      const a = Math.atan2(this.player.y - b.y, this.player.x - b.x);
      [-0.2, 0, 0.2].forEach((o) =>
        this.spawnEBullet(b.x, b.y, Math.cos(a + o) * speed, Math.sin(a + o) * speed, 8));
    } else {
      this.spawnEnemy('drone', b.x - 52, b.y);
      this.spawnEnemy('drone', b.x + 52, b.y);
      this.audio.power();
    }
  }

  spawnEBullet(x, y, vx, vy, r = 6) {
    if (this.ebullets.length > 220) return;
    this.ebullets.push({ x, y, vx, vy, r });
  }

  overlap(a, b, rr) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy < rr * rr;
  }

  damageEnemy(e, dmg, crit) {
    if (e.dead) return;
    e.hp -= dmg;
    e.hitT = 0.09;
    this.floatText(e.x + rand(-6, 6), e.y - e.r, Math.round(dmg), crit ? '#ffd24d' : '#bfe9ff', crit ? 13 : 10);
    if (crit) this.shake = Math.max(this.shake, 3);
    if (e.hp <= 0) this.killEnemy(e);
  }

  killEnemy(e) {
    const idx = this.enemies.indexOf(e);
    if (idx === -1) return;
    this.enemies.splice(idx, 1);
    this.kills++;
    this.combo++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.comboT = CONFIG.comboWindow;

    const comboMul = this.comboMul();
    const gained = Math.round(e.def.value * this.stats.creditsMul * comboMul * (this.powers.x2 > 0 ? 2 : 1) * (1 + this.wave * 0.02) * 1.6);
    this.credits += gained;
    this.score += e.def.score * comboMul;
    this.floatText(e.x, e.y - e.r - 8, `+${gained}`, '#ffd24d', 12);

    this.burst(e.x, e.y, e.def.color, e.isBoss ? 42 : 14, e.isBoss ? 4 : 2);
    this.audio.explode(e.r > 20);
    this.shake = Math.max(this.shake, e.isBoss ? 22 : e.r > 18 ? 6 : 2.5);

    if (e.type === 'splitter') {
      for (let i = -1; i <= 1; i++) {
        const d = this.spawnEnemy('drone', e.x + i * 26, e.y);
        d.hp = d.maxHp = Math.max(1, d.maxHp * 0.5);
        d.r = 10;
      }
    }

    if (e.isBoss) {
      this.boss = null;
      this.bossScheduled = false;
      this.bossKills++;
      const crystals = 2 + Math.floor(this.wave / 10);
      this.crystals += crystals;
      this.credits += 120 + this.wave * 18;
      this.ebullets = [];
      this.floatText(e.x, e.y - 30, `+${crystals} ✦`, '#7ee6ff', 18);
      this.onToast('CHEFE DESTRUÍDO  +' + crystals + ' cristais', 'good');
      this.audio.levelUp();
      this.advanceWave();
      return;
    }

    this.waveKills++;

    // drops
    const roll = Math.random();
    if (roll < 0.035) this.dropPickup(e.x, e.y, 'crystal');
    else if (roll < 0.075) this.dropPower(e.x, e.y);
    else if (roll < 0.5) this.dropPickup(e.x, e.y, 'coin');

    if (!this.boss && this.waveKills >= this.waveNeed) this.advanceWave();
  }

  comboMul() {
    return 1 + Math.min(this.combo, 60) * 0.03;
  }

  advanceWave() {
    const bonus = 30 + this.wave * 22;
    this.credits += bonus;
    this.floatText(VW / 2, this.H * 0.35, `ONDA LIMPA +${bonus}`, '#3ff0a0', 16);
    this.wave++;
    this.waveKills = 0;
    this.waveNeed = waveNeed(this.wave);
    this.bossScheduled = false;
    if (this.wave % 10 === 0) this.crystals += 1;
    this.shake = Math.max(this.shake, 5);
    this.pushHud(true);
    this.onWave(this.wave, sectorFor(this.wave));
    this.audio.wave();
  }

  // ---------------- PROJÉTEIS ----------------
  updateBullets(dt) {
    // tiros do jogador
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y < -20 || b.x < -20 || b.x > VW + 20) { this.bullets.splice(i, 1); continue; }

      let hit = false;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (this.overlap(b, e, e.r + b.r)) {
          this.damageEnemy(e, b.dmg, b.crit);
          this.burst(b.x, b.y, b.crit ? '#ffd24d' : '#9fe8ff', 4, 1.4, 0.22);
          this.audio.hit();
          hit = true;
          break;
        }
      }
      if (hit) this.bullets.splice(i, 1);
    }

    // tiros inimigos
    const p = this.player;
    for (let i = this.ebullets.length - 1; i >= 0; i--) {
      const b = this.ebullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y > this.H + 30 || b.y < -40 || b.x < -40 || b.x > VW + 40) { this.ebullets.splice(i, 1); continue; }
      if (!this.dead && this.invuln <= 0 && this.overlap(b, p, 12 + b.r)) {
        this.ebullets.splice(i, 1);
        this.hitPlayer(1);
      }
    }
  }

  hitPlayer(dmg) {
    if (this.invuln > 0 || this.dead) return;
    this.shields -= dmg;
    this.combo = 0;
    this.comboT = 0;
    this.player.hitFlash = 0.35;
    this.invuln = 1.25;
    this.shake = Math.max(this.shake, 14);
    this.burst(this.player.x, this.player.y, '#9fe8ff', 20, 3);
    this.audio.shieldHit();
    if (navigator.vibrate) { try { navigator.vibrate(60); } catch { /* ignore */ } }
    if (this.shields <= 0) {
      this.shields = 0;
      this.die();
    }
    this.pushHud(true);
  }

  die() {
    this.dead = true;
    this.deathT = 0;
    this.shake = 26;
    this.burst(this.player.x, this.player.y, '#ffffff', 60, 5);
    this.burst(this.player.x, this.player.y, this.skin.accent, 40, 4);
    this.audio.explode(true);
    this.audio.gameOver();
    if (navigator.vibrate) { try { navigator.vibrate([80, 60, 160]); } catch { /* ignore */ } }
    this.pushHud(true);
  }

  updatePickups(dt) {
    const p = this.player;
    const magnet = this.stats.magnet * (this.powers.magnet > 0 ? 2.3 : 1);
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const k = this.pickups[i];
      k.t += dt;
      const dx = p.x - k.x;
      const dy = p.y - k.y;
      const d = Math.hypot(dx, dy);
      if (d < magnet && !this.dead) {
        const sp = 260 + (1 - d / magnet) * 620;
        k.x += (dx / d) * sp * dt;
        k.y += (dy / d) * sp * dt;
      } else {
        k.y += k.vy * dt;
        k.x += Math.sin(k.t * 2) * 16 * dt;
      }
      if (d < 22 && !this.dead) {
        this.collect(k);
        this.pickups.splice(i, 1);
        continue;
      }
      if (k.y > this.H + 30) this.pickups.splice(i, 1);
    }
  }

  collect(k) {
    if (k.type === 'coin') {
      const value = Math.round((6 + this.wave * 2) * this.stats.creditsMul * (this.powers.x2 > 0 ? 2 : 1));
      this.credits += value;
      this.floatText(k.x, k.y - 12, `+${value}`, '#ffd24d', 11);
      this.audio.coin();
    } else if (k.type === 'crystal') {
      this.crystals += 1;
      this.floatText(k.x, k.y - 12, '+1 ✦', '#7ee6ff', 14);
      this.audio.crystal();
    } else if (k.type === 'power') {
      const kind = k.power;
      if (kind === 'shield') {
        this.shields = Math.min(this.maxShields, this.shields + 2);
        this.floatText(k.x, k.y - 12, 'ESCUDO +2', '#37d0ff', 12);
      } else if (kind === 'nova') {
        this.nova++;
        this.floatText(k.x, k.y - 12, 'NOVA +1', '#ff4d9d', 12);
      } else {
        const dur = { rapid: 9, triple: 11, magnet: 10, x2: 12 }[kind] || 8;
        this.powers[kind] = Math.max(this.powers[kind] || 0, dur);
        const label = { rapid: 'TIRO RÁPIDO', triple: 'TIRO TRIPLO', magnet: 'ÍMÃ', x2: 'CRÉDITOS ×2' }[kind];
        this.floatText(k.x, k.y - 12, label, POWER_COLOR[kind], 12);
      }
      this.audio.power();
    }
    this.pushHud(true);
  }

  dropPickup(x, y, type, power = null) {
    this.pickups.push({ x, y, type, power, vy: 48, t: 0 });
  }

  dropPower(x, y) {
    const kind = pick(['rapid', 'triple', 'magnet', 'x2', 'shield', 'nova']);
    this.dropPickup(x, y, 'power', kind);
  }

  useNova() {
    if (!this.running || this.paused || this.dead || this.nova <= 0) return;
    this.nova--;
    const dmg = 55 * this.stats.dmgMul * (1 + (this.wave - 1) * 0.05);
    this.burst(this.player.x, this.player.y, '#b06bff', 60, 6);
    this.shake = 26;
    this.audio.nova();
    for (const e of [...this.enemies]) this.damageEnemy(e, dmg, false);
    for (const b of this.ebullets) this.burst(b.x, b.y, '#ff4d9d', 3, 2, 0.3);
    this.ebullets = [];
    for (const k of this.pickups) {
      if (k.type === 'power') continue;
    }
    this.pushHud(true);
  }

  // ---------------- PARTÍCULAS / TEXTO ----------------
  burst(x, y, color, n = 12, size = 2, life = 0.5) {
    if (this.particles.length > 380) return;
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const sp = rand(40, 260) * (size / 2);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: life * rand(0.6, 1.3),
        max: life,
        size: rand(1.2, 2.6) * size,
        color,
      });
    }
  }

  floatText(x, y, text, color = '#fff', size = 11) {
    if (this.texts.length > 40) this.texts.shift();
    this.texts.push({ x, y, text, color, size, life: 0.9, max: 0.9 });
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.y -= 34 * dt;
      t.life -= dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
    for (let i = this.ebullets.length - 1; i >= 0; i--) {
      if (this.dead) {
        // tiros continuam voando, mas lentos
      }
    }
  }

  pushHud(force = false) {
    this.onHud({
      wave: this.wave,
      sector: sectorFor(this.wave),
      score: Math.floor(this.score),
      combo: this.combo,
      comboPct: clamp(this.comboT / CONFIG.comboWindow, 0, 1),
      shields: this.shields,
      maxShields: this.maxShields,
      nova: this.nova,
      powers: Object.keys(this.powers).filter((k) => this.powers[k] > 0).map((k) => ({ key: k, t: this.powers[k] })),
      credits: Math.floor(this.credits),
      crystals: this.crystals,
      boss: this.boss ? { hp: this.boss.hp, max: this.boss.maxHp, name: this.boss.name } : null,
      dead: this.dead,
      force,
    });
  }

  // ============================================================
  // RENDER
  // ============================================================
  render() {
    const ctx = this.ctx;
    const s = this.pixelScale;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = true;

    ctx.drawImage(this.bg, 0, 0, VW, this.H);

    ctx.save();
    if (this.shake > 0.2) {
      ctx.translate(rand(-this.shake, this.shake) * 0.5, rand(-this.shake, this.shake) * 0.5);
    }

    this.drawStars();
    this.drawPickups();
    this.drawEnemies();
    this.drawEBullets();
    this.drawBullets();
    if (!this.dead) this.drawPlayer();
    this.drawParticles();
    this.drawTexts();
    ctx.restore();

    ctx.fillStyle = this.vignette;
    ctx.fillRect(0, 0, VW, this.H);

    if (this.boss) this.drawBossBar();
  }

  drawStars() {
    const ctx = this.ctx;
    ctx.globalCompositeOperation = 'lighter';
    for (const s of this.stars) {
      ctx.globalAlpha = s.a;
      ctx.fillStyle = '#cfe8ff';
      ctx.fillRect(s.x, s.y, s.size, s.size * 2.4);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;
    const sk = this.skin;
    const blink = this.invuln > 0 && Math.floor(this.t * 14) % 2 === 0;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(this.tilt);

    // rastro do motor
    const flame = 8 + Math.sin(this.t * 30) * 3;
    const grad = ctx.createLinearGradient(0, 10, 0, 34 + flame);
    grad.addColorStop(0, sk.trail);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-5, 10);
    ctx.lineTo(0, 30 + flame);
    ctx.lineTo(5, 10);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = blink ? 0.45 : 1;
    ctx.shadowColor = sk.glow;
    ctx.shadowBlur = 16;

    // asas
    ctx.fillStyle = sk.accent;
    ctx.beginPath();
    ctx.moveTo(-4, -2);
    ctx.lineTo(-19, 10);
    ctx.lineTo(-15, 14);
    ctx.lineTo(-4, 9);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(4, -2);
    ctx.lineTo(19, 10);
    ctx.lineTo(15, 14);
    ctx.lineTo(4, 9);
    ctx.closePath();
    ctx.fill();

    // casco
    const hull = ctx.createLinearGradient(0, -22, 0, 14);
    if (sk.rainbow) {
      const hue = (this.t * 90) % 360;
      hull.addColorStop(0, `hsl(${hue}, 90%, 92%)`);
      hull.addColorStop(0.55, `hsl(${(hue + 70) % 360}, 90%, 68%)`);
      hull.addColorStop(1, `hsl(${(hue + 150) % 360}, 85%, 52%)`);
    } else {
      hull.addColorStop(0, sk.hull);
      hull.addColorStop(0.6, sk.accent);
      hull.addColorStop(1, sk.glow);
    }
    ctx.fillStyle = hull;
    ctx.beginPath();
    ctx.moveTo(0, -23);
    ctx.lineTo(9, -2);
    ctx.lineTo(11, 10);
    ctx.lineTo(4, 8);
    ctx.lineTo(0, 12);
    ctx.lineTo(-4, 8);
    ctx.lineTo(-11, 10);
    ctx.lineTo(-9, -2);
    ctx.closePath();
    ctx.fill();

    // cockpit
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.ellipse(0, -8, 3.2, 6.5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(80,220,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(0, -7, 1.6, 4, 0, 0, TAU);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.restore();

    // escudo
    if (this.invuln > 0 || this.shields >= this.maxShields) {
      ctx.save();
      ctx.globalAlpha = 0.16 + Math.sin(this.t * 4) * 0.05;
      ctx.strokeStyle = '#7ee6ff';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 27, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawEnemies() {
    const ctx = this.ctx;
    for (const e of this.enemies) {
      if (e.isBoss) { this.drawBoss(e); continue; }
      const c = e.hitT > 0 ? '#ffffff' : e.def.color;
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.shadowColor = e.def.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = c;

      if (e.def.shape === 'diamond') {
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-e.r * 0.7, -e.r * 0.7, e.r * 1.4, e.r * 1.4);
        ctx.fillStyle = 'rgba(0,0,0,.35)';
        ctx.fillRect(-e.r * 0.28, -e.r * 0.28, e.r * 0.56, e.r * 0.56);
      } else if (e.def.shape === 'tri') {
        ctx.beginPath();
        ctx.moveTo(0, e.r);
        ctx.lineTo(e.r, -e.r * 0.8);
        ctx.lineTo(-e.r, -e.r * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.4)';
        ctx.beginPath();
        ctx.moveTo(0, e.r * 0.4);
        ctx.lineTo(e.r * 0.42, -e.r * 0.4);
        ctx.lineTo(-e.r * 0.42, -e.r * 0.4);
        ctx.closePath();
        ctx.fill();
      } else if (e.def.shape === 'hex') {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU + Math.PI / 6;
          const px = Math.cos(a) * e.r;
          const py = Math.sin(a) * e.r;
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(10,0,30,.5)';
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 0.4, 0, TAU);
        ctx.fill();
        ctx.fillStyle = e.hitT > 0 ? '#fff' : '#ff4d9d';
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 0.2, 0, TAU);
        ctx.fill();
      } else if (e.def.shape === 'tank') {
        ctx.fillRect(-e.r * 0.85, -e.r * 0.7, e.r * 1.7, e.r * 1.4);
        ctx.fillRect(-e.r, -e.r * 0.2, e.r * 0.35, e.r * 0.9);
        ctx.fillRect(e.r * 0.65, -e.r * 0.2, e.r * 0.35, e.r * 0.9);
        ctx.fillStyle = 'rgba(0,0,0,.4)';
        ctx.fillRect(-e.r * 0.4, -e.r * 0.3, e.r * 0.8, e.r * 0.6);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, e.r, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 0.55, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();

      if (e.type === 'tank' && e.hp < e.maxHp) {
        const w = 34;
        ctx.fillStyle = 'rgba(0,0,0,.5)';
        ctx.fillRect(e.x - w / 2, e.y - e.r - 9, w, 3);
        ctx.fillStyle = '#4aa3ff';
        ctx.fillRect(e.x - w / 2, e.y - e.r - 9, w * (e.hp / e.maxHp), 3);
      }
    }
  }

  drawBoss(b) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.shadowColor = '#ffd24d';
    ctx.shadowBlur = 24;

    // anéis
    ctx.strokeStyle = 'rgba(255,210,77,.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, b.r + 10 + Math.sin(b.t * 2) * 3, 0, TAU);
    ctx.stroke();

    ctx.rotate(b.t * 0.5);
    ctx.fillStyle = b.hitT > 0 ? '#ffffff' : '#ffb648';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      const px = Math.cos(a) * b.r;
      const py = Math.sin(a) * b.r;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.rotate(-b.t * 0.5);
    ctx.fillStyle = '#5a1e4a';
    ctx.beginPath();
    ctx.arc(0, 0, b.r * 0.62, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#ff4d6d';
    ctx.beginPath();
    ctx.arc(0, 0, b.r * 0.34 + Math.sin(b.t * 6) * 2, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#fff2c9';
    ctx.beginPath();
    ctx.arc(0, 0, b.r * 0.14, 0, TAU);
    ctx.fill();

    // torres
    ctx.fillStyle = '#ffd24d';
    [-1, 1].forEach((s) => {
      ctx.fillRect(s * b.r * 0.72 - 6, -b.r * 0.24, 12, b.r * 0.55);
    });
    ctx.restore();
  }

  drawBossBar() {
    const ctx = this.ctx;
    const b = this.boss;
    const w = VW - 64;
    const x = 32;
    const y = 84;
    ctx.save();
    ctx.fillStyle = 'rgba(6,4,18,.72)';
    ctx.fillRect(x - 2, y - 2, w + 4, 14);
    const pct = clamp(b.hp / b.max, 0, 1);
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, '#ff4d6d');
    g.addColorStop(1, '#ffd24d');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w * pct, 10);
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.fillRect(x, y, w * pct, 3);
    ctx.font = '700 9px Rajdhani, system-ui, sans-serif';
    ctx.fillStyle = '#ffd9a0';
    ctx.textAlign = 'center';
    ctx.fillText(b.name, VW / 2, y - 7);
    ctx.restore();
  }

  drawBullets() {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of this.bullets) {
      ctx.fillStyle = b.crit ? '#ffd24d' : '#7ee6ff';
      ctx.shadowColor = b.crit ? '#ffb648' : '#37d0ff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, b.r, b.r * 2.6, Math.atan2(b.vy, b.vx) + Math.PI / 2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.beginPath();
      ctx.ellipse(b.x, b.y - 2, b.r * 0.4, b.r * 1.4, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  drawEBullets() {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of this.ebullets) {
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * 2.2);
      g.addColorStop(0, 'rgba(255,255,255,.95)');
      g.addColorStop(0.35, 'rgba(255,77,157,.9)');
      g.addColorStop(1, 'rgba(255,77,157,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 2.2, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  drawPickups() {
    const ctx = this.ctx;
    for (const k of this.pickups) {
      ctx.save();
      ctx.translate(k.x, k.y + Math.sin(k.t * 4) * 2);
      ctx.shadowBlur = 14;
      if (k.type === 'coin') {
        ctx.shadowColor = '#ffcc4d';
        ctx.fillStyle = '#ffcc4d';
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#8a5b00';
        ctx.font = '900 9px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('C', 0, 0.5);
      } else if (k.type === 'crystal') {
        ctx.shadowColor = '#7ee6ff';
        ctx.rotate(k.t * 2);
        ctx.fillStyle = '#7ee6ff';
        ctx.beginPath();
        ctx.moveTo(0, -11);
        ctx.lineTo(8, 0);
        ctx.lineTo(0, 11);
        ctx.lineTo(-8, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.8)';
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(3.5, 0);
        ctx.lineTo(0, 7);
        ctx.lineTo(-3.5, 0);
        ctx.closePath();
        ctx.fill();
      } else {
        const color = POWER_COLOR[k.power] || '#b06bff';
        ctx.shadowColor = color;
        ctx.rotate(Math.sin(k.t * 2) * 0.15);
        ctx.fillStyle = 'rgba(10,6,26,.92)';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        const r = 11;
        ctx.beginPath();
        ctx.moveTo(-r + 3, -r);
        ctx.lineTo(r - 3, -r);
        ctx.lineTo(r, -r + 3);
        ctx.lineTo(r, r - 3);
        ctx.lineTo(r - 3, r);
        ctx.lineTo(-r + 3, r);
        ctx.lineTo(-r, r - 3);
        ctx.lineTo(-r, -r + 3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.font = '900 9px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(POWER_LABEL[k.power] || '?', 0, 0.5);
      }
      ctx.restore();
    }
  }

  drawParticles() {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      const a = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.restore();
  }

  drawTexts() {
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      ctx.globalAlpha = clamp(t.life / t.max, 0, 1);
      ctx.font = `900 ${t.size}px Rajdhani, system-ui, sans-serif`;
      ctx.fillStyle = t.color;
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 6;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('orientationchange', this.resize);
    document.removeEventListener('visibilitychange', this._onVis);
    this.canvas.removeEventListener('pointerdown', this._onDown);
    this.canvas.removeEventListener('pointermove', this._onMove);
    this.canvas.removeEventListener('pointerup', this._onUp);
    this.canvas.removeEventListener('pointercancel', this._onUp);
    window.removeEventListener('keydown', this._onKey);
    window.removeEventListener('keyup', this._onKey);
  }
}
