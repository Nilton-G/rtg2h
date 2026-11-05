// ============================================================
// ESTADO / SAVE / ECONOMIA
// Tudo é persistido em localStorage. Nada de servidor.
// ============================================================
import {
  SKINS, SKIN_MAP, UPGRADES, UPGRADE_MAP, upgradeCost,
  MISSION_POOL, ACHIEVEMENTS, CRATES, RARITY, PRODUCTS,
  UPGRADE_MAP as _u, CONFIG,
} from './data.js';

const SAVE_KEY = 'nebula_vanguard_save_v1';
const AD_CRYSTALS = 15;
const AD_PER_DAY = 5;

const pad = (n) => String(n).padStart(2, '0');
export function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayStr(d);
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function seeded(seed) {
  let s = seed || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

function defaults() {
  return {
    v: 1,
    credits: 450,
    crystals: 30,
    xp: 0,
    level: 1,
    bestWave: 1,
    bestScore: 0,
    stats: { runs: 0, kills: 0, bosses: 0, credits: 0, crystals: 0, playTime: 0, bestCombo: 0, upgrades: 0, crates: 0 },
    upgrades: {},
    skins: ['vanguard'],
    equipped: 'vanguard',
    achievements: {},
    daily: { date: '', ids: [], progress: {}, claimed: [] },
    dailyReward: { lastClaim: '', streak: 0 },
    purchases: [],
    ads: { date: '', count: 0 },
    settings: { sfx: true, haptics: true },
    seenIntro: false,
  };
}

export class Save {
  constructor() {
    this.data = defaults();
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const base = defaults();
      this.data = {
        ...base, ...parsed,
        stats: { ...base.stats, ...(parsed.stats || {}) },
        upgrades: { ...(parsed.upgrades || {}) },
        daily: { ...base.daily, ...(parsed.daily || {}) },
        dailyReward: { ...base.dailyReward, ...(parsed.dailyReward || {}) },
        settings: { ...base.settings, ...(parsed.settings || {}) },
        ads: { ...base.ads, ...(parsed.ads || {}) },
      };
      if (!Array.isArray(this.data.skins) || !this.data.skins.includes('vanguard')) this.data.skins = ['vanguard'];
      this.ensureDaily();
    } catch (e) {
      console.warn('Save corrompido, reiniciando.', e);
      this.data = defaults();
    }
  }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (e) {
      /* modo privado / cota cheia */
    }
  }

  reset() {
    this.data = defaults();
    this.save();
    this.ensureDaily();
  }

  // ---------------- MOEDA ----------------
  addCredits(n) {
    const v = Math.max(0, Math.round(n));
    this.data.credits += v;
    this.data.stats.credits += v;
    return v;
  }
  addCrystals(n) {
    const v = Math.max(0, Math.round(n));
    this.data.crystals += v;
    this.data.stats.crystals += v;
    return v;
  }
  canAfford(cost) {
    return (this.data.credits >= (cost.credits || 0)) && (this.data.crystals >= (cost.crystals || 0));
  }
  spend(cost) {
    if (!this.canAfford(cost)) return false;
    this.data.credits -= cost.credits || 0;
    this.data.crystals -= cost.crystals || 0;
    this.save();
    return true;
  }

  // ---------------- XP / NÍVEL ----------------
  xpNeeded(level = this.data.level) {
    return Math.round(120 * Math.pow(1.22, level - 1));
  }

  addXp(n) {
    const d = this.data;
    d.xp += Math.max(0, Math.round(n));
    const levels = [];
    let guard = 0;
    while (d.xp >= this.xpNeeded(d.level) && guard++ < 200) {
      d.xp -= this.xpNeeded(d.level);
      d.level++;
      d.crystals += 3;
      d.credits += 250;
      levels.push(d.level);
    }
    if (levels.length) this.save();
    return levels;
  }

  // ---------------- MELHORIAS ----------------
  upgradeLevels() {
    const out = {};
    for (const u of UPGRADES) out[u.id] = this.data.upgrades[u.id] || 0;
    return out;
  }
  upgradeCostOf(id) {
    const u = UPGRADE_MAP[id];
    const lv = this.data.upgrades[id] || 0;
    if (!u || lv >= u.max) return null;
    return upgradeCost(u, lv);
  }
  buyUpgrade(id) {
    const u = UPGRADE_MAP[id];
    if (!u) return { ok: false, reason: 'inexistente' };
    const lv = this.data.upgrades[id] || 0;
    if (lv >= u.max) return { ok: false, reason: 'max' };
    const cost = upgradeCost(u, lv);
    if (this.data.credits < cost) return { ok: false, reason: 'creditos', cost };
    this.data.credits -= cost;
    this.data.upgrades[id] = lv + 1;
    this.data.stats.upgrades++;
    this.addMissionProgress('upgrades', 1);
    this.save();
    return { ok: true, cost, level: lv + 1 };
  }

  totalUpgradeLevels() {
    return Object.values(this.data.upgrades).reduce((a, b) => a + b, 0);
  }

  // ---------------- SKINS ----------------
  ownsSkin(id) {
    return this.data.skins.includes(id);
  }
  equipSkin(id) {
    if (!this.ownsSkin(id)) return false;
    this.data.equipped = id;
    this.save();
    return true;
  }
  unlockSkin(id) {
    if (!SKIN_MAP[id] || this.ownsSkin(id)) return false;
    this.data.skins.push(id);
    this.save();
    return true;
  }
  skinReqMet(skin) {
    if (!skin.req) return true;
    const st = this.data;
    if (skin.req.kind === 'wave') return st.bestWave >= skin.req.value;
    if (skin.req.kind === 'level') return st.level >= skin.req.value;
    return true;
  }
  buySkin(id) {
    const s = SKIN_MAP[id];
    if (!s) return { ok: false, reason: 'inexistente' };
    if (this.ownsSkin(id)) return { ok: false, reason: 'ja-tem' };
    if (!s.price) return { ok: false, reason: 'so-bau' };
    if (!this.skinReqMet(s)) return { ok: false, reason: 'requisito' };
    if (!this.canAfford(s.price)) return { ok: false, reason: 'saldo' };
    this.spend(s.price);
    this.unlockSkin(id);
    return { ok: true, skin: s };
  }
  equippedSkin() {
    return SKIN_MAP[this.data.equipped] || SKIN_MAP.vanguard;
  }
  perks() {
    const p = this.equippedSkin().perk || {};
    return { dmg: 0, rate: 0, speed: 0, shield: 0, magnet: 0, crit: 0, credits: 0, ...p };
  }

  // ---------------- MISSÕES DIÁRIAS ----------------
  ensureDaily() {
    const t = todayStr();
    if (this.data.daily.date === t && this.data.daily.ids.length === 3) return;
    const rnd = seeded(hashStr('missions:' + t));
    const pool = [...MISSION_POOL];
    const picks = [];
    while (picks.length < 3 && pool.length) {
      picks.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
    }
    this.data.daily = { date: t, ids: picks.map((m) => m.id), progress: {}, claimed: [] };
    this.save();
  }

  missions() {
    this.ensureDaily();
    const d = this.data.daily;
    return d.ids.map((id) => {
      const def = MISSION_POOL.find((m) => m.id === id) || MISSION_POOL[0];
      const progress = Math.min(def.goal, d.progress[id] || 0);
      return {
        ...def,
        progress,
        done: progress >= def.goal,
        claimed: d.claimed.includes(id),
      };
    });
  }

  addMissionProgress(key, amount, mode = 'add') {
    this.ensureDaily();
    const d = this.data.daily;
    for (const id of d.ids) {
      const def = MISSION_POOL.find((m) => m.id === id);
      if (!def || def.key !== key) continue;
      const cur = d.progress[id] || 0;
      d.progress[id] = Math.min(def.goal, mode === 'max' ? Math.max(cur, amount) : cur + amount);
    }
    this.save();
  }

  claimMission(id) {
    const m = this.missions().find((x) => x.id === id);
    if (!m || !m.done || m.claimed) return { ok: false };
    this.data.daily.claimed.push(id);
    const granted = this.grant(m.reward);
    this.save();
    return { ok: true, reward: granted };
  }

  // ---------------- RECOMPENSA DIÁRIA ----------------
  dailyRewardInfo() {
    const t = todayStr();
    const dr = this.data.dailyReward;
    const claimedToday = dr.lastClaim === t;
    let streak = dr.streak || 0;
    if (!claimedToday) {
      streak = dr.lastClaim === yesterdayStr() ? Math.min(7, streak + 1) : 1;
    }
    const day = Math.max(1, streak);
    const credits = 300 + day * 220;
    const crystals = 5 + day * 4;
    return { claimedToday, day, credits, crystals, streak };
  }

  claimDailyReward() {
    const info = this.dailyRewardInfo();
    if (info.claimedToday) return { ok: false };
    this.data.dailyReward.lastClaim = todayStr();
    this.data.dailyReward.streak = info.day;
    this.addCredits(info.credits);
    this.addCrystals(info.crystals);
    this.save();
    return { ok: true, ...info };
  }

  // ---------------- CONQUISTAS ----------------
  achievementStats() {
    const s = this.data.stats;
    return {
      runs: s.runs,
      kills: s.kills,
      bestWave: this.data.bestWave,
      bosses: s.bosses,
      bestCombo: s.bestCombo,
      skins: this.data.skins.length,
      level: this.data.level,
    };
  }

  // Retorna conquistas recém-concluídas (recompensa é creditada automaticamente)
  checkAchievements() {
    const stats = this.achievementStats();
    const unlocked = [];
    for (const a of ACHIEVEMENTS) {
      if (this.data.achievements[a.id]) continue;
      if ((stats[a.stat] || 0) >= a.goal) {
        this.data.achievements[a.id] = Date.now();
        const granted = this.grant(a.reward);
        unlocked.push({ ...a, granted });
      }
    }
    if (unlocked.length) this.save();
    return unlocked;
  }

  achievementsView() {
    const stats = this.achievementStats();
    return ACHIEVEMENTS.map((a) => ({
      ...a,
      progress: Math.min(a.goal, stats[a.stat] || 0),
      done: !!this.data.achievements[a.id],
    }));
  }

  grant(reward = {}) {
    const out = { credits: 0, crystals: 0 };
    if (reward.credits) out.credits = this.addCredits(reward.credits);
    if (reward.crystals) out.crystals = this.addCrystals(reward.crystals);
    return out;
  }

  // ---------------- BAÚS ----------------
  openCrate(crateId) {
    const crate = CRATES.find((c) => c.id === crateId);
    if (!crate) return { ok: false, reason: 'inexistente' };
    if (!this.canAfford(crate.cost)) return { ok: false, reason: 'saldo' };
    this.spend(crate.cost);

    const entries = Object.entries(crate.odds).filter(([, w]) => w > 0);
    const total = entries.reduce((a, [, w]) => a + w, 0);
    let roll = Math.random() * total;
    let rarity = entries[0][0];
    for (const [r, w] of entries) {
      if (roll < w) { rarity = r; break; }
      roll -= w;
    }

    const pool = SKINS.filter((s) => s.rarity === rarity && !this.ownsSkin(s.id));
    let skin = null;
    let duplicate = false;
    let junk = 0;
    if (pool.length) {
      skin = pool[Math.floor(Math.random() * pool.length)];
      this.unlockSkin(skin.id);
    } else {
      duplicate = true;
      junk = RARITY[rarity].junk;
      this.addCredits(junk);
    }

    let bonusCredits = 0;
    let bonusCrystals = 0;
    if (crate.bonus?.credits) bonusCredits = randInt(crate.bonus.credits[0], crate.bonus.credits[1]);
    if (crate.bonus?.crystals) bonusCrystals = randInt(crate.bonus.crystals[0], crate.bonus.crystals[1]);
    if (bonusCredits) this.addCredits(bonusCredits);
    if (bonusCrystals) this.addCrystals(bonusCrystals);

    this.data.stats.crates++;
    this.checkAchievements();
    this.save();
    return { ok: true, crate, rarity, skin, duplicate, junk, credits: bonusCredits, crystals: bonusCrystals };
  }

  // ---------------- LOJA / IAP ----------------
  hasPurchased(productId) {
    return this.data.purchases.some((p) => p.id === productId);
  }

  grantProduct(product) {
    const totalCrystals = (product.crystals || 0) + (product.bonus || 0);
    if (totalCrystals) this.addCrystals(totalCrystals);
    if (product.credits) this.addCredits(product.credits);
    let skin = null;
    if (product.skin && !this.ownsSkin(product.skin)) {
      skin = SKIN_MAP[product.skin];
      this.unlockSkin(product.skin);
    }
    this.data.purchases.push({ id: product.id, at: Date.now(), crystals: totalCrystals });
    this.save();
    return { crystals: totalCrystals, credits: product.credits || 0, skin };
  }

  // ---------------- ANÚNCIO RECOMPENSADO (stub) ----------------
  adInfo() {
    const t = todayStr();
    if (this.data.ads.date !== t) this.data.ads = { date: t, count: 0 };
    return { remaining: Math.max(0, AD_PER_DAY - this.data.ads.count), crystals: AD_CRYSTALS, max: AD_PER_DAY };
  }
  claimAdReward() {
    const info = this.adInfo();
    if (info.remaining <= 0) return { ok: false };
    this.data.ads.count++;
    this.addCrystals(AD_CRYSTALS);
    this.save();
    return { ok: true, crystals: AD_CRYSTALS };
  }

  // ---------------- PARTIDA ----------------
  recordRun(r) {
    const d = this.data;
    d.stats.runs++;
    d.stats.kills += r.kills || 0;
    d.stats.bosses += r.bosses || 0;
    d.stats.playTime += r.time || 0;
    d.stats.bestCombo = Math.max(d.stats.bestCombo, r.bestCombo || 0);
    d.bestWave = Math.max(d.bestWave, r.wave || 1);
    d.bestScore = Math.max(d.bestScore, r.score || 0);

    this.addMissionProgress('runs', 1);
    this.addMissionProgress('kills', r.kills || 0);
    this.addMissionProgress('wave', r.wave || 1, 'max');
    this.addMissionProgress('credits', r.credits || 0);
    this.addMissionProgress('crystals', r.crystals || 0);
    this.addMissionProgress('boss', r.bosses || 0);
    this.addMissionProgress('combo', r.bestCombo || 0, 'max');

    const xp = Math.round((r.score || 0) / 8 + (r.wave || 1) * 14);
    const levels = this.addXp(xp);

    const achievements = this.checkAchievements();
    this.save();
    return { xp, levels, achievements };
  }
}
