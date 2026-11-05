// ============================================================
// BOOT — liga save, áudio, billing, UI e o loop do jogo
// ============================================================
import { Save } from './state.js';
import { Audio } from './audio.js';
import { createBilling } from './billing.js';
import { Game } from './game.js';
import { UI } from './ui.js';
import { REVIVE_COST } from './data.js';

const save = new Save();
const audio = new Audio();
audio.enabled = save.data.settings.sfx;

const canvas = document.getElementById('game');

let runFinalized = false;
let runActive = false;
let runRevives = 0;
let lastResult = null;

const ui = new UI({
  save,
  audio,
  onPlay: startGame,
  onRestart: () => { restartGame(); },
  onMenu: () => { if (runActive) finishRun(); goMenu(); },
  onResume: resumeGame,
  onQuit: () => { if (runActive) finishRun(); goMenu(); },
  onRevive: reviveGame,
  onPause: pauseGame,
});

const billing = createBilling({ save, ui });
ui.billing = billing;
billing.init();

const game = new Game(canvas, {
  save,
  audio,
  onHud: (d) => ui.updateHud(d),
  onWave: (w, s) => ui.waveFlash(w, s),
  onGameOver: (result) => onPlayerDied(result),
  onToast: (msg, kind) => ui.toast(msg, kind),
});
ui.game = game;

// ---------------- FLUXO DE PARTIDA ----------------
function startGame() {
  audio.unlock();
  runFinalized = false;
  runActive = true;
  runRevives = 0;
  lastResult = null;
  ui.hideAll();
  ui.setHudVisible(true);
  ui.syncSfxButton();
  game.start();
  if (!save.data.seenIntro) {
    ui.showHint('Arraste para mover · A nave atira sozinha', 5200);
  }
  save.data.seenIntro = true;
  save.save();
}

function pauseGame() {
  if (!runActive || game.dead) return;
  game.pause();
  ui.showPause(game.result());
}

function resumeGame() {
  if (!runActive) return;
  ui.closeOverlays();
  game.resume();
}

function restartGame() {
  if (runActive) finishRun(lastResult || game.result());
  game.stop();
  startGame();
}

function goMenu() {
  game.stop();
  runActive = false;
  ui.setHudVisible(false);
  ui.hideAll();
  ui.show('menu');
  ui.refreshAll();
}

function onPlayerDied(result) {
  lastResult = result;
  const isRecord = result.wave > save.data.bestWave || result.score > save.data.bestScore;
  const canRevive = runRevives < 2 && save.data.crystals >= REVIVE_COST;
  ui.showGameOver(result, { canRevive, isRecord });
  ui.refreshWallets();
}

function reviveGame() {
  if (!runActive || !game.dead) return;
  if (runRevives >= 2) { ui.toast('Limite de revives desta missão', 'bad'); return; }
  if (save.data.crystals < REVIVE_COST) {
    audio.error();
    ui.toast('Cristais insuficientes', 'bad');
    return;
  }
  save.data.crystals -= REVIVE_COST;
  save.save();
  runRevives++;
  lastResult = null;
  ui.closeOverlays();
  game.revive();
  game.resume();
  ui.toast('REVIVEU! Escudo total restaurado', 'good');
  audio.levelUp();
}

function finishRun(result) {
  if (runFinalized) return;
  runFinalized = true;
  const res = result || lastResult || game.result();

  save.addCredits(res.credits);
  save.addCrystals(res.crystals);
  const rec = save.recordRun(res);
  save.save();

  runActive = false;
  ui.refreshAll();

  setTimeout(() => {
    if (rec.levels.length) {
      audio.levelUp();
      ui.toast(`NÍVEL ${save.data.level} ALCANÇADO · +${rec.levels.length * 3} ✦`, 'good');
    }
    rec.achievements.forEach((a, i) => {
      setTimeout(() => ui.toast(`🏆 ${a.name} desbloqueada`, 'good'), 700 + i * 1100);
    });
  }, 400);
}

// ---------------- SERVICE WORKER / INSTALAÇÃO ----------------
// No WebView do Capacitor o app já é local; SW só faz sentido no navegador/PWA.
const isNativeShell = !!window.Capacitor;
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !isNativeShell) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => { /* offline opcional */ });
  });
}

// evita zoom por duplo toque / gesto
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

// primeiro acesso: menu + bônus diário
ui.show('menu');
ui.setHudVisible(false);

// pequena espera para o layout estabilizar antes do modal
setTimeout(() => {
  if (ui.current === 'menu') ui.showDailyReward();
}, 900);

// PWA: instalação
window.__nebula = { save, game, ui, billing };
