// ============================================================
// NEBULA VANGUARD — conteúdo do jogo
// Todo o balanceamento fica neste arquivo.
// ============================================================

export const RARITY = {
  common: { id: 'common', name: 'COMUM', color: '#9fb2cc', weight: 52, junk: 120 },
  rare:   { id: 'rare',   name: 'RARO',  color: '#4aa3ff', weight: 27, junk: 320 },
  epic:   { id: 'epic',   name: 'ÉPICO', color: '#b06bff', weight: 14, junk: 900 },
  legend: { id: 'legend', name: 'LENDÁRIO', color: '#ffb648', weight: 5.6, junk: 2200 },
  mythic: { id: 'mythic', name: 'MÍTICO', color: '#ff4d6d', weight: 1.4, junk: 5000 },
};

// ------------------------------------------------------------
// SKINS — hull/accent/glow/trail são usados no canvas
// perk: bônus permanente (aplica em qualquer partida)
// price: { credits } | { crystals } | null (só em baú)
// req: requisito de desbloqueio (exibido como "Requer ...")
// ------------------------------------------------------------
export const SKINS = [
  { id: 'vanguard', name: 'VANGUARD', rarity: 'common', hull: '#e8f6ff', accent: '#37d0ff', glow: '#37d0ff', trail: '#8be9ff',
    perk: {}, price: { credits: 0 }, desc: 'Nave padrão da frota. Confiável.' },

  { id: 'hornet', name: 'HORNET', rarity: 'common', hull: '#ffe9a8', accent: '#ffb020', glow: '#ffc94d', trail: '#ffdf8a',
    perk: { rate: 0.05 }, price: { credits: 1500 }, desc: 'Chassi leve, canhões mais rápidos.' },

  { id: 'crimson', name: 'CRIMSON', rarity: 'common', hull: '#ffd6d9', accent: '#ff3b52', glow: '#ff4d6d', trail: '#ff7a8c',
    perk: { dmg: 0.05 }, price: { credits: 2200 }, desc: 'Reatores vermelhos de alta pressão.' },

  { id: 'verdant', name: 'VERDANT', rarity: 'common', hull: '#d8ffe9', accent: '#22d67e', glow: '#3ff0a0', trail: '#7dffc0',
    perk: { magnet: 0.08 }, price: { credits: 3000 }, desc: 'Coletores biológicos de sucata.' },

  { id: 'cobalt', name: 'COBALT', rarity: 'rare', hull: '#d5e6ff', accent: '#2f7bff', glow: '#4aa3ff', trail: '#84c4ff',
    perk: { speed: 0.07 }, price: { credits: 6000 }, desc: 'Propulsores de íons azuis.' },

  { id: 'specter', name: 'SPECTER', rarity: 'rare', hull: '#c9c0ff', accent: '#7a5cff', glow: '#9b7bff', trail: '#c3b0ff',
    perk: { speed: 0.09, shield: 1 }, price: { credits: 9000 }, desc: 'Assinatura reduzida no radar.' },

  { id: 'solaris', name: 'SOLARIS', rarity: 'rare', hull: '#fff0d0', accent: '#ff8a1f', glow: '#ffa63d', trail: '#ffcf7d',
    perk: { dmg: 0.08 }, price: { crystals: 40 }, desc: 'Núcleo estelar em miniatura.' },

  { id: 'glacial', name: 'GLACIAL', rarity: 'rare', hull: '#e6f9ff', accent: '#5cd8ff', glow: '#8fe9ff', trail: '#c7f6ff',
    perk: { shield: 2 }, price: { crystals: 55 }, desc: 'Blindagem criogênica reforçada.' },

  { id: 'toxic', name: 'TOXIC', rarity: 'epic', hull: '#e2ffcf', accent: '#9dff2e', glow: '#b6ff5c', trail: '#d8ff9b',
    perk: { credits: 0.12 }, price: { credits: 14000 }, desc: 'Rouba recursos dos destroços.' },

  { id: 'voidwalker', name: 'VOIDWALKER', rarity: 'epic', hull: '#b9a8ff', accent: '#6a2bff', glow: '#8b5cff', trail: '#b48cff',
    perk: { crit: 0.08 }, price: { crystals: 90 }, desc: 'Anda entre as fendas do espaço.' },

  { id: 'nebula', name: 'NEBULA', rarity: 'epic', hull: '#ffd9f4', accent: '#ff4d9d', glow: '#ff7ab8', trail: '#ffb1d8',
    perk: { magnet: 0.15, credits: 0.05 }, price: { crystals: 120 }, desc: 'Campo gravitacional de coleta.' },

  { id: 'aurora', name: 'AURORA', rarity: 'epic', hull: '#d7ffe9', accent: '#3ff0a0', glow: '#5cffb8', trail: '#a8ffd4',
    perk: { speed: 0.1, rate: 0.05 }, price: { crystals: 150 }, req: { kind: 'wave', value: 12 }, desc: 'Velocidade das luzes polares.' },

  { id: 'emperor', name: 'EMPEROR', rarity: 'epic', hull: '#ffeec2', accent: '#c9a227', glow: '#ffd24d', trail: '#ffe89b',
    perk: { credits: 0.16, dmg: 0.05 }, price: { crystals: 180 }, req: { kind: 'wave', value: 20 }, desc: 'Insígnia da frota imperial.' },

  { id: 'phoenix', name: 'PHOENIX', rarity: 'legend', hull: '#ffdcc2', accent: '#ff5a1f', glow: '#ff7d3d', trail: '#ffb07d',
    perk: { dmg: 0.15 }, price: { crystals: 280 }, desc: 'Renasce das cinzas de cada onda.' },

  { id: 'quantum', name: 'QUANTUM', rarity: 'legend', hull: '#c9f8ff', accent: '#1fd7ff', glow: '#5ce8ff', trail: '#a8f4ff',
    perk: { rate: 0.15 }, price: { crystals: 320 }, req: { kind: 'level', value: 8 }, desc: 'Cadência fora da linha do tempo.' },

  { id: 'obsidian', name: 'OBSIDIAN', rarity: 'legend', hull: '#3a3352', accent: '#ffcc4d', glow: '#ffdf8a', trail: '#ffcc4d',
    perk: { credits: 0.2 }, price: { crystals: 380 }, desc: 'Casco negro e veios de ouro.' },

  { id: 'seraph', name: 'SERAPH', rarity: 'legend', hull: '#ffffff', accent: '#ffd9ff', glow: '#ffb3ff', trail: '#ffe0ff',
    perk: { shield: 4, speed: 0.06 }, price: { crystals: 420 }, req: { kind: 'level', value: 15 }, desc: 'Asas de luz pura.' },

  { id: 'mythos', name: 'MYTHOS', rarity: 'mythic', hull: '#ffd6ff', accent: '#b04dff', glow: '#e05cff', trail: '#ff8ae0', rainbow: true,
    perk: { dmg: 0.2, rate: 0.1 }, price: null, desc: 'Lenda encontrada apenas em baús.' },

  { id: 'chronos', name: 'CHRONOS', rarity: 'mythic', hull: '#fff2c9', accent: '#ffb020', glow: '#ffd24d', trail: '#fff0b0', rainbow: true,
    perk: { rate: 0.2, credits: 0.15 }, price: null, desc: 'Dispara antes do inimigo existir.' },

  { id: 'singularity', name: 'SINGULARITY', rarity: 'mythic', hull: '#c2b4ff', accent: '#2a0a4a', glow: '#ff4d9d', trail: '#c56bff', rainbow: true,
    perk: { dmg: 0.18, shield: 3, crit: 0.1 }, price: null, desc: 'O centro de tudo. Nada escapa.' },
];

