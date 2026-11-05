// ============================================================
// ÁUDIO — 100% sintetizado via WebAudio (nenhum arquivo baixado)
// ============================================================
export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.lastShoot = 0;
    this.lastHit = 0;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  get ready() {
    return this.enabled && this.ctx && this.ctx.state === 'running';
  }

  tone({ freq = 440, to = null, dur = 0.1, type = 'square', vol = 0.14, attack = 0.004, delay = 0 }) {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise({ dur = 0.2, vol = 0.2, freq = 1200, q = 1, delay = 0 }) {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = freq;
    filt.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(filt).connect(g).connect(this.master);
    src.start(t0);
  }

  shoot() {
    const now = performance.now();
    if (now - this.lastShoot < 55) return;
    this.lastShoot = now;
    this.tone({ freq: 880, to: 420, dur: 0.055, type: 'square', vol: 0.045 });
  }

  hit() {
    const now = performance.now();
    if (now - this.lastHit < 45) return;
    this.lastHit = now;
    this.noise({ dur: 0.06, vol: 0.06, freq: 2600, q: 2 });
  }

  explode(big = false) {
    this.noise({ dur: big ? 0.55 : 0.18, vol: big ? 0.35 : 0.14, freq: big ? 220 : 500, q: 0.8 });
    if (big) this.tone({ freq: 90, to: 32, dur: 0.5, type: 'sawtooth', vol: 0.16 });
  }

  coin() {
    this.tone({ freq: 1320, to: 1760, dur: 0.08, type: 'triangle', vol: 0.07 });
  }

  crystal() {
    this.tone({ freq: 1480, dur: 0.09, type: 'sine', vol: 0.09 });
    this.tone({ freq: 1980, dur: 0.12, type: 'sine', vol: 0.07, delay: 0.06 });
  }

  power() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone({ freq: f, dur: 0.12, type: 'triangle', vol: 0.09, delay: i * 0.05 }));
  }

  nova() {
    this.tone({ freq: 220, to: 40, dur: 0.7, type: 'sawtooth', vol: 0.22 });
    this.noise({ dur: 0.7, vol: 0.32, freq: 700, q: 0.5 });
  }

  shieldHit() {
    this.tone({ freq: 300, to: 120, dur: 0.22, type: 'square', vol: 0.16 });
    this.noise({ dur: 0.22, vol: 0.18, freq: 900 });
  }

  levelUp() {
    [523, 659, 784, 1046, 1318].forEach((f, i) =>
      this.tone({ freq: f, dur: 0.18, type: 'triangle', vol: 0.12, delay: i * 0.07 }));
  }

  wave() {
    this.tone({ freq: 392, dur: 0.14, type: 'triangle', vol: 0.1 });
    this.tone({ freq: 587, dur: 0.22, type: 'triangle', vol: 0.1, delay: 0.12 });
  }

  boss() {
    this.tone({ freq: 70, to: 55, dur: 1.0, type: 'sawtooth', vol: 0.22 });
    this.noise({ dur: 1.0, vol: 0.16, freq: 300, q: 0.5 });
  }

  buy() {
    this.tone({ freq: 784, dur: 0.09, type: 'triangle', vol: 0.11 });
    this.tone({ freq: 1175, dur: 0.14, type: 'triangle', vol: 0.11, delay: 0.08 });
  }

  error() {
    this.tone({ freq: 200, to: 120, dur: 0.18, type: 'square', vol: 0.1 });
  }

  click() {
    this.tone({ freq: 660, dur: 0.04, type: 'sine', vol: 0.05 });
  }

  gameOver() {
    [440, 349, 262, 196].forEach((f, i) =>
      this.tone({ freq: f, dur: 0.35, type: 'triangle', vol: 0.13, delay: i * 0.16 }));
    this.noise({ dur: 0.9, vol: 0.2, freq: 240, q: 0.6 });
  }
}
