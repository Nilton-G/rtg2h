// ============================================================
// UI — telas em DOM sobre o canvas
// ============================================================
import {
  SKINS, RARITY, UPGRADES, UPGRADE_MAP, CRATES, PRODUCTS, REVIVE_COST, ACHIEVEMENTS,
} from './data.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const fmt = (n) => Math.round(n || 0).toLocaleString('pt-BR');

const RARITY_ORDER = ['common', 'rare', 'epic', 'legend', 'mythic'];

function perkLabel(perk) {
  if (!perk || !Object.keys(perk).length) return { text: 'Sem bônus de status', none: true };
  const bits = [];
  if (perk.dmg) bits.push(`+${Math.round(perk.dmg * 100)}% dano`);
  if (perk.rate) bits.push(`+${Math.round(perk.rate * 100)}% cadência`);
  if (perk.speed) bits.push(`+${Math.round(perk.speed * 100)}% velocidade`);
  if (perk.shield) bits.push(`+${perk.shield} escudo`);
  if (perk.magnet) bits.push(`+${Math.round(perk.magnet * 100)}% coleta`);
  if (perk.crit) bits.push(`+${Math.round(perk.crit * 100)}% crítico`);
  if (perk.credits) bits.push(`+${Math.round(perk.credits * 100)}% créditos`);
  return { text: bits.join(' · '), none: false };
}