export const SKIN_MAP = Object.fromEntries(SKINS.map((s) => [s.id, s]));

// ------------------------------------------------------------
// MELHORIAS PERMANENTES
// ------------------------------------------------------------
export const UPGRADES = [
  { id: 'dmg',    name: 'CANHÃO DE PLASMA', icon: '⚡', max: 60, base: 130, growth: 1.58,
    desc: '+8% de dano por nível', fmt: (lv) => `+${(lv * 8)}% dano` },
  { id: 'rate',   name: 'CADÊNCIA DE TIRO', icon: '🔥', max: 40, base: 170, growth: 1.6,
    desc: 'Atira mais rápido', fmt: (lv) => `-${Math.min(55, lv * 2)}% intervalo` },
  { id: 'hull',   name: 'CASCO REFORÇADO', icon: '🛡️', max: 40, base: 190, growth: 1.62,
    desc: '+1 escudo por nível', fmt: (lv) => `+${lv} escudo` },
  { id: 'speed',  name: 'PROPULSORES', icon: '🚀', max: 30, base: 160, growth: 1.55,
    desc: '+2% velocidade por nível', fmt: (lv) => `+${lv * 2}% velocidade` },
  { id: 'magnet', name: 'ÍMÃ DE SUCATA', icon: '🧲', max: 40, base: 140, growth: 1.5,
    desc: '+10% raio de coleta e +5% créditos', fmt: (lv) => `+${lv * 10}% coleta` },
  { id: 'crit',   name: 'MIRA QUÂNTICA', icon: '🎯', max: 40, base: 210, growth: 1.6,
    desc: '+1.5% de chance de crítico (x2.4 dano)', fmt: (lv) => `+${(lv * 1.5).toFixed(1)}% crítico` },
  { id: 'nova',   name: 'BOMBA NOVA', icon: '◉', max: 24, base: 260, growth: 1.65,
    desc: 'Começa cada partida com mais cargas', fmt: (lv) => `+${Math.floor(lv / 2)} carga(s)` },
  { id: 'greed',  name: 'CONTRATO DE SAQUE', icon: '💰', max: 50, base: 200, growth: 1.52,
    desc: '+4% de créditos por nível', fmt: (lv) => `+${lv * 4}% créditos` },
];

export const UPGRADE_MAP = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

export function upgradeCost(u, level) {
  return Math.round((u.base * Math.pow(u.growth, level)) / 10) * 10;
}

// ------------------------------------------------------------
// MISSÕES DIÁRIAS (3 sorteadas por dia)
// ------------------------------------------------------------
export const MISSION_POOL = [
  { id: 'kills',   icon: '💀', name: 'Caçador de frota', desc: 'Destrua inimigos', key: 'kills', goal: 120, reward: { credits: 900 } },
  { id: 'wave',    icon: '🌌', name: 'Explorador', desc: 'Alcance uma onda', key: 'wave', goal: 8, reward: { credits: 1200 } },
  { id: 'credits', icon: '💰', name: 'Coletor', desc: 'Colete créditos', key: 'credits', goal: 1500, reward: { crystals: 12 } },
  { id: 'runs',    icon: '🛸', name: 'Piloto dedicado', desc: 'Jogue partidas', key: 'runs', goal: 3, reward: { credits: 700 } },
  { id: 'boss',    icon: '👑', name: 'Caçador de chefes', desc: 'Derrote chefes', key: 'boss', goal: 2, reward: { credits: 1500 } },
  { id: 'combo',   icon: '🔥', name: 'Em chamas', desc: 'Alcance um combo', key: 'combo', goal: 25, reward: { crystals: 10 } },
  { id: 'crystals',icon: '✦', name: 'Garimpo estelar', desc: 'Encontre cristais', key: 'crystals', goal: 6, reward: { credits: 1000 } },
  { id: 'upgrades',icon: '⚙️', name: 'Engenheiro', desc: 'Compre melhorias', key: 'upgrades', goal: 2, reward: { crystals: 14 } },
];

// ------------------------------------------------------------
// CONQUISTAS (recompensa única)
// ------------------------------------------------------------
export const ACHIEVEMENTS = [
  { id: 'first',    icon: '🚀', name: 'Primeira decolagem', desc: 'Jogue 1 partida', stat: 'runs', goal: 1, reward: { credits: 300 } },
  { id: 'kills250', icon: '💀', name: 'Máquina de guerra', desc: 'Destroy 250 inimigos', stat: 'kills', goal: 250, reward: { credits: 800 } },
  { id: 'kills2k',  icon: '☠️', name: 'Exterminador', desc: 'Destroy 2.000 inimigos', stat: 'kills', goal: 2000, reward: { crystals: 30 } },
  { id: 'wave5',    icon: '🌠', name: 'Saindo da órbita', desc: 'Alcance a onda 5', stat: 'bestWave', goal: 5, reward: { credits: 600 } },
  { id: 'wave15',   icon: '🌌', name: 'Veterano', desc: 'Alcance a onda 15', stat: 'bestWave', goal: 15, reward: { crystals: 25 } },
  { id: 'wave30',   icon: '👾', name: 'Lenda do setor', desc: 'Alcance a onda 30', stat: 'bestWave', goal: 30, reward: { crystals: 60 } },
  { id: 'boss3',    icon: '👑', name: 'Matador de reis', desc: 'Derrote 3 chefes', stat: 'bosses', goal: 3, reward: { crystals: 20 } },
  { id: 'combo50',  icon: '🔥', name: 'Combo insano', desc: 'Alcance combo x50', stat: 'bestCombo', goal: 50, reward: { credits: 1500 } },
  { id: 'skins6',   icon: '🛸', name: 'Colecionador', desc: 'Tenha 6 skins', stat: 'skins', goal: 6, reward: { crystals: 25 } },
  { id: 'level10',  icon: '⭐', name: 'Piloto de elite', desc: 'Alcance nível 10', stat: 'level', goal: 10, reward: { crystals: 35 } },
];