function timeLabel(sec) {
  const s = Math.floor(sec || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h}h ${m}min`;
  return `${m}min`;
}

// desenha a nave em miniatura para cards / revelações
function drawShipIcon(ctx, cx, cy, k, sk) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(k, k);

  const flame = ctx.createLinearGradient(0, 8, 0, 34);
  flame.addColorStop(0, sk.trail);
  flame.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = flame;
  ctx.beginPath();
  ctx.moveTo(-5, 8);
  ctx.lineTo(0, 32);
  ctx.lineTo(5, 8);
  ctx.closePath();
  ctx.fill();

  ctx.shadowColor = sk.glow;
  ctx.shadowBlur = 14;
  ctx.fillStyle = sk.accent;
  ctx.beginPath();
  ctx.moveTo(-4, -2);
  ctx.lineTo(-18, 9);
  ctx.lineTo(-14, 13);
  ctx.lineTo(-4, 8);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(4, -2);
  ctx.lineTo(18, 9);
  ctx.lineTo(14, 13);
  ctx.lineTo(4, 8);
  ctx.closePath();
  ctx.fill();

  const hull = ctx.createLinearGradient(0, -20, 0, 12);
  if (sk.rainbow) {
    hull.addColorStop(0, '#ffffff');
    hull.addColorStop(0.5, '#ff8ae0');
    hull.addColorStop(1, '#8b5cff');
  } else {
    hull.addColorStop(0, sk.hull);
    hull.addColorStop(0.6, sk.accent);
    hull.addColorStop(1, sk.glow);
  }
  ctx.fillStyle = hull;
  ctx.beginPath();
  ctx.moveTo(0, -21);
  ctx.lineTo(8, -2);
  ctx.lineTo(10, 9);
  ctx.lineTo(4, 7);
  ctx.lineTo(0, 11);
  ctx.lineTo(-4, 7);
  ctx.lineTo(-10, 9);
  ctx.lineTo(-8, -2);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.beginPath();
  ctx.ellipse(0, -7, 3, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function shipCanvas(skin, size = 54) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const c = document.createElement('canvas');
  c.width = Math.round(size * dpr);
  c.height = Math.round(size * dpr);
  c.style.width = size + 'px';
  c.style.height = size + 'px';
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  drawShipIcon(g, size / 2, size / 2 + 2, size / 56, skin);
  return c;
}

export class UI {
  constructor({ save, audio, onPlay, onRestart, onMenu, onResume, onQuit, onRevive, onPause }) {
    this.save = save;
    this.audio = audio;
    this.cb = { onPlay, onRestart, onMenu, onResume, onQuit, onRevive, onPause };
    this.billing = null;
    this.game = null;
    this.current = null;
    this.shieldCount = -1;
    this.powersKey = '';
    this.toastTimer = null;
    this.hintTimer = null;
    this.buying = false;

    this.el = {
      hud: $('#hud'),
      wave: $('#hud-wave'),
      sector: $('#hud-sector'),
      score: $('#hud-score'),
      combo: $('#hud-combo'),
      comboX: $('#hud-combo-x'),
      shields: $('#hud-shields'),
      powers: $('#hud-powers'),
      novaCount: $('#nova-count'),
      novaBtn: $('#nova-btn'),
      hint: $('#hint'),
      toast: $('#toast'),
      modal: $('#modal'),
      modalCard: $('#modal-card'),
      flash: $('#wave-flash'),
    };

    this.bind();
    this.refreshMenu();
    this.refreshWallets();
  }

  // ---------------- EVENTOS ----------------
  bind() {
    document.addEventListener('click', (e) => {
      const nav = e.target.closest('[data-screen]');
      if (nav) {
        this.audio.click();
        this.show(nav.dataset.screen);
        return;
      }
      const back = e.target.closest('[data-back]');
      if (back) {
        this.audio.click();
        this.show('menu');
        return;
      }
      const act = e.target.closest('[data-action]');
      if (act) {
        this.audio.click();
        this.handleAction(act.dataset.action);
      }
    });

    this.el.novaBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.game?.useNova();
    });
  }

  handleAction(action) {
    switch (action) {
      case 'play': this.cb.onPlay?.(); break;
      case 'pause': this.cb.onPause?.(); break;
      case 'resume': this.cb.onResume?.(); break;
      case 'quit': this.cb.onQuit?.(); break;
      case 'restart': this.cb.onRestart?.(); break;
      case 'menu': this.cb.onMenu?.(); break;
      case 'revive': this.cb.onRevive?.(); break;
      case 'nova': this.game?.useNova(); break;
      case 'toggle-sfx': this.toggleSfx(); break;
      default: break;
    }
  }

  // ---------------- NAVEGAÇÃO ----------------
  show(name) {
    this.current = name;
    $$('#ui .screen').forEach((s) => s.classList.toggle('active', s.id === `scr-${name}`));
    if (name === 'menu') this.refreshMenu();
    if (name === 'hangar') this.renderHangar();
    if (name === 'upgrades') this.renderUpgrades();
    if (name === 'shop') this.renderShop();
    if (name === 'missions') this.renderMissions();
    if (name === 'crates') this.renderCrates();
    if (name === 'settings') this.renderSettings();
    this.refreshWallets();
  }

  hideAll() {
    $$('#ui .screen').forEach((s) => s.classList.remove('active'));
    this.current = null;
  }

  setHudVisible(v) {
    this.el.hud.classList.toggle('is-hidden', !v);
    this.el.hud.setAttribute('aria-hidden', String(!v));
  }

  // ---------------- CARTEIRA / MENU ----------------
  walletHTML() {
    const d = this.save.data;
    return `<span class="cur"><span class="ico">◈</span><b>${fmt(d.credits)}</b></span>
            <span class="cur"><span class="ico cry">✦</span><b>${fmt(d.crystals)}</b></span>`;
  }

  refreshWallets() {
    $$('[data-wallet]').forEach((el) => { el.innerHTML = this.walletHTML(); });
  }

  refreshMenu() {
    const d = this.save.data;
    this.refreshWallets();
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('menu-best', `Melhor: onda ${d.bestWave}`);
    set('menu-level', d.level);
    set('menu-xp', `${fmt(d.xp)} / ${fmt(this.save.xpNeeded())}`);
    const bar = document.getElementById('menu-xpbar');
    if (bar) bar.style.width = `${Math.min(100, (d.xp / this.save.xpNeeded()) * 100).toFixed(1)}%`;
    set('tile-skins', `${d.skins.length}/${SKINS.length} skins`);
    set('tile-upg', `Nível ${this.save.totalUpgradeLevels()}`);
    const missions = this.save.missions();
    const claimed = missions.filter((m) => m.claimed).length;
    const info = this.save.dailyRewardInfo();
    set('tile-missions', info.claimedToday ? `${claimed}/3 hoje` : '🎁 Bônus diário');
    set('tile-daily', 'Som · vibração');
  }

  // ---------------- HANGAR ----------------
  renderHangar() {
    const body = $('#hangar-body');
    if (!body) return;
    const d = this.save.data;
    body.innerHTML = '';

    const head = document.createElement('p');
    head.className = 'screen-note';
    head.textContent = `Skins equipadas dão bônus permanentes. Coleção: ${d.skins.length}/${SKINS.length}.`;
    body.appendChild(head);

    for (const skin of SKINS) {
      const rarity = RARITY[skin.rarity];
      const owned = this.save.ownsSkin(skin.id);
      const equipped = d.equipped === skin.id;
      const perk = perkLabel(skin.perk);
      const reqMet = this.save.skinReqMet(skin);

      const card = document.createElement('div');
      card.className = `skin-card${equipped ? ' equipped' : ''}`;
      card.style.setProperty('--rc', rarity.color);

      const thumb = document.createElement('div');
      thumb.className = 'skin-thumb';
      thumb.appendChild(shipCanvas(skin, 50));

      const info = document.createElement('div');
      info.className = 'skin-info';
      info.innerHTML = `
        <div class="skin-name">${skin.name}<span class="rar-tag" style="--rc:${rarity.color}">${rarity.name}</span></div>
        <div class="skin-perk ${perk.none ? 'none' : ''}">${perk.text}</div>
        <div class="skin-desc">${skin.desc}</div>`;

      const action = document.createElement('div');
      action.className = 'skin-action';
      const btn = document.createElement('button');
      btn.className = 'btn sm';

      if (equipped) {
        btn.className += ' equipped';
        btn.textContent = 'EM USO';
        btn.disabled = true;
      } else if (owned) {
        btn.className += ' buy';
        btn.textContent = 'EQUIPAR';
        btn.onclick = () => {
          this.audio.click();
          this.save.equipSkin(skin.id);
          this.audio.buy();
          this.toast(`${skin.name} equipada`, 'good');
          this.renderHangar();
          this.refreshMenu();
        };
      } else if (!skin.price) {
        btn.className += ' locked';
        btn.textContent = 'SÓ EM BAÚ';
        btn.onclick = () => { this.audio.click(); this.toast('Skins míticas saem apenas dos baús', 'bad'); };
      } else if (!reqMet) {
        btn.className += ' locked';
        const reqTxt = skin.req.kind === 'wave' ? `ONDA ${skin.req.value}` : `NÍVEL ${skin.req.value}`;
        btn.innerHTML = `${reqTxt}`;
        btn.onclick = () => { this.audio.error(); this.toast(`Desbloqueia em ${reqTxt.toLowerCase()}`, 'bad'); };
      } else {
        const cost = skin.price;
        const afford = this.save.canAfford(cost);
        btn.className += ` buy${afford ? '' : ' locked'}`;
        btn.innerHTML = cost.credits
          ? `◈ ${fmt(cost.credits)}`
          : `<span class="cry">✦</span> ${fmt(cost.crystals)}`;
        btn.onclick = () => {
          const res = this.save.buySkin(skin.id);
          if (!res.ok) {
            this.audio.error();
            this.toast(res.reason === 'saldo' ? 'Recursos insuficientes' : 'Não foi possível comprar', 'bad');
            return;
          }
          this.save.equipSkin(skin.id);
          this.audio.buy();
          this.toast(`${skin.name} desbloqueada e equipada!`, 'good');
          this.renderHangar();
          this.refreshMenu();
          this.refreshWallets();
        };
      }

      action.appendChild(btn);
      card.appendChild(thumb);
      card.appendChild(info);
      card.appendChild(action);
      body.appendChild(card);
    }
  }

  // ---------------- MELHORIAS ----------------
  renderUpgrades() {
    const body = $('#upgrades-body');
    if (!body) return;
    body.innerHTML = '';
    for (const u of UPGRADES) {
      const lv = this.save.data.upgrades[u.id] || 0;
      const maxed = lv >= u.max;
      const cost = this.save.upgradeCostOf(u.id);
      const afford = cost !== null && this.save.data.credits >= cost;

      const row = document.createElement('div');
      row.className = 'upg';
      row.innerHTML = `
        <div class="upg-ico">${u.icon}</div>
        <div class="upg-main">
          <div class="upg-top"><span class="upg-name">${u.name}</span><span class="upg-lv">NÍVEL ${lv}/${u.max}</span></div>
          <div class="upg-desc">${u.desc}${lv ? ' · ' + u.fmt(lv) : ''}</div>
          <div class="upg-bar"><i style="width:${(lv / u.max) * 100}%"></i></div>
        </div>`;

      const btn = document.createElement('button');
      btn.className = `btn sm${maxed ? ' owned' : afford ? ' buy' : ' locked'}`;
      btn.innerHTML = maxed ? 'MÁX' : `◈ ${fmt(cost)}`;
      btn.disabled = maxed;
      btn.onclick = () => {
        const res = this.save.buyUpgrade(u.id);
        if (!res.ok) {
          this.audio.error();
          this.toast(res.reason === 'creditos' ? 'Créditos insuficientes' : 'Melhoria no máximo', 'bad');
          return;
        }
        this.audio.buy();
        this.toast(`${u.name} → nível ${res.level}`, 'good');
        this.renderUpgrades();
        this.refreshMenu();
        this.refreshWallets();
      };
      row.appendChild(btn);
      body.appendChild(row);
    }
  }

  // ---------------- LOJA ----------------
  renderShop() {
    const body = $('#shop-body');
    if (!body) return;
    const mock = this.billing?.kind !== 'play';
    body.innerHTML = '';

    const hero = document.createElement('div');
    hero.className = 'shop-hero';
    hero.innerHTML = `
      <h3>CRISTAIS ✦</h3>
      <p>Use cristais para skins lendárias, baús estelares e reviver na hora certa. Você também ganha cristais em chefes, missões diárias e baús.</p>`;
    body.appendChild(hero);

    if (mock) {
      const warn = document.createElement('p');
      warn.className = 'screen-note';
      warn.style.cssText = 'color:#ffd24d;border:1px dashed rgba(255,210,77,.35);padding:8px 10px;border-radius:10px;background:rgba(255,210,77,.06)';
      warn.textContent = 'MODO DE TESTE: as compras abaixo são simuladas e não cobram nada. Na versão publicada, o pagamento passa pelo Google Play.';
      body.appendChild(warn);
    }

    const list = document.createElement('div');
    list.className = 'list';
    for (const p of PRODUCTS) {
      const owned = p.oneTime && this.save.hasPurchased(p.id);
      const card = document.createElement('div');
      card.className = `pack${p.best ? ' best' : ''}`;
      if (p.badge) {
        const badge = document.createElement('span');
        badge.className = 'pack-badge';
        badge.textContent = p.badge;
        card.appendChild(badge);
      }
      const ico = document.createElement('div');
      ico.className = 'pack-ico';
      ico.textContent = p.icon;
      const main = document.createElement('div');
      main.className = 'pack-main';
      main.innerHTML = `
        <div class="pack-name">${p.name}</div>
        <div class="pack-amount">${fmt(p.crystals)} ✦${p.bonus ? `<small>+${fmt(p.bonus)} BÔNUS</small>` : ''}</div>
        <div class="pack-sub">${p.sub || ''}</div>`;
      const btn = document.createElement('button');
      btn.className = `btn ${owned ? 'owned' : 'buy'}`;
      btn.disabled = owned;
      btn.innerHTML = owned ? 'ADQUIRIDO' : `${p.price}<small>COMPRAR</small>`;
      btn.onclick = () => this.buyProduct(p.id);
      card.appendChild(ico);
      card.appendChild(main);
      card.appendChild(btn);
      list.appendChild(card);
    }
    body.appendChild(list);

    const ad = document.createElement('div');
    ad.className = 'ad-card';
    const info = this.save.adInfo();
    ad.innerHTML = `
      <div class="ti">📺</div>
      <div class="ad-main">
        <b>Anúncio recompensado</b>
        <small>+${info.crystals} cristais · restam ${info.remaining}/${info.max} hoje</small>
      </div>`;
    const adBtn = document.createElement('button');
    adBtn.className = 'btn sm buy';
    adBtn.textContent = info.remaining > 0 ? 'ASSISTIR' : 'ESGOTADO';
    adBtn.disabled = info.remaining <= 0;
    adBtn.onclick = () => this.watchAd();
    ad.appendChild(adBtn);
    body.appendChild(ad);

    const restore = document.createElement('button');
    restore.className = 'btn ghost full';
    restore.textContent = 'RESTAURAR COMPRAS';
    restore.onclick = async () => {
      const res = await this.billing?.restore();
      if (res?.ok) this.toast('Compras restauradas (nesta versão os itens já estão no save)', 'good');
      else this.toast('Nada para restaurar', 'bad');
      this.renderShop();
    };
    body.appendChild(restore);

    const legal = document.createElement('p');
    legal.className = 'legal';
    legal.textContent = 'Cristais e créditos são itens digitais sem valor monetário e não podem ser trocados por dinheiro. Compras são processadas pela loja oficial do seu dispositivo e sujeitas à política de reembolso dela. As probabilidades dos baús estão divulgadas na tela de cada baú.';
    body.appendChild(legal);
  }

  async buyProduct(productId) {
    if (this.buying || !this.billing) return;
    this.buying = true;
    try {
      const res = await this.billing.purchase(productId);
      if (res.cancelled) { this.toast('Compra cancelada'); return; }
      if (!res.ok) {
        this.audio.error();
        this.toast('Não foi possível concluir a compra', 'bad');
        return;
      }
      this.audio.buy();
      const g = res.granted;
      const bits = [`+${fmt(g.crystals)} cristais`];
      if (g.credits) bits.push(`+${fmt(g.credits)} créditos`);
      if (g.skin) bits.push(`skin ${g.skin.name}`);
      this.toast(bits.join(' · '), 'good');
      this.refreshAll();
      if (g.skin) this.revealSkin(g.skin, 'COMPRA CONCLUÍDA');
    } finally {
      this.buying = false;
    }
  }

  watchAd() {
    const info = this.save.adInfo();
    if (info.remaining <= 0) return;
    this.modal({
      icon: '📺',
      title: 'ANÚNCIO RECOMPENSADO',
      body: `Aqui entraria o anúncio (AdMob). Recompensa: <b style="color:#7ee6ff">+${info.crystals} cristais</b>.<br><br>Restam ${info.remaining} hoje.`,
      actions: [
        { label: 'AGORA NÃO', variant: 'ghost' },
        {
          label: 'ASSISTIR', variant: 'primary', onClick: () => {
            const r = this.save.claimAdReward();
            if (!r.ok) { this.audio.error(); this.toast('Limite diário atingido', 'bad'); return; }
            this.audio.crystal();
            this.toast(`+${r.crystals} cristais`, 'good');
            this.refreshAll();
            if (this.current === 'shop') this.renderShop();
          },
        },
      ],
    });
  }

  // ---------------- MISSÕES ----------------
  renderMissions() {
    const body = $('#missions-body');
    const daily = $('#daily-card');
    const ach = $('#achievements-body');
    if (!body || !daily || !ach) return;

    // bônus diário
    const info = this.save.dailyRewardInfo();
    daily.innerHTML = `
      <div class="d-ico">🎁</div>
      <div class="d-main">
        <b>BÔNUS DIÁRIO · DIA ${info.day}</b>
        <small>${info.claimedToday ? 'Volte amanhã para continuar a sequência.' : `+${fmt(info.credits)} créditos · +${info.crystals} cristais`}</small>
      </div>`;
    const dbtn = document.createElement('button');
    dbtn.className = `btn sm ${info.claimedToday ? 'owned' : 'buy'}`;
    dbtn.textContent = info.claimedToday ? 'RESGATADO' : 'RESGATAR';
    dbtn.disabled = info.claimedToday;
    dbtn.onclick = () => {
      const r = this.save.claimDailyReward();
      if (!r.ok) return;
      this.audio.buy();
      this.toast(`+${fmt(r.credits)} créditos · +${r.crystals} cristais`, 'good');
      this.refreshAll();
      this.renderMissions();
    };
    daily.appendChild(dbtn);

    // missões diárias
    body.innerHTML = '';
    for (const m of this.save.missions()) {
      const row = document.createElement('div');
      row.className = `mission${m.done ? ' done' : ''}${m.claimed ? ' claimed' : ''}`;
      row.innerHTML = `
        <div class="mission-ico">${m.icon}</div>
        <div class="mission-main">
          <div class="mission-name">${m.desc} ${m.goal}</div>
          <div class="mission-prog">${fmt(m.progress)} / ${fmt(m.goal)}</div>
          <div class="mission-bar"><i style="width:${(m.progress / m.goal) * 100}%"></i></div>
          <div class="reward-line">${m.reward.credits ? `◈ ${fmt(m.reward.credits)}` : ''}${m.reward.crystals ? `  ✦ ${m.reward.crystals}` : ''}</div>
        </div>`;
      const btn = document.createElement('button');
      btn.className = `btn sm ${m.claimed ? 'owned' : m.done ? 'buy' : 'locked'}`;
      btn.textContent = m.claimed ? 'FEITO' : m.done ? 'RESGATAR' : 'EM CURSO';
      btn.disabled = !m.done || m.claimed;
      btn.onclick = () => {
        const r = this.save.claimMission(m.id);
        if (!r.ok) return;
        this.audio.buy();
        this.toast(`Recompensa: ${r.reward.credits ? fmt(r.reward.credits) + ' créditos ' : ''}${r.reward.crystals ? r.reward.crystals + ' cristais' : ''}`, 'good');
        this.renderMissions();
        this.refreshAll();
      };
      row.appendChild(btn);
      body.appendChild(row);
    }

    // conquistas
    ach.innerHTML = '';
    for (const a of this.save.achievementsView()) {
      const row = document.createElement('div');
      row.className = `mission${a.done ? ' claimed' : ''}`;
      row.innerHTML = `
        <div class="mission-ico">${a.icon}</div>
        <div class="mission-main">
          <div class="mission-name">${a.name}</div>
          <div class="mission-prog">${a.desc} · ${fmt(a.progress)}/${fmt(a.goal)}</div>
          <div class="mission-bar"><i style="width:${(a.progress / a.goal) * 100}%"></i></div>
          <div class="reward-line">${a.reward.credits ? `◈ ${fmt(a.reward.credits)}` : ''}${a.reward.crystals ? `  ✦ ${a.reward.crystals}` : ''}</div>
        </div>
        <span class="rar-tag" style="--rc:${a.done ? '#3ff0a0' : '#8ea3c8'}">${a.done ? 'OK' : '—'}</span>`;
      ach.appendChild(row);
    }
  }

  // ---------------- BAÚS ----------------
  renderCrates() {
    const body = $('#crates-body');
    if (!body) return;
    body.innerHTML = '';
    const note = document.createElement('p');
    note.className = 'screen-note';
    note.textContent = 'Skins repetidas viram créditos. As probabilidades abaixo são fixas e divulgadas.';
    body.appendChild(note);

    for (const crate of CRATES) {
      const card = document.createElement('div');
      card.className = 'crate';
      card.style.marginBottom = '12px';
      const afford = this.save.canAfford(crate.cost);
      const odds = Object.entries(crate.odds)
        .filter(([, v]) => v > 0)
        .sort((a, b) => RARITY_ORDER.indexOf(b[0]) - RARITY_ORDER.indexOf(a[0]))
        .map(([r, v]) => `<span class="odd" style="color:${RARITY[r].color}">${RARITY[r].name} ${v}%</span>`)
        .join('');
      card.innerHTML = `
        <div class="crate-top">
          <div class="crate-ico">${crate.icon}</div>
          <div>
            <div class="crate-name">${crate.name}</div>
            <div class="crate-sub">${crate.sub}</div>
          </div>
        </div>
        <div class="odds">${odds}</div>`;
      const btn = document.createElement('button');
      btn.className = `btn ${afford ? 'buy' : 'locked'}`;
      btn.innerHTML = crate.cost.credits ? `ABRIR · ◈ ${fmt(crate.cost.credits)}` : `ABRIR · <span class="cry">✦</span> ${fmt(crate.cost.crystals)}`;
      btn.onclick = () => this.openCrate(crate.id);
      card.appendChild(btn);
      body.appendChild(card);
    }
  }

  openCrate(id) {
    const res = this.save.openCrate(id);
    if (!res.ok) {
      this.audio.error();
      this.toast('Recursos insuficientes para este baú', 'bad');
      return;
    }
    this.refreshAll();
    this.renderCrates();

    const rarity = RARITY[res.rarity];
    if (res.skin) {
      this.audio.levelUp();
      this.revealSkin(res.skin, 'NOVA SKIN');
    } else {
      this.audio.buy();
      this.modal({
        icon: rarity.id === 'mythic' ? '💠' : '📦',
        title: 'SKIN REPETIDA',
        body: `Você já tem todas as skins <b style="color:${rarity.color}">${rarity.name}</b> desta raridade.<br>Convertida em <b style="color:#ffd24d">◈ ${fmt(res.junk)} créditos</b>.`,
        html: res.credits ? `<p style="margin-top:-6px;color:#ffd24d">+ ◈ ${fmt(res.credits)} créditos do baú</p>` : '',
        actions: [{ label: 'CONTINUAR', variant: 'primary' }],
      });
    }
  }

  revealSkin(skin, kicker = 'NOVA SKIN') {
    const rarity = RARITY[skin.rarity];
    const close = this.modal({
      title: kicker,
      body: '',
      html: `<div class="reveal-skin"></div>
             <div class="reveal-name" style="color:${rarity.color}">${skin.name}</div>
             <div class="reveal-rar" style="color:${rarity.color}">${rarity.name}</div>
             <div class="skin-perk" style="text-align:center;margin-top:8px">${perkLabel(skin.perk).text}</div>`,
      actions: [{ label: 'FECHAR', variant: 'primary' }],
    });
    const holder = $('.reveal-skin', this.el.modalCard);
    if (holder) {
      const big = shipCanvas(skin, 116);
      big.style.filter = `drop-shadow(0 0 22px ${rarity.color})`;
      holder.appendChild(big);
    }
    this.refreshAll();
    return close;
  }

  // ---------------- AJUSTES ----------------
  renderSettings() {
    const body = $('#settings-body');
    if (!body) return;
    body.innerHTML = '';
    const s = this.save.data.settings;

    const mk = (label, sub, on, toggle) => {
      const row = document.createElement('div');
      row.className = 'setting';
      row.innerHTML = `<div class="setting-main"><b>${label}</b><small>${sub}</small></div>`;
      const sw = document.createElement('div');
      sw.className = `switch${on ? ' on' : ''}`;
      sw.onclick = () => { toggle(); this.audio.click(); this.renderSettings(); this.syncSfxButton(); };
      row.appendChild(sw);
      body.appendChild(row);
    };

    mk('Efeitos sonoros', 'Tiros, explosões e moedas', s.sfx, () => {
      s.sfx = !s.sfx;
      this.audio.enabled = s.sfx;
      this.save.save();
    });
    mk('Vibração', 'Feedback tátil ao levar dano', s.haptics, () => {
      s.haptics = !s.haptics;
      this.save.save();
    });

    const stats = $('#stats-card');
    const st = this.save.data.stats;
    stats.innerHTML = `
      <div class="stat-row"><span>Partidas</span><b>${fmt(st.runs)}</b></div>
      <div class="stat-row"><span>Inimigos destruídos</span><b>${fmt(st.kills)}</b></div>
      <div class="stat-row"><span>Chefes derrotados</span><b>${fmt(st.bosses)}</b></div>
      <div class="stat-row"><span>Melhor onda</span><b>${fmt(this.save.data.bestWave)}</b></div>
      <div class="stat-row"><span>Melhor combo</span><b>x${fmt(st.bestCombo)}</b></div>
      <div class="stat-row"><span>Skins na coleção</span><b>${this.save.data.skins.length}/${SKINS.length}</b></div>
      <div class="stat-row"><span>Tempo de jogo</span><b>${timeLabel(st.playTime)}</b></div>
      <div class="stat-row"><span>Créditos ganhos</span><b>${fmt(st.credits)}</b></div>`;

    const btn = $('#btn-reset');
    btn.onclick = () => {
      this.modal({
        icon: '⚠️',
        title: 'APAGAR PROGRESSO?',
        body: 'Isso remove skins, melhorias, cristais e recordes deste dispositivo. Não dá para desfazer.',
        actions: [
          { label: 'CANCELAR', variant: 'ghost' },
          {
            label: 'APAGAR', variant: 'danger', onClick: () => {
              this.save.reset();
              this.toast('Progresso apagado', 'bad');
              this.refreshAll();
              this.renderSettings();
              this.show('menu');
            },
          },
        ],
      });
    };
  }

  toggleSfx() {
    const s = this.save.data.settings;
    s.sfx = !s.sfx;
    this.audio.enabled = s.sfx;
    this.save.save();
    this.syncSfxButton();
    if (s.sfx) this.audio.click();
    this.toast(s.sfx ? 'Som ligado' : 'Som desligado');
  }

  syncSfxButton() {
    const b = $('#btn-sfx-pause');
    if (b) b.textContent = `Som: ${this.save.data.settings.sfx ? 'ligado' : 'desligado'}`;
  }

  // ---------------- HUD ----------------
  updateHud(d) {
    const e = this.el;
    if (e.wave.textContent !== String(d.wave)) e.wave.textContent = d.wave;
    if (e.sector.textContent !== d.sector) e.sector.textContent = d.sector;
    const score = fmt(d.score);
    if (e.score.textContent !== score) e.score.textContent = score;

    const showCombo = d.combo >= 2;
    e.combo.classList.toggle('is-hidden', !showCombo);
    if (showCombo) {
      e.comboX.textContent = `x${d.combo}`;
      e.combo.style.setProperty('--p', d.comboPct.toFixed(3));
    }

    if (this.shieldCount !== d.maxShields) {
      this.shieldCount = d.maxShields;
      e.shields.innerHTML = '';
      for (let i = 0; i < d.maxShields; i++) e.shields.appendChild(document.createElement('i'));
    }
    [...e.shields.children].forEach((pip, i) => pip.classList.toggle('empty', i >= d.shields));

    if (e.novaCount.textContent !== String(d.nova)) e.novaCount.textContent = d.nova;
    e.novaBtn.classList.toggle('disabled', d.nova <= 0);

    const key = d.powers.map((p) => `${p.key}:${Math.ceil(p.t)}`).join('|');
    if (key !== this.powersKey) {
      this.powersKey = key;
      e.powers.innerHTML = d.powers.map((p) => {
        const meta = {
          rapid: ['TIRO RÁPIDO', ''], triple: ['TRIPLO', ''],
          magnet: ['ÍMÃ', 'gold'], x2: ['CRÉDITOS ×2', 'gold'],
        }[p.key] || [p.key, ''];
        return `<span class="power-chip ${meta[1]}">${meta[0]} ${Math.ceil(p.t)}s</span>`;
      }).join('');
    }
  }

  showHint(text, ms = 4200) {
    this.el.hint.textContent = text;
    this.el.hint.classList.add('show');
    clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => this.el.hint.classList.remove('show'), ms);
  }

  waveFlash(wave, sector) {
    const el = this.el.flash;
    el.textContent = `ONDA ${wave} · ${sector}`;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  // ---------------- GAME OVER / PAUSA ----------------
  showGameOver(result, { canRevive, isRecord }) {
    const el = $('#go-results');
    el.innerHTML = `
      <div class="res big"><small>${isRecord ? 'NOVO RECORDE' : 'PONTUAÇÃO'}</small><b>${fmt(result.score)}</b></div>
      <div class="res"><small>ONDA</small><b>${result.wave}</b></div>
      <div class="res"><small>ABATES</small><b>${fmt(result.kills)}</b></div>
      <div class="res"><small>COMBO MÁX</small><b>x${fmt(result.bestCombo)}</b></div>
      <div class="res"><small>CRÉDITOS</small><b style="color:#ffd24d">+${fmt(result.credits)}</b></div>
      <div class="res"><small>CRISTAIS</small><b style="color:#7ee6ff">+${result.crystals}</b></div>`;
    const revive = $('#go-revive');
    revive.style.display = canRevive ? '' : 'none';
    $('#revive-cost').textContent = REVIVE_COST;
    this.show('gameover');
    this.setHudVisible(false);
  }

  showPause(result) {
    $('#pause-stats').innerHTML = `
      <div class="stat-row"><span>Onda</span><b>${result.wave}</b></div>
      <div class="stat-row"><span>Pontos</span><b>${fmt(result.score)}</b></div>
      <div class="stat-row"><span>Créditos da missão</span><b>◈ ${fmt(result.credits)}</b></div>
      <div class="stat-row"><span>Cristais encontrados</span><b>✦ ${result.crystals}</b></div>`;
    this.syncSfxButton();
    this.show('pause');
    this.setHudVisible(false);
  }

  closeOverlays() {
    this.hideAll();
    this.setHudVisible(true);
  }

  // ---------------- MODAL / TOAST ----------------
  modal({ icon = '', title = '', body = '', html = '', actions = [] }) {
    const el = this.el.modal;
    const card = this.el.modalCard;
    card.innerHTML = `
      ${icon ? `<span class="modal-ico">${icon}</span>` : ''}
      <h3>${title}</h3>
      ${body ? `<p>${body}</p>` : ''}
      ${html}
      <div class="modal-actions"></div>`;
    const actionsEl = $('.modal-actions', card);
    const close = () => {
      el.classList.add('is-hidden');
      card.innerHTML = '';
    };
    for (const a of actions) {
      const b = document.createElement('button');
      b.className = `btn ${a.variant || 'ghost'}`;
      b.textContent = a.label;
      b.onclick = () => {
        this.audio.click();
        close();
        a.onClick?.();
      };
      actionsEl.appendChild(b);
    }
    if (!actions.length) {
      const b = document.createElement('button');
      b.className = 'btn primary';
      b.textContent = 'FECHAR';
      b.onclick = close;
      actionsEl.appendChild(b);
    }
    el.classList.remove('is-hidden');
    return close;
  }

  confirmPurchase(product) {
    return new Promise((resolve) => {
      const mock = this.billing?.kind !== 'play';
      const bits = [`<b style="color:#7ee6ff">${fmt(product.crystals + (product.bonus || 0))} cristais</b>`];
      if (product.credits) bits.push(`<b style="color:#ffd24d">${fmt(product.credits)} créditos</b>`);
      if (product.skin) bits.push('uma skin exclusiva');
      this.modal({
        icon: product.icon,
        title: product.name,
        body: `Você recebe ${bits.join(' + ')}.<br><br>Valor: <b>${product.price}</b>${mock ? '<br><br><span style="color:#ffd24d">Modo de teste: nenhuma cobrança real será feita.</span>' : ''}`,
        actions: [
          { label: 'CANCELAR', variant: 'ghost', onClick: () => resolve(false) },
          { label: mock ? 'SIMULAR COMPRA' : 'CONFIRMAR', variant: 'primary', onClick: () => resolve(true) },
        ],
      });
    });
  }

  toast(msg, kind = '') {
    const t = this.el.toast;
    t.textContent = msg;
    t.className = `toast show ${kind}`;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { t.className = `toast ${kind}`; }, 2400);
  }

  showDailyReward() {
    const info = this.save.dailyRewardInfo();
    if (info.claimedToday) return;
    this.modal({
      icon: '🎁',
      title: `BÔNUS DIÁRIO · DIA ${info.day}`,
      body: `Volte amanhã para manter a sequência e ganhar mais.<br><br><b style="color:#ffd24d">+${fmt(info.credits)} créditos</b><br><b style="color:#7ee6ff">+${info.crystals} cristais</b>`,
      actions: [
        { label: 'DEPOIS', variant: 'ghost' },
        {
          label: 'RESGATAR', variant: 'primary', onClick: () => {
            const r = this.save.claimDailyReward();
            if (!r.ok) return;
            this.audio.buy();
            this.toast(`+${fmt(r.credits)} créditos · +${r.crystals} cristais`, 'good');
            this.refreshAll();
          },
        },
      ],
    });
  }

  refreshAll() {
    this.refreshWallets();
    this.refreshMenu();
  }
}