// ------------------------------------------------------------
// BAÚS — probabilidades divulgadas (exigência das lojas)
// ------------------------------------------------------------
export const CRATES = [
  { id: 'common', name: 'BAÚ DE SUCATA', icon: '📦', sub: 'Skins comuns e raras',
    cost: { credits: 900 },
    odds: { common: 62, rare: 28, epic: 8, legend: 1.8, mythic: 0.2 },
    bonus: { credits: [150, 400] } },
  { id: 'bright', name: 'BAÚ BRILHANTE', icon: '🎁', sub: 'Raras garantidas, chance alta de épicas',
    cost: { crystals: 70 },
    odds: { common: 0, rare: 45, epic: 38, legend: 14, mythic: 3 },
    bonus: { credits: [600, 1400], crystals: [0, 15] } },
  { id: 'stellar', name: 'BAÚ ESTELAR', icon: '💠', sub: 'Épicas garantidas · chance máxima de míticas',
    cost: { crystals: 260 },
    odds: { common: 0, rare: 0, epic: 55, legend: 35, mythic: 10 },
    bonus: { credits: [2000, 4500], crystals: [20, 60] } },
];

// ------------------------------------------------------------
// LOJA — pacotes de cristais (microtransações)
// Em produção os preços e IDs vêm do Google Play Console.
// ------------------------------------------------------------
export const PRODUCTS = [
  { id: 'pack_starter', name: 'PACOTE INICIAL', icon: '🚀', crystals: 500, credits: 6000, skin: 'aurora',
    price: 'R$ 9,90', badge: 'UMA VEZ', oneTime: true, sub: 'Skin AURORA + 500 cristais + 6.000 créditos' },
  { id: 'crystals_120', name: 'PUNHADO DE CRISTAIS', icon: '✦', crystals: 120, price: 'R$ 4,90', sub: 'Entrada rápida na frota' },
  { id: 'crystals_700', name: 'CAIXA DE CRISTAIS', icon: '💎', crystals: 700, bonus: 120, price: 'R$ 24,90', badge: '+17%', sub: 'Bônus de 120 cristais' },
  { id: 'crystals_1600', name: 'CARREGAMENTO', icon: '💠', crystals: 1600, bonus: 400, price: 'R$ 49,90', badge: '+25%', sub: 'Bônus de 400 cristais' },
  { id: 'crystals_4000', name: 'COFRE ESTELAR', icon: '🌟', crystals: 4000, bonus: 1400, price: 'R$ 99,90', badge: 'MELHOR VALOR', best: true, sub: 'Bônus de 1.400 cristais' },
  { id: 'crystals_9000', name: 'FORTUNA GALÁCTICA', icon: '👑', crystals: 9000, bonus: 4000, price: 'R$ 199,90', badge: '+44%', sub: 'Bônus de 4.000 cristais' },
];

// ------------------------------------------------------------
// PROGRESSÃO DE ONDAS / DIFICULDADE
// ------------------------------------------------------------
export const SECTORS = ['CINTURÃO EXTERNO', 'POEIRA DE ÓRION', 'ROTA PROIBIDA', 'MAR DE VÉU', 'NÚCLEO VAZIO', 'ALÉM DO MAPA'];

export const REVIVE_COST = 30;

export const CONFIG = {
  playerShields: 3,
  fireInterval: 0.24,        // segundos
  bulletSpeed: 720,
  baseDamage: 1,
  critMult: 2.4,
  comboWindow: 2.6,
  comboMax: 99,
  magnetBase: 78,
  playerSpeed: 560,
  startNova: 1,
  waveKillsBase: 8,
  waveKillsGrow: 2.2,
  waveKillsCap: 46,
  bossEvery: 5,
  creditsPerKill: 1,
  xpPerCredit: 0.55,
};

export function uid() {
  return Math.random().toString(36).slice(2, 9);
}
