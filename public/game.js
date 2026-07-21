(() => {
  // src/constants.ts
  var WORLD_W = 4200;
  var WORLD_H = 4200;
  var TILE = 64;
  var BUILD_REACH = TILE * 3;
  var WS_URL = "ws://localhost:8081/ws";
  var BASE_STATS = {
    radius: 22,
    maxHp: 100,
    maxSpeed: 4.2,
    accel: 0.55,
    friction: 0.87,
    damage: 12,
    bulletSpeed: 9.5,
    bulletRadius: 5,
    fireRate: 3.2,
    regen: 0.06
  };
  var POWERUP_DEFS = {
    nuke: { label: "NUKE", color: "#ff5c5c", symbol: "N" },
    insta: { label: "INSTA-KILL", color: "#ffd76a", symbol: "!", duration: 2e4 },
    double: { label: "2x XP", color: "#4ecdc4", symbol: "2", duration: 3e4 },
    heal: { label: "FULL HEAL", color: "#8bd17c", symbol: "+" }
  };
  var POINTS_BY_TYPE = {
    normal: 10,
    scout: 8,
    brute: 22,
    spitter: 16,
    exploder: 16,
    wolf: 12,
    boss: 600,
    spider: 15,
    witch: 25
  };
  var POWERUP_LIFETIME_MS = 2e4;
  var WEAPON_DEFS = {
    pistol: { label: "Pistol", desc: "Reliable sidearm.", playstyle: "", fireRateMul: 1, damageMul: 1 },
    dualguns: { label: "Dual Guns", desc: "Twin pistols \u2014 +50% fire rate, -35% damage per shot.", playstyle: "Fast attacking and mobile.", fireRateMul: 1.5, damageMul: 0.65, pellets: 2 },
    machinegun: { label: "Machine Gun", desc: "Very high fire rate, heavy sustained damage, slows you while firing.", playstyle: "Good against large zombie groups.", fireRateMul: 2.3, damageMul: 0.9, moveSpeedMulWhileFiring: 0.6 },
    shotgun: { label: "Shotgun", desc: "3-shot spread, devastating up close, falls off at range.", playstyle: "High-risk close combat.", fireRateMul: 1, damageMul: 0.65, pellets: 3, spreadRad: 0.22, bulletLifeMul: 0.55 },
    grenadelauncher: { label: "Grenade Launcher", desc: "Slow-firing explosive shells, heavy splash damage, short range.", playstyle: "Crowd control weapon.", fireRateMul: 0.35, damageMul: 2.6, explosive: true, explodeRadius: 100, bulletSpeedMul: 0.55, bulletLifeMul: 0.5 }
  };
  var OVERHEAT_MAX = 100;
  var OVERHEAT_PER_SHOT = 14;
  var OVERHEAT_DECAY_PER_SEC = 25;
  var OVERHEAT_LOCKOUT_MS = 2200;
  var BURN_CHANCE = 0.25;
  var BURN_DURATION_MS = 5e3;
  var BURN_DAMAGE_FRACTION = 0.2;
  var MUTATION_DEFS = {
    vampire: { label: "Vampire", desc: "Heal 2% of damage dealt. +25% movement speed.", playstyle: "Aggressive survival.", apply: () => {
    } },
    overclocked: { label: "Overclocked", desc: "+50% fire rate. Weapon overheats with sustained fire. +35% size.", playstyle: "High damage but requires management.", apply: (p) => {
      p.radius *= 1.35;
    } },
    titan: { label: "Titan", desc: "+400 max HP. -15% movement speed. +100% size.", playstyle: "Tank build.", apply: (p) => {
      p.maxHp += 400;
      p.hp += 400;
      p.radius *= 2;
    } },
    pyromaniac: { label: "Pyromaniac", desc: "Bullets have a chance to burn enemies for damage over time.", playstyle: "Damage over time build.", apply: () => {
    } }
  };
  var SKIN_TINTS = {
    crimson: ["#ff9a9a", "#d45c5c"],
    azure: ["#9ad2ff", "#5c9dd4"],
    golden: ["#ffe9a0", "#d4b04a"],
    shadow: ["#a8a8b8", "#5c5c66"],
    verdant: ["#9aff9a", "#4a9a5c"],
    obsidian: ["#5a5a66", "#26262e"]
  };
  var PERM_DEFS = {
    hp: { label: "Vitality", desc: "+10 max HP", costBase: 8, bonus: (lvl) => lvl * 10 },
    speed: { label: "Speed", desc: "+0.12 speed", costBase: 10, bonus: (lvl) => lvl * 0.12 },
    damage: { label: "Power", desc: "+1 damage", costBase: 9, bonus: (lvl) => lvl * 1 },
    rate: { label: "Reload", desc: "+0.08 rate/s", costBase: 12, bonus: (lvl) => lvl * 0.08 },
    regen: { label: "Recovery", desc: "+0.03 HP regen", costBase: 10, bonus: (lvl) => lvl * 0.03 },
    fortune: { label: "Fortune", desc: "+5% shop points", costBase: 11, bonus: (lvl) => lvl * 0.05 }
  };
  var START_BONUS_DEFS = [
    { key: "headstart", label: "Head Start", desc: "+50 wood, +50 stone at run start", cost: 60 },
    { key: "nestegg", label: "Nest Egg", desc: "+30 shop points at run start", cost: 80 }
  ];
  var META_SKIN_DEFS = [
    { key: "verdant", label: "Verdant", cost: 70 },
    { key: "obsidian", label: "Obsidian", cost: 110 }
  ];
  var MODE_DEFS = {
    solo: { label: "Singleplayer", desc: "Survive alone, at your own pace." },
    team: { label: "Team Mode", desc: "2-4 players queue up and ready up to start together." }
  };
  var SETTINGS_KEY = "nightfall_settings";
  var CLASS_DEFS = {
    gunner: { label: "Gunner", desc: "+40% fire rate, -15% max HP", apply: (p) => {
      p.fireRate *= 1.4;
      p.maxHp = Math.round(p.maxHp * 0.85);
    } },
    builder: { label: "Builder", desc: "Structures 30% cheaper, +30 starting wood", apply: (p) => {
      p.buildDiscount = 0.7;
      p.wood += 30;
    } },
    scavenger: { label: "Scavenger", desc: "+50% resource yield & harvest XP", apply: (p) => {
      p.resourceMul = 1.5;
    } }
  };
  var BUILD_DEFS = {
    wall: { label: "Wall", wood: 15, stone: 0, hp: 80, radius: 26, color: ["#c9a668", "#9aa3a6", "#c7cfd2"] },
    spike: { label: "Spike", wood: 10, stone: 5, hp: 40, radius: 18, damage: 9 },
    campfire: { label: "Campfire", wood: 20, stone: 0, hp: 50, radius: 20, healRadius: 150, healRate: 5 },
    shop: { label: "Shop", wood: 40, stone: 35, hp: 120, radius: 24 },
    factory: { label: "Factory", wood: 50, stone: 40, hp: 150, radius: 28 },
    cannon: { label: "Cannon", wood: 25, stone: 20, hp: 70, radius: 20, range: 250, fireRate: 1, damage: 15 },
    mortar: { label: "Mortar", wood: 35, stone: 25, hp: 80, radius: 22, range: 400, fireRate: 0.4, damage: 40 },
    sniper: { label: "Sniper", wood: 40, stone: 30, hp: 60, radius: 20, range: 600, fireRate: 0.25, damage: 120 },
    tesla: { label: "Tesla Tower", wood: 30, stone: 30, hp: 70, radius: 20, range: 240, fireRate: 0.8, damage: 20 },
    frost: { label: "Frost Tower", wood: 30, stone: 25, hp: 90, radius: 22, range: 200, fireRate: 1, damage: 5 },
    toxic: { label: "Toxic Spitter", wood: 35, stone: 30, hp: 80, radius: 20, range: 340, fireRate: 0.25, damage: 10 }
  };
  var STRUCTURE_TIERS = {
    wall: [
      { name: "Wood", hpMax: 80, pointsCost: 0 },
      { name: "Stone", hpMax: 170, pointsCost: 40 },
      { name: "Metal", hpMax: 280, pointsCost: 90 }
    ],
    spike: [
      { name: "Sharp", hpMax: 40, damage: 9, pointsCost: 0 },
      { name: "Barbed", hpMax: 65, damage: 16, pointsCost: 45 },
      { name: "Serrated", hpMax: 95, damage: 26, pointsCost: 95 }
    ]
  };
  var TOWER_LEVELS = {
    cannon: [
      { damage: 15, fireRate: 1, range: 250, cost: null },
      { damage: 22, fireRate: 1.1, range: 275, cost: { resource: "wood", amount: 10 } },
      { damage: 32, fireRate: 1.25, range: 300, cost: { resource: "stone", amount: 15 } },
      { damage: 48, fireRate: 1.4, range: 325, cost: { resource: "iron", amount: 8 } },
      { damage: 75, fireRate: 1.6, range: 350, cost: { resource: "gold", amount: 3 } }
    ],
    mortar: [
      { damage: 40, fireRate: 0.4, range: 400, specialValue: 125, cost: null },
      // splash radius 125px
      { damage: 60, fireRate: 0.45, range: 420, specialValue: 140, cost: { resource: "wood", amount: 15 } },
      { damage: 90, fireRate: 0.5, range: 440, specialValue: 160, cost: { resource: "stone", amount: 20 } },
      { damage: 135, fireRate: 0.55, range: 460, specialValue: 180, cost: { resource: "iron", amount: 12 } },
      { damage: 210, fireRate: 0.6, range: 480, specialValue: 200, cost: { resource: "gold", amount: 4 } }
    ],
    tesla: [
      { damage: 20, fireRate: 0.8, range: 240, specialValue: 3, cost: null },
      // chain count 3
      { damage: 30, fireRate: 0.9, range: 260, specialValue: 3, cost: { resource: "wood", amount: 12 } },
      { damage: 45, fireRate: 1, range: 280, specialValue: 4, cost: { resource: "stone", amount: 18 } },
      { damage: 65, fireRate: 1.1, range: 300, specialValue: 5, cost: { resource: "iron", amount: 10 } },
      { damage: 100, fireRate: 1.3, range: 320, specialValue: 6, cost: { resource: "gold", amount: 3 } }
    ],
    sniper: [
      { damage: 120, fireRate: 0.25, range: 600, cost: null },
      { damage: 180, fireRate: 0.28, range: 650, cost: { resource: "wood", amount: 18 } },
      { damage: 270, fireRate: 0.32, range: 700, cost: { resource: "stone", amount: 25 } },
      { damage: 400, fireRate: 0.35, range: 750, cost: { resource: "iron", amount: 15 } },
      { damage: 650, fireRate: 0.4, range: 800, cost: { resource: "gold", amount: 5 } }
    ],
    frost: [
      { damage: 5, fireRate: 1, range: 200, specialValue: 0.2, cost: null },
      // slow rate 20%
      { damage: 8, fireRate: 1, range: 225, specialValue: 0.25, cost: { resource: "wood", amount: 12 } },
      { damage: 13, fireRate: 1, range: 250, specialValue: 0.32, cost: { resource: "stone", amount: 18 } },
      { damage: 20, fireRate: 1, range: 275, specialValue: 0.4, cost: { resource: "iron", amount: 10 } },
      { damage: 32, fireRate: 1, range: 300, specialValue: 0.5, cost: { resource: "gold", amount: 3 } }
    ],
    toxic: [
      { damage: 10, fireRate: 0.25, range: 340, specialValue: 5, cost: null },
      // armor reduction 5
      { damage: 16, fireRate: 0.25, range: 360, specialValue: 8, cost: { resource: "wood", amount: 15 } },
      { damage: 25, fireRate: 0.25, range: 380, specialValue: 12, cost: { resource: "stone", amount: 20 } },
      { damage: 38, fireRate: 0.25, range: 400, specialValue: 18, cost: { resource: "iron", amount: 12 } },
      { damage: 58, fireRate: 0.25, range: 420, specialValue: 25, cost: { resource: "gold", amount: 4 } }
    ]
  };
  var ZTYPE = {
    normal: { radiusR: [17, 23], hpMul: 1, speedMul: 1, dmgMul: 1, color: "#4c8a52", color2: "#3a6b40", dark: "#274d2b" },
    scout: { radiusR: [12, 15], hpMul: 0.55, speedMul: 1.7, dmgMul: 0.7, color: "#c9c24e", color2: "#a8a13c", dark: "#7a742a" },
    brute: { radiusR: [28, 33], hpMul: 2.4, speedMul: 0.65, dmgMul: 1.8, color: "#8a3d3d", color2: "#6e2f2f", dark: "#4d2020" },
    spitter: { radiusR: [15, 18], hpMul: 0.7, speedMul: 0.55, dmgMul: 0, color: "#5a9151", color2: "#437040", dark: "#2b4526", ranged: true, range: 340, fireRate: 0.8 },
    exploder: { radiusR: [19, 24], hpMul: 0.6, speedMul: 1.5, dmgMul: 0, color: "#c07a2e", color2: "#9c5c1e", dark: "#5c2e0d", explode: true, explodeRadius: 95 },
    wolf: { radiusR: [16, 20], hpMul: 0.5, speedMul: 1.85, dmgMul: 1.1, color: "#7a8a95", color2: "#5c6b75", dark: "#3a444c" },
    spider: { radiusR: [14, 17], hpMul: 0.8, speedMul: 1.35, dmgMul: 0.8, color: "#2c3e50", color2: "#1a252f", dark: "#0e141a", ranged: true, range: 300, fireRate: 0.4 },
    witch: { radiusR: [16, 19], hpMul: 1.4, speedMul: 0.8, dmgMul: 0.9, color: "#8e44ad", color2: "#7d3c98", dark: "#4a235a", ranged: true, range: 380, fireRate: 0.5 },
    boss: { radiusR: [54, 54], hpMul: 1, speedMul: 1, dmgMul: 1, color: "#4b2a63", color2: "#3a1f4d", dark: "#241333" }
  };
  var SKIN_VARIANTS = [
    ["#4c8a52", "#3a6b40", "#274d2b"],
    ["#5c9a5a", "#457a44", "#2e552e"],
    ["#7a9350", "#5c723c", "#3a4a26"],
    ["#8a7550", "#6b5938", "#453824"],
    ["#6e8a4a", "#546b38", "#374524"]
  ];
  var CLOTH_COLORS = ["#5a2a2a", "#2a3a5a", "#3a3a3a", "#4a3320", "#2a4a3a", null];
  var BLOOD_MOON_DURATION_MS = 6e4;
  var BLOOD_MOON_MIN_GAP_MS = 6e4;
  var BLOOD_MOON_MAX_GAP_MS = 18e5;
  var ARM_SHADOW = "#4d3f7a";
  var GRASS_DAY = "#8fa72d";
  var GRASS_NIGHT = "#26330f";
  var TUFT_DAY = "#7c9426";
  var TUFT_NIGHT = "#1c260c";
  var MINIMAP_SIZE = 150;
  var MINIMAP_MARGIN = 16;
  var DEBUG_PASSWORD = "agi123";

  // src/state.ts
  var hasStorage = typeof window.storage !== "undefined";
  var keys = {};
  var mouse = { x: 0, y: 0, down: false };
  var touchMove = { x: 0, y: 0 };
  var touchAim = { x: 0, y: 0 };
  var isTouchActive = false;
  function setIsTouchActive(val) {
    isTouchActive = val;
  }
  var running = false;
  function setRunning(val) {
    running = val;
  }
  var paused = false;
  function setPaused(val) {
    paused = val;
  }
  var lastTime = 0;
  function setLastTime(val) {
    lastTime = val;
  }
  var camera = { x: 0, y: 0 };
  var selectedBuild = null;
  function setSelectedBuild(val) {
    selectedBuild = val;
  }
  var manualBuildAngle = null;
  function setManualBuildAngle(val) {
    manualBuildAngle = val;
  }
  var selectedClass = "gunner";
  function setSelectedClass(val) {
    selectedClass = val;
  }
  var selectedMode = "solo";
  function setSelectedMode(val) {
    selectedMode = val;
  }
  var playerName = "Survivor";
  function setPlayerName(val) {
    playerName = val;
  }
  var shake = { time: 0, mag: 0 };
  var dayNight = { time: 0, total: 11e4, factor: 0, isNight: false, nightSpawnTimer: 6e3 };
  var bloodMoon = { active: false, endsAt: 0, nextAt: 0 };
  var player = {
    x: WORLD_W / 2,
    y: WORLD_H / 2,
    vx: 0,
    vy: 0,
    angle: 0,
    radius: BASE_STATS.radius,
    hp: BASE_STATS.maxHp,
    maxHp: BASE_STATS.maxHp,
    maxSpeed: BASE_STATS.maxSpeed,
    accel: BASE_STATS.accel,
    friction: BASE_STATS.friction,
    damage: BASE_STATS.damage,
    bulletSpeed: BASE_STATS.bulletSpeed,
    bulletRadius: BASE_STATS.bulletRadius,
    fireRate: BASE_STATS.fireRate,
    lastShot: 0,
    level: 1,
    xp: 0,
    xpToNext: 50,
    statPoints: 0,
    points: 0,
    wood: 0,
    stone: 0,
    iron: 0,
    gold: 0,
    kills: 0,
    regen: BASE_STATS.regen,
    alive: true,
    buildDiscount: 1,
    resourceMul: 1,
    fortuneMul: 1,
    instaKillUntil: 0,
    doubleXpUntil: 0,
    speedBoostUntil: 0,
    damageBoostUntil: 0,
    fireRateBoostUntil: 0,
    regenBoostUntil: 0,
    secondChance: false,
    skinTint: null,
    weapon: "pistol",
    weaponChosen: false,
    mutation: null,
    mutationChosen: false,
    heat: 0,
    overheatedUntil: 0
  };
  var bullets = [];
  function setBullets(val) {
    bullets = val;
  }
  var zombies = [];
  function setZombies(val) {
    zombies = val;
  }
  var resources = [];
  function setResources(val) {
    resources = val;
  }
  var structures = [];
  function setStructures(val) {
    structures = val;
  }
  var crates = [];
  function setCrates(val) {
    crates = val;
  }
  var powerups = [];
  function setPowerups(val) {
    powerups = val;
  }
  var particles = [];
  function setParticles(val) {
    particles = val;
  }
  var bursts = [];
  function setBursts(val) {
    bursts = val;
  }
  var bloodDecals = [];
  function setBloodDecals(val) {
    bloodDecals = val;
  }
  var decor = [];
  function setDecor(val) {
    decor = val;
  }
  var terrainPatches = [];
  function setTerrainPatches(val) {
    terrainPatches = val;
  }
  var fireflies = [];
  function setFireflies(val) {
    fireflies = val;
  }
  var stars = [];
  var wave = 0;
  function setWave(val) {
    wave = val;
  }
  var zombiesToSpawn = 0;
  function setZombiesToSpawn(val) {
    zombiesToSpawn = val;
  }
  var spawnTimer = 0;
  function setSpawnTimer(val) {
    spawnTimer = val;
  }
  var waveClearedAt = 0;
  function setWaveClearedAt(val) {
    waveClearedAt = val;
  }
  var nextWaveDelay = 4500;
  var waveState = "idle";
  function setWaveState(val) {
    waveState = val;
  }
  var isBossWave = false;
  function setIsBossWave(val) {
    isBossWave = val;
  }
  var activeBoss = null;
  function setActiveBoss(val) {
    activeBoss = val;
  }
  function defaultMeta() {
    return {
      metaPoints: 0,
      perm: { hp: 0, speed: 0, damage: 0, rate: 0, regen: 0, fortune: 0 },
      lifetimeKills: 0,
      bestWave: 0,
      gamesPlayed: 0,
      name: "",
      startBonuses: {},
      unlockedSkins: [],
      equippedSkin: null
    };
  }
  var meta = defaultMeta();
  function setMeta(val) {
    meta = val;
  }
  var lobby = {
    players: [],
    phase: "waiting",
    countdownEndsAt: null,
    onPlayersChanged: null,
    onMatchStart: null
  };
  function defaultSettings() {
    return { screenShake: true, damageNumbers: true, uiScale: "medium" };
  }
  var settings = defaultSettings();
  function setSettings(val) {
    settings = val;
  }
  var settingsOpenedMidRun = false;
  function setSettingsOpenedMidRun(val) {
    settingsOpenedMidRun = val;
  }
  var weaponChoiceOpen = false;
  function setWeaponChoiceOpen(val) {
    weaponChoiceOpen = val;
  }
  var mutationChoiceOpen = false;
  function setMutationChoiceOpen(val) {
    mutationChoiceOpen = val;
  }
  var shopOpen = false;
  function setShopOpen(val) {
    shopOpen = val;
  }
  var factoryOpen = false;
  function setFactoryOpen(val) {
    factoryOpen = val;
  }
  var inspectedStructure = null;
  function setInspectedStructure(val) {
    inspectedStructure = val;
  }
  var debugUnlocked = false;
  function setDebugUnlocked(val) {
    debugUnlocked = val;
  }
  var debugOpen = false;
  function setDebugOpen(val) {
    debugOpen = val;
  }
  var godMode = false;
  function setGodMode(val) {
    godMode = val;
  }
  var debugSpeedMultiplier = 1;
  function setDebugSpeedMultiplier(val) {
    debugSpeedMultiplier = val;
  }
  var fireZones = [];
  function setFireZones(val) {
    fireZones = val;
  }
  var toxicClouds = [];
  function setToxicClouds(val) {
    toxicClouds = val;
  }
  var teslaChains = [];
  function setTeslaChains(val) {
    teslaChains = val;
  }
  var sniperLasers = [];
  function setSniperLasers(val) {
    sniperLasers = val;
  }

  // src/utils.ts
  var elCache = {};
  function byId(id) {
    if (!elCache[id]) {
      const el = document.getElementById(id);
      if (el) elCache[id] = el;
      return el;
    }
    return elCache[id];
  }
  function rand(a, b) {
    return a + Math.random() * (b - a);
  }
  function dist(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  }
  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }
  function mouseWorldPos(mouse2, camera2) {
    return { x: mouse2.x + camera2.x, y: mouse2.y + camera2.y };
  }
  function gridCellCenter(wx, wy, tileSize) {
    return {
      x: (Math.floor(wx / tileSize) + 0.5) * tileSize,
      y: (Math.floor(wy / tileSize) + 0.5) * tileSize
    };
  }
  function snapAngleToCardinal(a) {
    return Math.round(a / (Math.PI / 2)) * (Math.PI / 2);
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }
  function mixHex(hexA, hexB, t) {
    const a = parseInt(hexA.slice(1), 16), b = parseInt(hexB.slice(1), 16);
    const ar = a >> 16 & 255, ag = a >> 8 & 255, ab = a & 255;
    const br = b >> 16 & 255, bg = b >> 8 & 255, bb = b & 255;
    const r = Math.round(ar + (br - ar) * t);
    const g2 = Math.round(ag + (bg - ag) * t);
    const bl = Math.round(ab + (bb - ab) * t);
    return `rgb(${r},${g2},${bl})`;
  }
  function roundRectPath(ctx2, x, y, w, h, r) {
    ctx2.beginPath();
    ctx2.moveTo(x + r, y);
    ctx2.arcTo(x + w, y, x + w, y + h, r);
    ctx2.arcTo(x + w, y + h, x, y + h, r);
    ctx2.arcTo(x, y + h, x, y, r);
    ctx2.arcTo(x, y, x + w, y, r);
    ctx2.closePath();
  }

  // src/systems/storage.ts
  async function loadMeta() {
    if (!hasStorage) return;
    try {
      const r = await window.storage.get("meta_progress", false);
      if (r && r.value) {
        const loaded = JSON.parse(r.value);
        const newMeta = Object.assign(defaultMeta(), loaded);
        newMeta.perm = Object.assign(defaultMeta().perm, loaded.perm || {});
        newMeta.startBonuses = Object.assign({}, loaded.startBonuses || {});
        setMeta(newMeta);
      }
    } catch (e) {
    }
  }
  async function saveMeta() {
    if (!hasStorage) return;
    try {
      await window.storage.set("meta_progress", JSON.stringify(meta), false);
    } catch (e) {
      console.error("meta save failed", e);
    }
  }
  async function loadLeaderboard() {
    if (!hasStorage) return [];
    try {
      const r = await window.storage.get("leaderboard_top10", true);
      if (r && r.value) return JSON.parse(r.value);
    } catch (e) {
    }
    return [];
  }
  async function submitScore(entry) {
    if (!hasStorage) return;
    try {
      let list = await loadLeaderboard();
      list.push(entry);
      list.sort((a, b) => b.wave - a.wave || b.kills - a.kills);
      list = list.slice(0, 10);
      await window.storage.set("leaderboard_top10", JSON.stringify(list), true);
    } catch (e) {
      console.error("leaderboard submit failed", e);
    }
  }
  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        setSettings(Object.assign(defaultSettings(), JSON.parse(raw)));
      }
    } catch (e) {
    }
    applyUiScale();
  }
  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
    }
  }
  function applyUiScale() {
    document.body.classList.remove("ui-scale-small", "ui-scale-medium", "ui-scale-large");
    document.body.classList.add("ui-scale-" + settings.uiScale);
  }

  // src/systems/input.ts
  function setupInputListeners(canvas2, onTryBuildOrUpgrade, onSelectBuild, onRenderBuildBar, onToggleDebugPanel) {
    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      keys[k] = true;
      if (k === "e") onTryBuildOrUpgrade();
      if (k === "1") onSelectBuild("wall");
      if (k === "2") onSelectBuild("spike");
      if (k === "3") onSelectBuild("cannon");
      if (k === "4") onSelectBuild("mortar");
      if (k === "5") onSelectBuild("sniper");
      if (k === "6") onSelectBuild("campfire");
      if (k === "7") onSelectBuild("shop");
      if (k === "8") onSelectBuild("factory");
      if (k === "r" && (selectedBuild === "wall" || selectedBuild === "spike")) {
        const base = manualBuildAngle !== null ? manualBuildAngle : snapAngleToCardinal(player.angle);
        setManualBuildAngle((base + Math.PI / 2) % (Math.PI * 2));
      }
      if (k === "escape") {
        if (selectedBuild) {
          setSelectedBuild(null);
          onRenderBuildBar();
        } else {
          onTryBuildOrUpgrade();
        }
      }
      if (k === "home") {
        e.preventDefault();
        onToggleDebugPanel();
      }
    });
    window.addEventListener("keyup", (e) => {
      keys[e.key.toLowerCase()] = false;
    });
    let rect = canvas2.getBoundingClientRect();
    const updateRect = () => {
      rect = canvas2.getBoundingClientRect();
    };
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, { passive: true });
    canvas2.addEventListener("mousemove", (e) => {
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });
    window.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });
    canvas2.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        if (selectedBuild) {
          onTryBuildOrUpgrade();
        } else {
          const mx = mouse.x + camera.x;
          const my = mouse.y + camera.y;
          let clickedStructure = null;
          for (const s of structures) {
            if (dist(mx, my, s.x, s.y) <= s.radius + 12) {
              clickedStructure = s;
              break;
            }
          }
          if (clickedStructure) {
            if (clickedStructure.type === "factory" || clickedStructure.type === "shop") {
              onTryBuildOrUpgrade();
            } else {
              setInspectedStructure(clickedStructure);
            }
            mouse.down = false;
          } else {
            setInspectedStructure(null);
            mouse.down = true;
          }
        }
      } else if (e.button === 2) {
        if (selectedBuild) {
          setSelectedBuild(null);
          onRenderBuildBar();
        }
      }
    });
    window.addEventListener("mouseup", (e) => {
      if (e.button === 0) {
        mouse.down = false;
      }
    });
  }

  // src/systems/touch.ts
  var leftTouchId = null;
  var rightTouchId = null;
  var leftCenter = { x: 0, y: 0 };
  var rightCenter = { x: 0, y: 0 };
  var JOYSTICK_RADIUS = 50;
  function setupTouchListeners(canvas2, onTryBuildOrUpgrade, onSelectBuild, onRenderBuildBar) {
    const overlay = byId("touchOverlay");
    if (!overlay) return;
    overlay.classList.add("hidden");
    let touchActivated = false;
    function activateTouch() {
      if (touchActivated) return;
      touchActivated = true;
      overlay.classList.remove("hidden");
      setIsTouchActive(true);
    }
    const btnShop = byId("touchBtnShop");
    if (btnShop) btnShop.onclick = (e) => {
      e.preventDefault();
      onTryBuildOrUpgrade();
    };
    const btnRotate = byId("touchBtnRotate");
    if (btnRotate) btnRotate.onclick = (e) => {
      e.preventDefault();
      if (selectedBuild === "wall" || selectedBuild === "spike") {
        const base = manualBuildAngle !== null ? manualBuildAngle : snapAngleToCardinal(player.angle);
        setManualBuildAngle((base + Math.PI / 2) % (Math.PI * 2));
      }
    };
    const btnCancel = byId("touchBtnCancel");
    if (btnCancel) btnCancel.onclick = (e) => {
      e.preventDefault();
      if (selectedBuild) {
        setSelectedBuild(null);
        onRenderBuildBar();
      }
    };
    const leftBase = byId("stickLeftBase");
    const leftKnob = byId("stickLeftKnob");
    const rightBase = byId("stickRightBase");
    const rightKnob = byId("stickRightKnob");
    function updateKnob(knob, dx, dy) {
      if (!knob) return;
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    }
    function handleTouchStart(e) {
      activateTouch();
      const target = e.target;
      const isInteractive = target && target.closest(".touch-btn, .build-slot, .gear-btn, .upgrade-btn, button, input");
      if (!isInteractive && e.cancelable) {
        e.preventDefault();
      }
      const halfWidth = window.innerWidth / 2;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const x = t.clientX, y = t.clientY;
        if (target && target.closest(".touch-btn, .build-slot, .gear-btn, .upgrade-btn, button, input")) continue;
        if (x < halfWidth && leftTouchId === null) {
          leftTouchId = t.identifier;
          leftCenter = { x, y };
          if (leftBase) {
            leftBase.style.left = `${x}px`;
            leftBase.style.top = `${y}px`;
            leftBase.classList.add("active");
          }
          touchMove.x = 0;
          touchMove.y = 0;
          updateKnob(leftKnob, 0, 0);
        } else if (x >= halfWidth && rightTouchId === null) {
          rightTouchId = t.identifier;
          rightCenter = { x, y };
          if (rightBase) {
            rightBase.style.left = `${x}px`;
            rightBase.style.top = `${y}px`;
            rightBase.classList.add("active");
          }
          mouse.down = true;
          touchAim.x = 0;
          touchAim.y = 0;
          updateKnob(rightKnob, 0, 0);
        }
      }
    }
    function handleTouchMove(e) {
      if (e.cancelable) e.preventDefault();
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        if (t.identifier === leftTouchId) {
          let dx = t.clientX - leftCenter.x;
          let dy = t.clientY - leftCenter.y;
          const d = Math.hypot(dx, dy);
          if (d > JOYSTICK_RADIUS) {
            dx = dx / d * JOYSTICK_RADIUS;
            dy = dy / d * JOYSTICK_RADIUS;
          }
          touchMove.x = dx / JOYSTICK_RADIUS;
          touchMove.y = dy / JOYSTICK_RADIUS;
          updateKnob(leftKnob, dx, dy);
        } else if (t.identifier === rightTouchId) {
          let dx = t.clientX - rightCenter.x;
          let dy = t.clientY - rightCenter.y;
          const d = Math.hypot(dx, dy);
          if (d > JOYSTICK_RADIUS) {
            dx = dx / d * JOYSTICK_RADIUS;
            dy = dy / d * JOYSTICK_RADIUS;
          }
          if (d > 5) {
            touchAim.x = dx / (d || 1);
            touchAim.y = dy / (d || 1);
            mouse.down = true;
          }
          updateKnob(rightKnob, dx, dy);
        }
      }
    }
    function handleTouchEnd(e) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === leftTouchId) {
          leftTouchId = null;
          touchMove.x = 0;
          touchMove.y = 0;
          if (leftBase) leftBase.classList.remove("active");
          updateKnob(leftKnob, 0, 0);
        } else if (t.identifier === rightTouchId) {
          rightTouchId = null;
          touchAim.x = 0;
          touchAim.y = 0;
          mouse.down = false;
          if (rightBase) rightBase.classList.remove("active");
          updateKnob(rightKnob, 0, 0);
        }
      }
    }
    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);
    const preventZoom = (e) => {
      if (e.cancelable) e.preventDefault();
    };
    window.addEventListener("gesturestart", preventZoom, { passive: false });
    window.addEventListener("gesturechange", preventZoom, { passive: false });
    window.addEventListener("gestureend", preventZoom, { passive: false });
  }

  // src/systems/codex.ts
  var CODEX_KEY = "nightfalls_codex_data_v1";
  var codex = {
    encountered: {
      normal: false,
      scout: false,
      brute: false,
      spitter: false,
      exploder: false,
      wolf: false,
      boss: false,
      spider: false,
      witch: false
    },
    firstKilled: {
      normal: "",
      scout: "",
      brute: "",
      spitter: "",
      exploder: "",
      wolf: "",
      boss: "",
      spider: "",
      witch: ""
    }
  };
  function loadCodex() {
    try {
      const raw = localStorage.getItem(CODEX_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.encountered) Object.assign(codex.encountered, parsed.encountered);
        if (parsed.firstKilled) Object.assign(codex.firstKilled, parsed.firstKilled);
      }
    } catch (err) {
      console.error("Failed to load bestiary codex data:", err);
    }
  }
  function saveCodex() {
    try {
      localStorage.setItem(CODEX_KEY, JSON.stringify(codex));
    } catch (err) {
      console.error("Failed to save bestiary codex data:", err);
    }
  }
  function registerEncounter(type) {
    if (codex.encountered[type] === void 0) return;
    if (!codex.encountered[type]) {
      codex.encountered[type] = true;
      saveCodex();
    }
  }
  function registerKill(type) {
    if (codex.firstKilled[type] === void 0) return;
    registerEncounter(type);
    if (!codex.firstKilled[type]) {
      const dateStr = (/* @__PURE__ */ new Date()).toLocaleDateString(void 0, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
      codex.firstKilled[type] = dateStr;
      saveCodex();
    }
  }

  // src/systems/combat.ts
  var bannerTimeout;
  function showBanner(title, sub, mode) {
    const el = document.getElementById("waveBanner");
    if (!el) return;
    el.innerHTML = title + "<span>" + sub + "</span>";
    el.classList.toggle("boss", mode === "boss");
    el.classList.toggle("night", mode === "night");
    el.classList.toggle("power", mode === "power");
    el.classList.toggle("blood", mode === "blood");
    el.classList.add("show");
    clearTimeout(bannerTimeout);
    bannerTimeout = setTimeout(() => el.classList.remove("show"), 2800);
  }
  function awardPoints(amount) {
    player.points += Math.round(amount * player.fortuneMul);
  }
  function maybeDropPowerup(x, y, guaranteed) {
    if (!guaranteed && Math.random() > 0.055) return;
    const kinds = Object.keys(POWERUP_DEFS);
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    powerups.push({ x, y, radius: 15, kind, spawnTime: performance.now() });
  }
  function applyPowerup(kind) {
    const def = POWERUP_DEFS[kind];
    const now = performance.now();
    if (kind === "nuke") {
      let killed = 0;
      for (const z of zombies) {
        if (z.type === "boss") {
          z.hp -= z.maxHp * 0.4;
          z.flash = now;
          if (z.hp <= 0) zombieDied(z);
        } else {
          z.hp = 0;
          zombieDied(z);
          killed++;
        }
      }
      showBanner("NUKE!", killed + " zombies vaporized", "power");
      triggerShake(16, 300);
    } else if (kind === "insta") {
      player.instaKillUntil = now + (def.duration || 0);
      showBanner("INSTA-KILL", "weapons overcharged", "power");
    } else if (kind === "double") {
      player.doubleXpUntil = now + (def.duration || 0);
      showBanner("DOUBLE XP", "xp x2 active", "power");
    } else if (kind === "heal") {
      player.hp = player.maxHp;
      showBanner("FULL HEAL", "wounds patched up", "power");
      spawnBurst(player.x, player.y, "#8bd17c", 16);
    }
  }
  function speedBoostMul() {
    return performance.now() < player.speedBoostUntil ? 1.35 : 1;
  }
  function damageBoostMul() {
    return performance.now() < player.damageBoostUntil ? 1.5 : 1;
  }
  function fireRateBoostMul() {
    return performance.now() < player.fireRateBoostUntil ? 1.4 : 1;
  }
  function regenBoostMul() {
    return performance.now() < player.regenBoostUntil ? 3 : 1;
  }
  function weaponSpeedMul(mouseDown) {
    return player.weapon === "machinegun" && mouseDown ? WEAPON_DEFS.machinegun.moveSpeedMulWhileFiring || 1 : 1;
  }
  function mutationSpeedMul() {
    if (player.mutation === "vampire") return 1.25;
    if (player.mutation === "titan") return 0.85;
    return 1;
  }
  function mutationFireRateMul() {
    return player.mutation === "overclocked" ? 1.5 : 1;
  }
  function spawnParticle(x, y, text, color) {
    particles.push({ x, y, text, color, life: 900, maxLife: 900, vy: -0.9 });
  }
  function spawnDamageNumber(x, y, amount, color) {
    if (!settings.damageNumbers) return;
    spawnParticle(x, y, "-" + Math.round(amount), color);
  }
  function spawnBurst(x, y, color, count, shape) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(1, 3.5);
      bursts.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 400,
        maxLife: 400,
        color,
        radius: rand(2, 4),
        shape: shape || "circle",
        rot: a
      });
    }
  }
  function spawnCasing(x, y, angle) {
    const perp = angle + Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1);
    bursts.push({
      x,
      y,
      vx: Math.cos(perp) * rand(1.5, 3),
      vy: Math.sin(perp) * rand(1.5, 3) - 1,
      life: 550,
      maxLife: 550,
      color: "#d4af37",
      radius: 3,
      shape: "casing",
      rot: angle + rand(-0.5, 0.5)
    });
  }
  function spawnBlood(x, y, size) {
    bloodDecals.push({ x, y, r: size * rand(0.7, 1.2), rot: rand(0, Math.PI * 2), alpha: rand(0.35, 0.55) });
    if (bloodDecals.length > 160) bloodDecals.shift();
  }
  function triggerShake(mag, time) {
    if (!settings.screenShake) return;
    if (mag > shake.mag) {
      shake.mag = mag;
      shake.time = time;
    }
  }
  var xpCallbacks = {
    onWeaponChoice: () => {
    },
    onMutationChoice: () => {
    },
    onUpgradePanel: () => {
    }
  };
  function setXpCallbacks(callbacks) {
    xpCallbacks = callbacks;
  }
  function tryShoot(now) {
    if (!player.alive) return;
    if (selectedBuild) return;
    if (player.mutation === "overclocked" && now < player.overheatedUntil) return;
    const wdef = WEAPON_DEFS[player.weapon];
    const fireRateMul = wdef.fireRateMul * fireRateBoostMul() * mutationFireRateMul();
    if (now - player.lastShot < 1e3 / (player.fireRate * fireRateMul)) return;
    player.lastShot = now;
    if (player.mutation === "overclocked") {
      player.heat += OVERHEAT_PER_SHOT;
      if (player.heat >= OVERHEAT_MAX) {
        player.heat = 0;
        player.overheatedUntil = now + OVERHEAT_LOCKOUT_MS;
        showBanner("OVERHEATED", "weapon cooling down...", "power");
      }
    }
    const insta = now < player.instaKillUntil;
    const dmg = insta ? Math.max(player.damage, 500) : player.damage * damageBoostMul() * wdef.damageMul;
    const speed = player.bulletSpeed * (wdef.bulletSpeedMul || 1);
    const life = 1400 * (wdef.bulletLifeMul || 1);
    const willBurn = player.mutation === "pyromaniac" && Math.random() < BURN_CHANCE;
    function spawnPlayerBullet(angle, originOffset) {
      const perpX = Math.cos(angle + Math.PI / 2), perpY = Math.sin(angle + Math.PI / 2);
      const b = {
        x: player.x + Math.cos(angle) * (player.radius + 32) + perpX * originOffset,
        y: player.y + Math.sin(angle) * (player.radius + 32) + perpY * originOffset,
        vx: Math.cos(angle) * speed + player.vx * 0.3,
        vy: Math.sin(angle) * speed + player.vy * 0.3,
        radius: player.bulletRadius,
        damage: dmg,
        life,
        owner: "player",
        insta
      };
      if (wdef.explosive) {
        b.explosive = true;
        b.explodeRadius = wdef.explodeRadius;
      }
      if (willBurn) {
        b.burn = true;
      }
      bullets.push(b);
    }
    if (player.weapon === "dualguns") {
      spawnPlayerBullet(player.angle, -9);
      spawnPlayerBullet(player.angle, 9);
    } else if (player.weapon === "shotgun") {
      const spread = wdef.spreadRad || 0.2;
      spawnPlayerBullet(player.angle - spread, 0);
      spawnPlayerBullet(player.angle, 0);
      spawnPlayerBullet(player.angle + spread, 0);
    } else {
      spawnPlayerBullet(player.angle, 0);
    }
    spawnCasing(
      player.x + Math.cos(player.angle) * (player.radius + 10) - Math.sin(player.angle) * 4,
      player.y + Math.sin(player.angle) * (player.radius + 10) + Math.cos(player.angle) * 4,
      player.angle
    );
  }
  function gainXp(amount) {
    const mul = performance.now() < player.doubleXpUntil ? 2 : 1;
    player.xp += amount * mul;
    while (player.xp >= player.xpToNext) {
      player.xp -= player.xpToNext;
      player.level++;
      player.statPoints++;
      player.xpToNext = Math.floor(player.xpToNext * 1.32);
      player.maxHp += 8;
      player.hp = Math.min(player.maxHp, player.hp + 8);
      spawnParticle(player.x, player.y - 40, "LEVEL UP", "#4ecdc4");
    }
    if (player.level >= 15 && !player.weaponChosen) {
      xpCallbacks.onWeaponChoice();
    }
    if (player.level >= 25 && !player.mutationChosen) {
      xpCallbacks.onMutationChoice();
    }
    xpCallbacks.onUpgradePanel();
  }
  function zombieDied(z) {
    if (z.dead) return;
    z.dead = true;
    player.kills++;
    registerKill(z.type);
    spawnBurst(z.x, z.y, ZTYPE[z.type].color, z.type === "boss" ? 40 : 10);
    spawnBlood(z.x, z.y, z.radius);
    awardPoints(POINTS_BY_TYPE[z.type] || 10);
    maybeDropPowerup(z.x, z.y, z.type === "boss");
    let goldDrop = 0;
    if (z.type === "boss") {
      goldDrop = 4 + Math.floor(Math.random() * 4);
    } else if (z.type === "brute" || z.type === "witch" || z.type === "exploder" || z.type === "spitter") {
      if (Math.random() < 0.45) goldDrop = 1 + (Math.random() < 0.3 ? 1 : 0);
    } else {
      if (Math.random() < 0.2) goldDrop = 1;
    }
    if (goldDrop > 0) {
      player.gold += goldDrop;
      spawnParticle(z.x, z.y - 25, "+" + goldDrop + " gold", "#ffd76a");
    }
    if (z.type === "boss") {
      gainXp(200 + wave * 10);
      setActiveBoss(null);
      const bossBar = document.getElementById("bossBar");
      if (bossBar) bossBar.classList.remove("show");
      spawnParticle(z.x, z.y - 40, "BOSS DEFEATED", "#c084fc");
      triggerShake(14, 300);
    } else {
      gainXp(10 + wave * 2);
    }
  }

  // src/systems/wave.ts
  function generateWorld() {
    const newResources = [];
    const newDecor = [];
    const newTerrainPatches = [];
    const newFireflies = [];
    const safeZone = 260;
    for (let i = 0; i < 140; i++) {
      let x, y;
      do {
        x = rand(80, WORLD_W - 80);
        y = rand(80, WORLD_H - 80);
      } while (dist(x, y, WORLD_W / 2, WORLD_H / 2) < safeZone);
      newResources.push({ type: "tree", x, y, radius: 19, hp: 30, maxHp: 30 });
    }
    for (let i = 0; i < 70; i++) {
      let x, y;
      do {
        x = rand(80, WORLD_W - 80);
        y = rand(80, WORLD_H - 80);
      } while (dist(x, y, WORLD_W / 2, WORLD_H / 2) < safeZone);
      newResources.push({ type: "rock", x, y, radius: 21, hp: 50, maxHp: 50 });
    }
    for (let i = 0; i < 45; i++) {
      let x, y;
      do {
        x = rand(80, WORLD_W - 80);
        y = rand(80, WORLD_H - 80);
      } while (dist(x, y, WORLD_W / 2, WORLD_H / 2) < safeZone);
      newResources.push({ type: "iron", x, y, radius: 23, hp: 110, maxHp: 110 });
    }
    for (let i = 0; i < 260; i++) {
      newDecor.push({ x: rand(0, WORLD_W), y: rand(0, WORLD_H), a: rand(0, Math.PI * 2), s: rand(0.7, 1.3) });
    }
    for (let i = 0; i < 55; i++) {
      newTerrainPatches.push({ x: rand(0, WORLD_W), y: rand(0, WORLD_H), r: rand(60, 160), dark: Math.random() < 0.6 });
    }
    for (let i = 0; i < 50; i++) {
      newFireflies.push({ x: rand(0, WORLD_W), y: rand(0, WORLD_H), phase: rand(0, Math.PI * 2), speed: rand(8e-4, 16e-4) });
    }
    setResources(newResources);
    setDecor(newDecor);
    setTerrainPatches(newTerrainPatches);
    setFireflies(newFireflies);
  }
  function maybeSpawnCrate() {
    if (Math.random() > 0.55) return;
    const angle = rand(0, Math.PI * 2), d = rand(300, 1e3);
    const x = clamp(player.x + Math.cos(angle) * d, 60, WORLD_W - 60);
    const y = clamp(player.y + Math.sin(angle) * d, 60, WORLD_H - 60);
    crates.push({ x, y, radius: 16 });
  }
  function startWave(n) {
    setWave(n);
    setIsBossWave(n % 10 === 0);
    setSpawnTimer(0);
    setActiveBoss(null);
    if (n % 10 === 0) {
      setZombiesToSpawn(6);
      setWaveState("spawning-boss");
      showBanner(`BOSS WAVE ${n}`, "Something big is coming...", "boss");
    } else {
      setZombiesToSpawn(4 + n * 3);
      setWaveState("spawning");
      showBanner(`WAVE ${n}`, "Zombies incoming");
    }
    maybeSpawnCrate();
  }
  function pickZombieType() {
    if (wave < 3) return "normal";
    if (wave < 5) return Math.random() < 0.3 ? "scout" : "normal";
    if (wave < 7) {
      const r = Math.random();
      if (r < 0.38) return "normal";
      if (r < 0.62) return "scout";
      if (r < 0.8) return "brute";
      if (r < 0.92) return "spitter";
      return "wolf";
    }
    const pool = [
      { type: "normal", weight: 100 }
    ];
    if (wave >= 2) pool.push({ type: "scout", weight: 65 });
    if (wave >= 3) pool.push({ type: "brute", weight: 40 });
    if (wave >= 4) pool.push({ type: "wolf", weight: 45 });
    if (wave >= 5) pool.push({ type: "spitter", weight: 35 });
    if (wave >= 6) pool.push({ type: "exploder", weight: 30 });
    if (wave >= 8) pool.push({ type: "spider", weight: 25 });
    if (wave >= 10) pool.push({ type: "witch", weight: 15 });
    const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const item of pool) {
      if (roll < item.weight) return item.type;
      roll -= item.weight;
    }
    return "normal";
  }
  var nextZombieId = 1;
  function resetZombieId() {
    nextZombieId = 1;
  }
  function spawnZombie(forceType, atX, atY) {
    const type = forceType || pickZombieType();
    let x, y;
    if (atX !== void 0 && atY !== void 0) {
      x = atX;
      y = atY;
    } else {
      const angle = rand(0, Math.PI * 2);
      const d = rand(900, 1300);
      x = clamp(player.x + Math.cos(angle) * d, 40, WORLD_W - 40);
      y = clamp(player.y + Math.sin(angle) * d, 40, WORLD_H - 40);
    }
    const def = ZTYPE[type];
    const hpScale = 1 + (wave - 1) * 0.32;
    const speedScale = Math.min(1 + (wave - 1) * 0.045, 1.9);
    const bloodMul = bloodMoon.active ? 1.3 : 1;
    const hp0 = Math.round(24 * hpScale * def.hpMul * bloodMul);
    const usesVariant = type === "normal" || type === "scout";
    const variant = usesVariant ? SKIN_VARIANTS[Math.floor(rand(0, SKIN_VARIANTS.length))] : [def.color, def.color2, def.dark];
    const cloth = type === "boss" || type === "wolf" ? null : CLOTH_COLORS[Math.floor(rand(0, CLOTH_COLORS.length))];
    let armorVal = 0;
    if (type === "spider") armorVal = 2;
    else if (type === "spitter") armorVal = 3;
    else if (type === "exploder") armorVal = 4;
    else if (type === "witch") armorVal = 6;
    else if (type === "brute") armorVal = 12;
    else if (type === "boss") armorVal = 24;
    const z = {
      id: nextZombieId++,
      type,
      x,
      y,
      radius: rand(def.radiusR[0], def.radiusR[1]),
      hp: hp0,
      maxHp: hp0,
      speed: 1.15 * speedScale * def.speedMul,
      damage: (7 + wave * 0.6) * def.dmgMul * bloodMul,
      hitCooldown: 0,
      wobble: rand(0, Math.PI * 2),
      flash: 0,
      lastShot: 0,
      fuseStart: null,
      hairKind: type === "boss" || type === "exploder" || type === "wolf" ? null : ["bald", "hood", "tuft"][Math.floor(rand(0, 3))],
      mouthKind: ["open", "frown", "grimace"][Math.floor(rand(0, 3))],
      squishX: rand(0.92, 1.08),
      squishY: rand(0.92, 1.08),
      skinColor: variant[0],
      skinColor2: variant[1],
      skinDark: variant[2],
      clothColor: cloth,
      armor: armorVal
    };
    z.maxHp = z.hp;
    if (type === "spitter") {
      z.projDamage = (6 + wave * 0.7) * bloodMul;
    }
    if (type === "exploder") {
      z.explodeDamage = (16 + wave * 1.4) * bloodMul;
    }
    if (type === "boss") {
      z.radius = 92;
      z.hp = Math.round((420 + wave / 10 * 260) * bloodMul);
      z.maxHp = z.hp;
      z.speed = 0.95;
      z.damage = (22 + wave * 1.1) * bloodMul;
      setActiveBoss(z);
      byId("bossBar").classList.add("show");
      byId("bossName").textContent = "BOSS \xB7 WAVE " + wave;
    }
    zombies.push(z);
    registerEncounter(type);
    if (type === "wolf" && atX === void 0) {
      const packSize = Math.floor(rand(1, 3));
      for (let i = 0; i < packSize; i++) {
        const offAngle = rand(0, Math.PI * 2), offD = rand(35, 80);
        spawnZombie("wolf", clamp(x + Math.cos(offAngle) * offD, 40, WORLD_W - 40), clamp(y + Math.sin(offAngle) * offD, 40, WORLD_H - 40));
      }
    }
  }
  function updateBloodMoon() {
    const now = performance.now();
    if (bloodMoon.active) {
      if (now >= bloodMoon.endsAt) {
        bloodMoon.active = false;
        bloodMoon.nextAt = now + rand(BLOOD_MOON_MIN_GAP_MS, BLOOD_MOON_MAX_GAP_MS);
        showBanner("BLOOD MOON FADES", "The red sky clears...", "blood");
      }
    } else if (now >= bloodMoon.nextAt) {
      bloodMoon.active = true;
      bloodMoon.endsAt = now + BLOOD_MOON_DURATION_MS;
      showBanner("BLOOD MOON RISING", "Zombies spawn faster and hit harder...", "blood");
    }
  }
  function updateDayNight(dt) {
    dayNight.time = (dayNight.time + dt) % dayNight.total;
    const frac = dayNight.time / dayNight.total;
    dayNight.factor = (1 - Math.cos(frac * Math.PI * 2)) / 2;
    const wasNight = dayNight.isNight;
    dayNight.isNight = dayNight.factor > 0.5;
    if (dayNight.isNight !== wasNight) {
      if (dayNight.isNight) showBanner("NIGHTFALL", "Zombies grow bolder and faster...", "night");
      else showBanner("DAYBREAK", "A short reprieve...");
    }
    let timeLeftSec = 0;
    if (dayNight.isNight) {
      timeLeftSec = Math.max(0, Math.ceil((82500 - dayNight.time) / 1e3));
    } else {
      if (dayNight.time < 27500) {
        timeLeftSec = Math.max(0, Math.ceil((27500 - dayNight.time) / 1e3));
      } else {
        timeLeftSec = Math.max(0, Math.ceil((dayNight.total - dayNight.time + 27500) / 1e3));
      }
    }
    const label = byId("phaseLabel");
    if (bloodMoon.active) {
      const bmRemaining = Math.max(0, Math.ceil((bloodMoon.endsAt - performance.now()) / 1e3));
      label.textContent = `BLOOD MOON | ${bmRemaining}s`;
      label.className = "pill hud-font blood";
    } else if (dayNight.isNight) {
      label.textContent = `NIGHT | ${timeLeftSec}s`;
      label.className = "pill hud-font night";
    } else {
      label.textContent = `DAY | ${timeLeftSec}s`;
      label.className = "pill hud-font day";
    }
    if (dayNight.factor > 0.55) {
      dayNight.nightSpawnTimer -= dt;
      if (dayNight.nightSpawnTimer <= 0 && zombies.length < 45) {
        spawnZombie(Math.random() < 0.7 ? "normal" : "scout");
        dayNight.nightSpawnTimer = rand(4500, 8e3);
      }
    } else {
      dayNight.nightSpawnTimer = rand(4500, 8e3);
    }
  }
  function updateWaves(dt) {
    if (waveState === "idle") {
      startWave(1);
    } else if (waveState === "spawning" || waveState === "spawning-boss") {
      setSpawnTimer(spawnTimer - dt);
      if (spawnTimer <= 0 && zombiesToSpawn > 0) {
        if (waveState === "spawning-boss" && zombiesToSpawn === 1) {
          spawnZombie("boss");
        } else {
          spawnZombie();
        }
        setZombiesToSpawn(zombiesToSpawn - 1);
        setSpawnTimer((isBossWave ? 500 : 650) / (bloodMoon.active ? 5 : 1));
      }
      if (zombiesToSpawn <= 0) setWaveState("active");
    } else if (waveState === "active") {
      if (activeBoss) {
        byId("bossFill").style.width = Math.max(0, activeBoss.hp / activeBoss.maxHp * 100) + "%";
      }
      if (zombies.length === 0) {
        setWaveState("cleared");
        setWaveClearedAt(performance.now());
        const bonus = isBossWave ? 150 : 40;
        gainXp(bonus);
        byId("bossBar").classList.remove("show");
        showBanner(`WAVE ${wave} CLEARED`, "+" + bonus + " bonus xp \xB7 next wave incoming...");
      }
    } else if (waveState === "cleared") {
      if (performance.now() - waveClearedAt > nextWaveDelay) {
        startWave(wave + 1);
      }
    }
  }

  // src/systems/update.ts
  function nightMul(dayNightFactor) {
    return 1 + dayNightFactor * 0.3;
  }
  function nightDmgMul(dayNightFactor) {
    return 1 + dayNightFactor * 0.2;
  }
  function findNearestShop(range) {
    let best = null, bd = Infinity;
    for (const s of structures) {
      if (s.type !== "shop") continue;
      const d = dist(player.x, player.y, s.x, s.y);
      if (d < range && d < bd) {
        best = s;
        bd = d;
      }
    }
    return best;
  }
  function findNearestFactory(range) {
    let best = null, bd = Infinity;
    for (const s of structures) {
      if (s.type !== "factory") continue;
      const d = dist(player.x, player.y, s.x, s.y);
      if (d < range && d < bd) {
        best = s;
        bd = d;
      }
    }
    return best;
  }
  function checkDeath(onKillPlayer) {
    if (player.hp > 0) return;
    if (player.secondChance) {
      player.secondChance = false;
      player.hp = Math.round(player.maxHp * 0.5);
      showBanner("SECOND CHANCE", "you're not done yet...", "power");
      triggerShake(10, 200);
    } else {
      player.hp = 0;
      onKillPlayer();
    }
  }
  async function killPlayer() {
    player.alive = false;
    setRunning(false);
    byId("finalWave").textContent = String(wave);
    byId("finalKills").textContent = String(player.kills);
    byId("finalLevel").textContent = String(player.level);
    const earned = wave * 5 + player.kills + player.level * 2;
    meta.metaPoints += earned;
    meta.lifetimeKills += player.kills;
    meta.bestWave = Math.max(meta.bestWave, wave);
    meta.gamesPlayed += 1;
    meta.name = playerName;
    byId("metaEarned").textContent = "+" + earned + " meta points earned";
    await saveMeta();
    await submitScore({ name: playerName, wave, kills: player.kills, level: player.level, ts: Date.now() });
    const overlay = byId("overlay");
    overlay.classList.remove("hidden");
    const restartBtn = byId("restartBtn");
    if (restartBtn) {
      restartBtn.disabled = true;
      setTimeout(() => {
        restartBtn.disabled = false;
      }, 400);
    }
  }
  function updatePlayer(dt, camera2) {
    if (!player.alive) return;
    let ax = 0, ay = 0;
    if (keys["w"]) ay -= 1;
    if (keys["s"]) ay += 1;
    if (keys["a"]) ax -= 1;
    if (keys["d"]) ax += 1;
    if (touchMove.x !== 0 || touchMove.y !== 0) {
      ax = touchMove.x;
      ay = touchMove.y;
    } else {
      const len = Math.hypot(ax, ay);
      if (len > 0) {
        ax /= len;
        ay /= len;
      }
    }
    const slowMul = player.slowedUntil && performance.now() < player.slowedUntil ? 0.55 : 1;
    const maxSpd = player.maxSpeed * speedBoostMul() * weaponSpeedMul(mouse.down) * mutationSpeedMul() * slowMul;
    const accel = maxSpd * (1 - player.friction) / player.friction * (player.accel / BASE_STATS.accel);
    player.vx += ax * accel;
    player.vy += ay * accel;
    player.vx *= player.friction;
    player.vy *= player.friction;
    const sp = Math.hypot(player.vx, player.vy);
    if (sp > maxSpd) {
      player.vx = player.vx / sp * maxSpd;
      player.vy = player.vy / sp * maxSpd;
    }
    player.x = clamp(player.x + player.vx, player.radius, WORLD_W - player.radius);
    player.y = clamp(player.y + player.vy, player.radius, WORLD_H - player.radius);
    if (touchAim.x !== 0 || touchAim.y !== 0) {
      player.angle = Math.atan2(touchAim.y, touchAim.x);
    } else {
      const mWorld = mouseWorldPos(mouse, camera2);
      player.angle = Math.atan2(mWorld.y - player.y, mWorld.x - player.x);
    }
    if (mouse.down) tryShoot(performance.now());
    if (player.mutation === "overclocked" && player.heat > 0) {
      player.heat = Math.max(0, player.heat - OVERHEAT_DECAY_PER_SEC * dt / 1e3);
    }
    player.hp = Math.min(player.maxHp, player.hp + player.regen * regenBoostMul() * dt);
    for (const r of resources) {
      const d = dist(player.x, player.y, r.x, r.y);
      const minD = player.radius + r.radius;
      if (d < minD) {
        const overlap = minD - d;
        const angle = d > 1e-3 ? Math.atan2(player.y - r.y, player.x - r.x) : Math.random() * Math.PI * 2;
        player.x += Math.cos(angle) * overlap * 0.5;
        player.y += Math.sin(angle) * overlap * 0.5;
      }
    }
    for (const s of structures) {
      const d = dist(player.x, player.y, s.x, s.y);
      const minD = player.radius + s.radius;
      if (d < minD) {
        const overlap = minD - d;
        const angle = d > 1e-3 ? Math.atan2(player.y - s.y, player.x - s.x) : Math.random() * Math.PI * 2;
        player.x += Math.cos(angle) * overlap * 0.5;
        player.y += Math.sin(angle) * overlap * 0.5;
      }
    }
    for (const c of crates) {
      if (dist(player.x, player.y, c.x, c.y) < player.radius + c.radius) {
        c.dead = true;
        const roll = Math.random();
        if (roll < 0.4) {
          const amt = Math.round((15 + Math.random() * 10) * (player.resourceMul || 1));
          player.wood += amt;
          spawnParticle(c.x, c.y, "+" + amt + " wood", "#c98b4a");
        } else if (roll < 0.75) {
          const amt = Math.round((10 + Math.random() * 8) * (player.resourceMul || 1));
          player.stone += amt;
          spawnParticle(c.x, c.y, "+" + amt + " stone", "#9aa7ac");
        } else {
          const amt = 25;
          player.hp = Math.min(player.maxHp, player.hp + amt);
          spawnParticle(c.x, c.y, "+" + amt + " hp", "#8bd17c");
        }
        if (Math.random() < 0.35) {
          const ironAmt = Math.round((2 + Math.floor(Math.random() * 4)) * (player.resourceMul || 1));
          player.iron += ironAmt;
          setTimeout(() => spawnParticle(c.x, c.y - 15, "+" + ironAmt + " iron", "#708090"), 150);
        }
        if (Math.random() < 0.15) {
          const goldAmt = Math.round((1 + Math.floor(Math.random() * 2)) * (player.resourceMul || 1));
          player.gold += goldAmt;
          setTimeout(() => spawnParticle(c.x, c.y - 30, "+" + goldAmt + " gold", "#ffd76a"), 300);
        }
        spawnBurst(c.x, c.y, "#ffd76a", 8);
      }
    }
    setCrates(crates.filter((c) => !c.dead));
    const powerupNow = performance.now();
    for (const p of powerups) {
      if (dist(player.x, player.y, p.x, p.y) < player.radius + p.radius) {
        p.dead = true;
        applyPowerup(p.kind);
      } else if (powerupNow - p.spawnTime > POWERUP_LIFETIME_MS) {
        p.dead = true;
      }
    }
    setPowerups(powerups.filter((p) => !p.dead));
  }
  function explodeBullet(b) {
    const radius = b.explodeRadius || 90;
    for (const z of zombies) {
      const d = dist(b.x, b.y, z.x, z.y);
      if (d < radius + z.radius) {
        let dealt = b.damage;
        if (b.isMortar && b.mortarLevel && b.mortarLevel >= 3 && d < 55) {
          dealt *= b.mortarLevel === 3 ? 1.4 : 1.8;
        } else {
          const falloff = 1 - d / (radius + z.radius) * 0.4;
          dealt *= falloff;
        }
        const vuln = 1 + (z.dmgVulnerability || 0);
        const physVuln = 1 + (z.physVulnerability || 0);
        let finalDmg = dealt * vuln;
        if (b.owner === "player" || b.owner === "turret") {
          finalDmg *= physVuln;
        }
        const reducedArmor = Math.max(0, z.armor - (z.armorReduction || 0));
        const armorPen = b.armorPenetration ? reducedArmor * b.armorPenetration : 0;
        const netArmor = Math.max(0, reducedArmor - armorPen);
        finalDmg = Math.max(1, finalDmg - netArmor);
        z.hp -= finalDmg;
        z.flash = performance.now();
        if (b.owner === "player" && player.mutation === "vampire") {
          player.hp = Math.min(player.maxHp, player.hp + finalDmg * 0.02);
        }
        if (z.hp <= 0) zombieDied(z);
        else spawnBlood(z.x, z.y, z.radius * 0.4);
      }
    }
    if (b.isMortar && b.mortarLevel === 5) {
      fireZones.push({
        x: b.x,
        y: b.y,
        radius: 90,
        damagePerSec: 30,
        endsAt: performance.now() + 3e3
      });
    }
    if (b.isToxic) {
      toxicClouds.push({
        x: b.x,
        y: b.y,
        radius: b.toxicRadius || 150,
        damagePerSec: b.toxicDmg || 10,
        armorReduction: b.armorReduction || 5,
        dmgVulnerability: b.dmgVulnerability || 0,
        endsAt: performance.now() + 4e3
      });
    }
    spawnBurst(b.x, b.y, b.isToxic ? "#59b37a" : "#ffb347", b.isToxic ? 14 : 26);
    triggerShake(b.isToxic ? 4 : 10, 220);
  }
  function updateBullets(dt) {
    bullets.forEach((b) => {
      b.x += b.vx;
      b.y += b.vy;
      b.life -= dt;
    });
    setBullets(bullets.filter((b) => b.life > 0 && b.x > 0 && b.x < WORLD_W && b.y > 0 && b.y < WORLD_H));
    for (const b of bullets) {
      if (b.owner === "zombie") {
        for (const s of structures) {
          if (dist(b.x, b.y, s.x, s.y) < b.radius + s.radius) {
            b.dead = true;
            break;
          }
        }
        if (b.dead) continue;
        if (player.alive && dist(b.x, b.y, player.x, player.y) < b.radius + player.radius) {
          if (!godMode) player.hp -= b.damage;
          spawnDamageNumber(player.x, player.y - 30, b.damage, b.slowProj ? "#bbd8f2" : "#8be36b");
          if (b.slowProj) {
            player.slowedUntil = performance.now() + 3e3;
            spawnParticle(player.x, player.y - 45, "SLOWED", "#5b9ad6");
          }
          triggerShake(4, 100);
          b.dead = true;
          checkDeath(killPlayer);
        }
        continue;
      }
      for (const z of zombies) {
        if (b.dead) break;
        if (dist(b.x, b.y, z.x, z.y) < b.radius + z.radius) {
          if (b.explosive) {
            explodeBullet(b);
          } else {
            const vuln = 1 + (z.dmgVulnerability || 0);
            const physVuln = 1 + (z.physVulnerability || 0);
            let finalDmg = b.damage * vuln;
            if (b.owner === "player" || b.owner === "turret") {
              finalDmg *= physVuln;
            }
            const reducedArmor = Math.max(0, z.armor - (z.armorReduction || 0));
            const armorPen = b.armorPenetration ? reducedArmor * b.armorPenetration : 0;
            const netArmor = Math.max(0, reducedArmor - armorPen);
            finalDmg = Math.max(1, finalDmg - netArmor);
            z.hp -= finalDmg;
            z.flash = performance.now();
            spawnDamageNumber(z.x, z.y - 20, Math.round(finalDmg), b.owner === "turret" ? "#f08080" : "#ff8080");
            if (b.owner === "turret" && b.armorPenetration === 0.5) {
              const pushDir = Math.atan2(z.y - b.y, z.x - b.x);
              z.x = clamp(z.x + Math.cos(pushDir) * 16, z.radius, WORLD_W - z.radius);
              z.y = clamp(z.y + Math.sin(pushDir) * 16, z.radius, WORLD_H - z.radius);
            }
            if (b.owner === "player" && player.mutation === "vampire") {
              player.hp = Math.min(player.maxHp, player.hp + finalDmg * 0.02);
            }
            if (b.owner === "player" && b.burn) {
              z.burnUntil = performance.now() + BURN_DURATION_MS;
              z.burnDamagePerSec = b.damage * BURN_DAMAGE_FRACTION;
            }
            if (z.hp <= 0) zombieDied(z);
          }
          b.dead = true;
          break;
        }
      }
      if (b.dead) continue;
      if (b.owner === "player") {
        for (const r of resources) {
          if (dist(b.x, b.y, r.x, r.y) < b.radius + r.radius) {
            r.hp -= b.damage;
            b.dead = true;
            if (r.hp <= 0) {
              r.dead = true;
              const burstColor = r.type === "tree" ? "#356b43" : r.type === "iron" ? "#708090" : "#8b9599";
              spawnBurst(r.x, r.y, burstColor, 8);
              if (r.type === "tree") {
                const amt = Math.round((8 + Math.random() * 6) * (player.resourceMul || 1));
                player.wood += amt;
                spawnParticle(r.x, r.y, "+" + amt + " wood", "#c98b4a");
                gainXp(Math.round(3 * (player.resourceMul || 1)));
              } else if (r.type === "iron") {
                const ironAmt = Math.round((4 + Math.random() * 4) * (player.resourceMul || 1));
                player.iron += ironAmt;
                spawnParticle(r.x, r.y, "+" + ironAmt + " iron", "#708090");
                const stoneAmt = Math.round((2 + Math.random() * 3) * (player.resourceMul || 1));
                player.stone += stoneAmt;
                setTimeout(() => spawnParticle(r.x, r.y - 15, "+" + stoneAmt + " stone", "#9aa7ac"), 150);
                if (Math.random() < 0.2) {
                  const goldAmt = Math.round((1 + Math.floor(Math.random() * 2)) * (player.resourceMul || 1));
                  player.gold += goldAmt;
                  setTimeout(() => spawnParticle(r.x, r.y - 30, "+" + goldAmt + " gold", "#ffd76a"), 300);
                }
                gainXp(Math.round(6 * (player.resourceMul || 1)));
              } else {
                const amt = Math.round((6 + Math.random() * 4) * (player.resourceMul || 1));
                player.stone += amt;
                spawnParticle(r.x, r.y, "+" + amt + " stone", "#9aa7ac");
                if (Math.random() < 0.25) {
                  const ironAmt = Math.round((1 + Math.floor(Math.random() * 3)) * (player.resourceMul || 1));
                  player.iron += ironAmt;
                  setTimeout(() => spawnParticle(r.x, r.y - 15, "+" + ironAmt + " iron", "#708090"), 150);
                }
                if (Math.random() < 0.08) {
                  const goldAmt = 1;
                  player.gold += goldAmt;
                  setTimeout(() => spawnParticle(r.x, r.y - 30, "+" + goldAmt + " gold", "#ffd76a"), 300);
                }
                gainXp(Math.round(3 * (player.resourceMul || 1)));
              }
            }
            break;
          }
        }
      }
    }
    setBullets(bullets.filter((b) => !b.dead));
    setResources(resources.filter((r) => !r.dead));
    setZombies(zombies.filter((z) => !z.dead));
  }
  function updateStructures(dt) {
    const now = performance.now();
    for (const z of zombies) {
      z.armorReduction = 0;
      z.dmgVulnerability = 0;
      z.slowAmount = 0;
      z.physVulnerability = 0;
    }
    const activeFireZones = fireZones.filter((fz) => now < fz.endsAt);
    for (const fz of activeFireZones) {
      const dmg = fz.damagePerSec * dt / 1e3;
      for (const z of zombies) {
        if (z.dead) continue;
        if (dist(fz.x, fz.y, z.x, z.y) < fz.radius + z.radius) {
          z.hp -= dmg;
          z.flash = now;
          if (z.hp <= 0) zombieDied(z);
        }
      }
    }
    setFireZones(activeFireZones);
    const activeToxicClouds = toxicClouds.filter((tc) => now < tc.endsAt);
    for (const tc of activeToxicClouds) {
      const dmg = tc.damagePerSec * dt / 1e3;
      for (const z of zombies) {
        if (z.dead) continue;
        if (dist(tc.x, tc.y, z.x, z.y) < tc.radius + z.radius) {
          z.hp -= dmg;
          z.flash = now;
          z.armorReduction = Math.max(z.armorReduction || 0, tc.armorReduction);
          z.dmgVulnerability = Math.max(z.dmgVulnerability || 0, tc.dmgVulnerability);
          z.toxicUntil = now + 500;
          if (z.hp <= 0) {
            zombieDied(z);
            if (tc.armorReduction === 25) {
              toxicClouds.push({
                x: z.x,
                y: z.y,
                radius: 75,
                damagePerSec: 12,
                armorReduction: 10,
                dmgVulnerability: 0.1,
                endsAt: now + 2e3
              });
            }
          }
        }
      }
    }
    setToxicClouds(activeToxicClouds);
    setTeslaChains(teslaChains.filter((tc) => now < tc.endsAt));
    setSniperLasers(sniperLasers.filter((sl) => now < sl.endsAt));
    for (const s of structures) {
      if (s.type === "campfire") {
        if (dist(player.x, player.y, s.x, s.y) < (s.healRadius || 150)) {
          player.hp = Math.min(player.maxHp, player.hp + (s.healRate || 5) * dt / 1e3);
        }
      }
      if (s.type === "spike") {
        for (const z of zombies) {
          if (dist(s.x, s.y, z.x, z.y) < s.radius + z.radius) {
            if (!z.spikeCd || now - z.spikeCd > 500) {
              const reducedArmor = Math.max(0, z.armor - (z.armorReduction || 0));
              const vuln = 1 + (z.dmgVulnerability || 0);
              const physVuln = 1 + (z.physVulnerability || 0);
              let finalDmg = (s.damage || 9) * vuln * physVuln;
              finalDmg = Math.max(1, finalDmg - reducedArmor);
              z.hp -= finalDmg;
              z.spikeCd = now;
              z.flash = now;
              if (z.hp <= 0) zombieDied(z);
            }
          }
        }
      }
      if (s.type === "cannon") {
        const lvl = s.level || 1;
        const spec = TOWER_LEVELS.cannon[lvl - 1];
        if (!s.lastShot) s.lastShot = 0;
        let target = null, bestDist = Infinity;
        for (const z of zombies) {
          if (z.dead) continue;
          const d = dist(s.x, s.y, z.x, z.y);
          if (d < spec.range) {
            const dPlayer = dist(z.x, z.y, player.x, player.y);
            if (dPlayer < bestDist) {
              target = z;
              bestDist = dPlayer;
            }
          }
        }
        if (target) {
          s.aimAngle = Math.atan2(target.y - s.y, target.x - s.x);
          let speedup = 1;
          if (lvl >= 3) {
            if (s.lastTargetId !== target.id) {
              s.consecutiveHits = 0;
            }
            const maxBoost = lvl === 3 ? 0.3 : 0.5;
            speedup = 1 + Math.min(maxBoost, (s.consecutiveHits || 0) * 0.05);
          }
          const cooldown = 1e3 / (spec.fireRate * speedup);
          if (now - s.lastShot > cooldown) {
            s.lastShot = now;
            if (lvl >= 3) {
              s.lastTargetId = target.id;
              s.consecutiveHits = (s.consecutiveHits || 0) + 1;
            }
            const a = s.aimAngle;
            const b = {
              x: s.x + Math.cos(a) * (s.radius + 4),
              y: s.y + Math.sin(a) * (s.radius + 4),
              vx: Math.cos(a) * 8.5,
              vy: Math.sin(a) * 8.5,
              radius: 4,
              damage: spec.damage,
              life: 1200,
              owner: "turret"
            };
            if (lvl === 5) {
              b.armorPenetration = 0.5;
            }
            bullets.push(b);
          }
        }
      }
      if (s.type === "mortar") {
        const lvl = s.level || 1;
        const spec = TOWER_LEVELS.mortar[lvl - 1];
        if (!s.lastShot) s.lastShot = 0;
        let target = null, bestDensity = -1;
        for (const z of zombies) {
          if (z.dead) continue;
          const d = dist(s.x, s.y, z.x, z.y);
          if (d >= 120 && d < spec.range) {
            let density = 0;
            for (const other of zombies) {
              if (other !== z && !other.dead && dist(z.x, z.y, other.x, other.y) < 120) {
                density++;
              }
            }
            if (density > bestDensity) {
              target = z;
              bestDensity = density;
            }
          }
        }
        if (target && now - s.lastShot > 1e3 / spec.fireRate) {
          s.lastShot = now;
          s.aimAngle = Math.atan2(target.y - s.y, target.x - s.x);
          const a = s.aimAngle;
          bullets.push({
            x: s.x + Math.cos(a) * (s.radius + 4),
            y: s.y + Math.sin(a) * (s.radius + 4),
            vx: Math.cos(a) * 4.5,
            vy: Math.sin(a) * 4.5,
            radius: 6,
            damage: spec.damage,
            life: 1800,
            owner: "turret",
            explosive: true,
            explodeRadius: spec.specialValue || 125,
            isMortar: true,
            mortarLevel: lvl
          });
        }
      }
      if (s.type === "tesla") {
        const lvl = s.level || 1;
        const spec = TOWER_LEVELS.tesla[lvl - 1];
        if (!s.lastShot) s.lastShot = 0;
        let target = null, bestD = Infinity;
        for (const z of zombies) {
          if (z.dead) continue;
          const d = dist(s.x, s.y, z.x, z.y);
          if (d < spec.range && d < bestD) {
            target = z;
            bestD = d;
          }
        }
        if (target && now - s.lastShot > 1e3 / spec.fireRate) {
          s.lastShot = now;
          s.aimAngle = Math.atan2(target.y - s.y, target.x - s.x);
          const maxChains = spec.specialValue || 3;
          const damageReduction = lvl === 3 ? 0.08 : lvl >= 4 ? 0.05 : 0.15;
          let current = target;
          let chainDmg = spec.damage;
          const hitSet = /* @__PURE__ */ new Set();
          const segments = [];
          let sx = s.x, sy = s.y;
          for (let c = 0; c < maxChains; c++) {
            if (!current) break;
            hitSet.add(current.id);
            const reducedArmor = Math.max(0, current.armor - (current.armorReduction || 0));
            const vuln = 1 + (current.dmgVulnerability || 0);
            const finalDmg = Math.max(1, chainDmg * vuln - reducedArmor);
            current.hp -= finalDmg;
            current.flash = now;
            if (lvl === 5 && Math.random() < 0.2) {
              current.stunUntil = now + 1e3;
              spawnParticle(current.x, current.y - 20, "SHOCK", "#89cff0");
            }
            if (current.hp <= 0) zombieDied(current);
            segments.push({ sx, sy, tx: current.x, ty: current.y });
            let next = null, nextBestD = Infinity;
            for (const z of zombies) {
              if (z.dead || hitSet.has(z.id)) continue;
              const dNext = dist(current.x, current.y, z.x, z.y);
              if (dNext < 160 && dNext < nextBestD) {
                next = z;
                nextBestD = dNext;
              }
            }
            sx = current.x;
            sy = current.y;
            current = next;
            chainDmg *= 1 - damageReduction;
          }
          teslaChains.push({ segments, endsAt: now + 100 });
        }
      }
      if (s.type === "sniper") {
        const lvl = s.level || 1;
        const spec = TOWER_LEVELS.sniper[lvl - 1];
        if (!s.lastShot) s.lastShot = 0;
        let target = null, highestHp = -1;
        for (const z of zombies) {
          if (z.dead) continue;
          const d = dist(s.x, s.y, z.x, z.y);
          if (d < spec.range && z.hp > highestHp) {
            target = z;
            highestHp = z.hp;
          }
        }
        if (target && now - s.lastShot > 1e3 / spec.fireRate) {
          s.lastShot = now;
          s.aimAngle = Math.atan2(target.y - s.y, target.x - s.x);
          let damage = spec.damage;
          let isCrit = false;
          if (lvl >= 3) {
            const reqHpPct = lvl === 3 ? 0.7 : 0.5;
            if (target.hp >= target.maxHp * reqHpPct) {
              damage *= 2;
              isCrit = true;
            }
          }
          if (lvl === 5) {
            if (target.type === "boss") {
              damage *= 4;
            } else if (target.hp <= target.maxHp * 0.18) {
              damage = target.hp + 9999;
              isCrit = true;
            }
          }
          const reducedArmor = Math.max(0, target.armor - (target.armorReduction || 0));
          const vuln = 1 + (target.dmgVulnerability || 0);
          const finalDmg = Math.max(1, damage * vuln - reducedArmor);
          target.hp -= finalDmg;
          target.flash = now;
          spawnDamageNumber(target.x, target.y - 20, Math.round(finalDmg), isCrit ? "#ffd76a" : "#ff5c5c");
          if (isCrit) {
            spawnParticle(target.x, target.y - 35, "CRIT", "#ffd76a");
          }
          if (target.hp <= 0) zombieDied(target);
          sniperLasers.push({ sx: s.x, sy: s.y, tx: target.x, ty: target.y, endsAt: now + 150 });
        }
      }
      if (s.type === "frost") {
        const lvl = s.level || 1;
        const spec = TOWER_LEVELS.frost[lvl - 1];
        const slowAmt = spec.specialValue || 0.2;
        const dmg = spec.damage * dt / 1e3;
        for (const z of zombies) {
          if (z.dead) continue;
          const d = dist(s.x, s.y, z.x, z.y);
          if (d < spec.range) {
            z.hp -= dmg;
            z.flash = now;
            if (z.hp <= 0) {
              zombieDied(z);
              continue;
            }
            z.slowedUntil = now + 300;
            z.slowAmount = Math.max(z.slowAmount || 0, slowAmt);
            if (lvl >= 3) {
              z.physVulnerability = Math.max(z.physVulnerability || 0, lvl === 3 ? 0.1 : 0.2);
            }
            if (lvl === 5) {
              z.frozenTime = (z.frozenTime || 0) + dt;
              if (z.frozenTime >= 4e3) {
                z.stunUntil = now + 2e3;
                z.frozenTime = 0;
                spawnParticle(z.x, z.y - 25, "FROZEN", "#5b9ad6");
              }
            }
          } else {
            if (z.frozenTime) z.frozenTime = Math.max(0, z.frozenTime - dt * 0.5);
          }
        }
      }
      if (s.type === "toxic") {
        const lvl = s.level || 1;
        const spec = TOWER_LEVELS.toxic[lvl - 1];
        if (!s.lastShot) s.lastShot = 0;
        let target = null, bestDensity = -1;
        for (const z of zombies) {
          if (z.dead) continue;
          const d = dist(s.x, s.y, z.x, z.y);
          if (d < spec.range) {
            let density = 0;
            for (const other of zombies) {
              if (other !== z && !other.dead && dist(z.x, z.y, other.x, other.y) < 120) {
                density++;
              }
            }
            if (density > bestDensity) {
              target = z;
              bestDensity = density;
            }
          }
        }
        if (target && now - s.lastShot > 1e3 / spec.fireRate) {
          s.lastShot = now;
          s.aimAngle = Math.atan2(target.y - s.y, target.x - s.x);
          const a = s.aimAngle;
          const vuln = lvl === 3 ? 0.15 : lvl >= 4 ? 0.25 : 0;
          bullets.push({
            x: s.x + Math.cos(a) * (s.radius + 4),
            y: s.y + Math.sin(a) * (s.radius + 4),
            vx: Math.cos(a) * 5,
            vy: Math.sin(a) * 5,
            radius: 5,
            damage: 0,
            life: 1800,
            owner: "turret",
            explosive: true,
            explodeRadius: 10,
            isToxic: true,
            toxicRadius: 150 + (lvl - 1) * 15,
            toxicDmg: spec.damage,
            armorReduction: spec.specialValue || 5,
            dmgVulnerability: vuln
          });
        }
      }
    }
    setZombies(zombies.filter((z) => !z.dead));
    setStructures(structures.filter((s) => s.hp > 0));
  }
  function updateZombies(dt, dayNightFactor) {
    const now = performance.now();
    const speedM = nightMul(dayNightFactor), dmgM = nightDmgMul(dayNightFactor);
    for (const z of zombies) {
      const def = ZTYPE[z.type];
      let slowMul = 1;
      if (z.slowedUntil && now < z.slowedUntil) {
        slowMul = Math.max(0.1, 1 - (z.slowAmount || 0.2));
      }
      if (z.stunUntil && now < z.stunUntil) {
        slowMul = 0;
      }
      if (z.burnUntil && now < z.burnUntil) {
        const burnDmg = (z.burnDamagePerSec || 0) * dt / 1e3;
        z.hp -= burnDmg;
        if (Math.random() < 0.1) spawnDamageNumber(z.x, z.y - 10, burnDmg * 10, "#ff6a3a");
        if (z.hp <= 0) {
          zombieDied(z);
          continue;
        }
      }
      if (def.explode && z.fuseStart) {
        if (now - z.fuseStart > 650) {
          const dmg = (z.explodeDamage || 16) * dmgM;
          if (player.alive && dist(z.x, z.y, player.x, player.y) < (def.explodeRadius || 95) + player.radius) {
            if (!godMode) player.hp -= dmg;
            spawnDamageNumber(player.x, player.y - 30, dmg, "#ff9f43");
            checkDeath(killPlayer);
          }
          for (const s of structures) {
            if (dist(z.x, z.y, s.x, s.y) < (def.explodeRadius || 95) + s.radius) s.hp -= dmg * 0.6;
          }
          spawnBurst(z.x, z.y, "#ffb347", 24);
          triggerShake(10, 220);
          zombieDied(z);
        }
        continue;
      }
      if (def.ranged) {
        const d = dist(z.x, z.y, player.x, player.y);
        let speedFactor = 1;
        let overlappingStructure = false;
        if (z.type === "spider") {
          for (const s of structures) {
            if (dist(z.x, z.y, s.x, s.y) < s.radius + z.radius) {
              overlappingStructure = true;
              break;
            }
          }
        }
        if (overlappingStructure) {
          speedFactor = 0.45;
        } else if (z.type !== "spider") {
          let hitStr = null;
          for (const s of structures) {
            if (dist(z.x, z.y, s.x, s.y) < s.radius + z.radius + 6) {
              hitStr = s;
              break;
            }
          }
          if (hitStr) {
            hitStr.hp -= (z.type === "brute" ? 24 : 14) * dt / 1e3;
            const sd = dist(z.x, z.y, hitStr.x, hitStr.y) || 1;
            z.x += (z.x - hitStr.x) / sd * 0.6;
            z.y += (z.y - hitStr.y) / sd * 0.6;
            speedFactor = 0;
          }
        }
        if (speedFactor > 0) {
          let dx2 = 0, dy2 = 0;
          if (d > (def.range || 340)) {
            const a = Math.atan2(player.y - z.y, player.x - z.x);
            dx2 = Math.cos(a);
            dy2 = Math.sin(a);
          } else if (d < (def.range || 340) * 0.55) {
            const a = Math.atan2(z.y - player.y, z.x - player.x);
            dx2 = Math.cos(a);
            dy2 = Math.sin(a);
          }
          let witchBuff = 1;
          if (z.type !== "witch" && z.type !== "boss") {
            const witchNearby = zombies.some((other) => other.type === "witch" && !other.dead && dist(z.x, z.y, other.x, other.y) < 160);
            if (witchNearby) witchBuff = 1.35;
          }
          z.wobble += dt * 4e-3;
          const wob = Math.sin(z.wobble) * 0.25;
          z.x += (dx2 + -dy2 * wob) * z.speed * speedM * speedFactor * witchBuff * slowMul;
          z.y += (dy2 + dx2 * wob) * z.speed * speedM * speedFactor * witchBuff * slowMul;
        }
        if (z.type === "witch") {
          if (!z.lastSummon) z.lastSummon = 0;
          if (now - z.lastSummon > 6e3) {
            z.lastSummon = now;
            const typeToSummon = Math.random() < 0.65 ? "normal" : "scout";
            const offAngle = Math.random() * Math.PI * 2;
            const offD = rand(40, 90);
            const sx = clamp(z.x + Math.cos(offAngle) * offD, 40, WORLD_W - 40);
            const sy = clamp(z.y + Math.sin(offAngle) * offD, 40, WORLD_H - 40);
            spawnZombie(typeToSummon, sx, sy);
            spawnBurst(sx, sy, "#8e44ad", 8);
            spawnParticle(z.x, z.y - 30, "SUMMON", "#bdc3c7");
          }
        }
        if (now - z.lastShot > 1e3 / (def.fireRate || 0.8)) {
          z.lastShot = now;
          const a = Math.atan2(player.y - z.y, player.x - z.x);
          const isSpider = z.type === "spider";
          const isWitch = z.type === "witch";
          let bRad = 5, bDmg = (z.projDamage || 6) * dmgM, bSpeed = 5.5, bLife = 2200, slowProj = false;
          if (isSpider) {
            bRad = 6;
            bDmg = 2 * dmgM;
            bSpeed = 6.5;
            bLife = 1500;
            slowProj = true;
          } else if (isWitch) {
            bRad = 8;
            bDmg = 10 * dmgM;
            bSpeed = 4;
            bLife = 2500;
          }
          bullets.push({
            x: z.x + Math.cos(a) * (z.radius + 6),
            y: z.y + Math.sin(a) * (z.radius + 6),
            vx: Math.cos(a) * bSpeed,
            vy: Math.sin(a) * bSpeed,
            radius: bRad,
            damage: bDmg,
            life: bLife,
            owner: "zombie",
            slowProj
          });
        }
        z.x = clamp(z.x, z.radius, WORLD_W - z.radius);
        z.y = clamp(z.y, z.radius, WORLD_H - z.radius);
        continue;
      }
      let blocked = null;
      for (const s of structures) {
        if (dist(z.x, z.y, s.x, s.y) < s.radius + z.radius + 6) {
          blocked = s;
          break;
        }
      }
      let dx, dy;
      if (blocked) {
        blocked.hp -= (z.type === "brute" ? 24 : 14) * dt / 1e3;
        const d = dist(z.x, z.y, blocked.x, blocked.y) || 1;
        dx = (z.x - blocked.x) / d;
        dy = (z.y - blocked.y) / d;
        z.x += dx * 0.6;
        z.y += dy * 0.6;
      } else {
        const d = dist(z.x, z.y, player.x, player.y) || 1;
        dx = (player.x - z.x) / d;
        dy = (player.y - z.y) / d;
        z.wobble += dt * 4e-3;
        const wob = z.type === "boss" ? 0 : Math.sin(z.wobble) * 0.25;
        let witchBuff = 1;
        if (z.type !== "witch" && z.type !== "boss") {
          const witchNearby = zombies.some((other) => other.type === "witch" && !other.dead && dist(z.x, z.y, other.x, other.y) < 160);
          if (witchNearby) witchBuff = 1.35;
        }
        z.x += (dx + -dy * wob) * z.speed * speedM * witchBuff * slowMul;
        z.y += (dy + dx * wob) * z.speed * speedM * witchBuff * slowMul;
      }
      z.x = clamp(z.x, z.radius, WORLD_W - z.radius);
      z.y = clamp(z.y, z.radius, WORLD_H - z.radius);
      if (def.explode && !z.fuseStart) {
        const d = dist(z.x, z.y, player.x, player.y);
        if (d < z.radius + player.radius + 16) z.fuseStart = now;
      }
      if (player.alive) {
        const d = dist(z.x, z.y, player.x, player.y);
        if (d < z.radius + player.radius) {
          const cd = z.type === "boss" ? 800 : 550;
          if (now - (z.hitCooldown || 0) > cd) {
            const dmg = z.damage * dmgM;
            if (!godMode) player.hp -= dmg;
            z.hitCooldown = now;
            const pushD = d || 1;
            player.x += (player.x - z.x) / pushD * (z.type === "boss" ? 18 : 10);
            player.y += (player.y - z.y) / pushD * (z.type === "boss" ? 18 : 10);
            spawnDamageNumber(player.x, player.y - 30, dmg, "#ff4d4d");
            triggerShake(z.type === "boss" ? 12 : 6, z.type === "boss" ? 250 : 150);
            checkDeath(killPlayer);
          }
        }
      }
    }
    if (player.alive) {
      for (const z of zombies) {
        if (z.dead) continue;
        let dx = z.x - player.x;
        let dy = z.y - player.y;
        let d = Math.hypot(dx, dy);
        const minDist = player.radius + z.radius;
        if (d < minDist) {
          if (d === 0) {
            dx = Math.random() - 0.5;
            dy = Math.random() - 0.5;
            d = Math.hypot(dx, dy) || 1;
          }
          const overlap = minDist - d;
          const playerWeight = z.type === "boss" ? 0.75 : z.type === "brute" ? 0.55 : 0.4;
          const zombieWeight = 1 - playerWeight;
          player.x = clamp(player.x - dx / d * overlap * playerWeight, player.radius, WORLD_W - player.radius);
          player.y = clamp(player.y - dy / d * overlap * playerWeight, player.radius, WORLD_H - player.radius);
          z.x = clamp(z.x + dx / d * overlap * zombieWeight, z.radius, WORLD_W - z.radius);
          z.y = clamp(z.y + dy / d * overlap * zombieWeight, z.radius, WORLD_H - z.radius);
        }
      }
    }
    for (let i = 0; i < zombies.length; i++) {
      const z1 = zombies[i];
      if (z1.dead) continue;
      for (let j = i + 1; j < zombies.length; j++) {
        const z2 = zombies[j];
        if (z2.dead) continue;
        let dx = z2.x - z1.x;
        let dy = z2.y - z1.y;
        let d = Math.hypot(dx, dy);
        const minDist = z1.radius + z2.radius;
        if (d < minDist) {
          if (d === 0) {
            dx = Math.random() - 0.5;
            dy = Math.random() - 0.5;
            d = Math.hypot(dx, dy) || 1;
          }
          const overlap = minDist - d;
          const pushX = dx / d * overlap * 0.45;
          const pushY = dy / d * overlap * 0.45;
          z1.x = clamp(z1.x - pushX, z1.radius, WORLD_W - z1.radius);
          z1.y = clamp(z1.y - pushY, z1.radius, WORLD_H - z1.radius);
          z2.x = clamp(z2.x + pushX, z2.radius, WORLD_W - z2.radius);
          z2.y = clamp(z2.y + pushY, z2.radius, WORLD_H - z2.radius);
        }
      }
    }
  }
  function updateParticles(dt) {
    particles.forEach((p) => {
      p.y += p.vy;
      p.life -= dt;
    });
    setParticles(particles.filter((p) => p.life > 0));
    bursts.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.life -= dt;
    });
    setBursts(bursts.filter((p) => p.life > 0));
    if (shake.time > 0) shake.time -= dt;
    else shake.mag = 0;
  }

  // src/render/drawWorld.ts
  var imgTree = new Image();
  imgTree.src = "assets/tree.png";
  var imgStone = new Image();
  imgStone.src = "assets/stone.png";
  var imgIron = new Image();
  imgIron.src = "assets/iron.png";
  function worldToScreen(x, y) {
    return { x: x - camera.x, y: y - camera.y };
  }
  function getPlacementAngle() {
    return manualBuildAngle !== null ? manualBuildAngle : snapAngleToCardinal(player.angle);
  }
  function getBuildTarget() {
    const build = selectedBuild;
    const mp = mouseWorldPos2();
    const dx = mp.x - player.x, dy = mp.y - player.y;
    const d = Math.hypot(dx, dy);
    let tx = mp.x, ty = mp.y;
    if (d > BUILD_REACH) {
      tx = player.x + dx / d * BUILD_REACH;
      ty = player.y + dy / d * BUILD_REACH;
    }
    const cell = gridCellCenter(tx, ty, TILE);
    const occupant = structureAtCell(cell.x, cell.y);
    const canUpgrade = !!occupant && occupant.type === build && (occupant.type === "wall" || occupant.type === "spike" || occupant.type === "cannon" || occupant.type === "mortar" || occupant.type === "sniper" || occupant.type === "tesla" || occupant.type === "frost" || occupant.type === "toxic");
    const def = BUILD_DEFS[build];
    let blockedByResource = false;
    if (!occupant) {
      for (const r of resources) {
        if (dist(cell.x, cell.y, r.x, r.y) < def.radius + r.radius) {
          blockedByResource = true;
          break;
        }
      }
    }
    const wCost = Math.ceil(def.wood * (player.buildDiscount || 1));
    const sCost = Math.ceil(def.stone * (player.buildDiscount || 1));
    const canAfford = player.wood >= wCost && player.stone >= sCost;
    return { cx: cell.x, cy: cell.y, occupant, canUpgrade, blockedByResource, canAfford };
  }
  function mouseWorldPos2() {
    return { x: mouse.x + camera.x, y: mouse.y + camera.y };
  }
  function structureAtCell(cx, cy) {
    for (const s of structures) {
      const c = gridCellCenter(s.x, s.y, TILE);
      if (Math.abs(c.x - cx) < 1 && Math.abs(c.y - cy) < 1) return s;
    }
    return null;
  }
  function drawShadow(ctx2, sx, sy, radius) {
    ctx2.fillStyle = "rgba(0,0,0,0.28)";
    ctx2.beginPath();
    ctx2.ellipse(sx, sy + radius * 0.55, radius * 0.85, radius * 0.38, 0, 0, Math.PI * 2);
    ctx2.fill();
  }
  function radialFill(ctx2, sx, sy, radius, cLight, cDark) {
    const g = ctx2.createRadialGradient(sx - radius * 0.3, sy - radius * 0.3, radius * 0.1, sx, sy, radius);
    g.addColorStop(0, cLight);
    g.addColorStop(1, cDark);
    return g;
  }
  function drawBackground(ctx2, canvas2) {
    ctx2.fillStyle = mixHex(GRASS_DAY, GRASS_NIGHT, dayNight.factor);
    ctx2.fillRect(0, 0, canvas2.width, canvas2.height);
    for (const p of terrainPatches) {
      const s = worldToScreen(p.x, p.y);
      if (s.x < -p.r || s.x > canvas2.width + p.r || s.y < -p.r || s.y > canvas2.height + p.r) continue;
      const isPuddle = p.dark && Math.floor(p.x + p.y) % 5 === 0;
      if (isPuddle) {
        ctx2.save();
        const time2 = performance.now();
        ctx2.fillStyle = "rgba(25, 35, 20, 0.38)";
        ctx2.beginPath();
        ctx2.ellipse(s.x, s.y + 2.5, p.r * 0.92, p.r * 0.6, 0, 0, Math.PI * 2);
        ctx2.fill();
        const waterGrad = ctx2.createRadialGradient(s.x, s.y - p.r * 0.08, p.r * 0.05, s.x, s.y, p.r * 0.86);
        const cCenter = mixHex("#1f333d", "#0b1318", dayNight.factor);
        const cEdge = mixHex("#4b6572", "#22323a", dayNight.factor);
        waterGrad.addColorStop(0, cCenter);
        waterGrad.addColorStop(1, cEdge);
        ctx2.fillStyle = waterGrad;
        ctx2.beginPath();
        ctx2.ellipse(s.x, s.y, p.r * 0.86, p.r * 0.54, 0, 0, Math.PI * 2);
        ctx2.fill();
        const waveShift = Math.sin(time2 * 12e-4 + p.x) * 0.06;
        ctx2.strokeStyle = "rgba(255, 255, 255, 0.18)";
        ctx2.lineWidth = 2.5;
        ctx2.beginPath();
        ctx2.arc(s.x - p.r * (0.15 + waveShift), s.y - p.r * 0.1, p.r * 0.45, Math.PI * 1.05, Math.PI * 1.45);
        ctx2.stroke();
        ctx2.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx2.lineWidth = 1.5;
        ctx2.beginPath();
        ctx2.moveTo(s.x - p.r * 0.4, s.y + p.r * 0.15);
        ctx2.lineTo(s.x - p.r * 0.1, s.y + p.r * 0.15);
        ctx2.stroke();
        const shimmer = Math.sin(time2 * 28e-4 + p.x * 0.07) * 0.5 + 0.5;
        if (shimmer > 0.45) {
          ctx2.fillStyle = `rgba(255, 255, 255, ${(shimmer - 0.45) * 0.45 * (1 - dayNight.factor * 0.5)})`;
          ctx2.beginPath();
          ctx2.ellipse(s.x + p.r * 0.18, s.y - p.r * 0.18, 3.2, 1.5, Math.PI * 0.15, 0, Math.PI * 2);
          ctx2.fill();
        }
        const ripplePhase = (time2 * 6e-4 + p.x * 0.05) % 1;
        const rippleRadius = p.r * 0.2 + ripplePhase * p.r * 0.6;
        const rippleAlpha = (1 - ripplePhase) * 0.25 * (1 - dayNight.factor * 0.4);
        ctx2.strokeStyle = `rgba(255, 255, 255, ${rippleAlpha})`;
        ctx2.lineWidth = 1;
        ctx2.beginPath();
        ctx2.ellipse(s.x, s.y, rippleRadius, rippleRadius * 0.54, 0, 0, Math.PI * 2);
        ctx2.stroke();
        ctx2.restore();
      } else {
        const grad = ctx2.createRadialGradient(s.x, s.y, p.r * 0.1, s.x, s.y, p.r);
        if (p.dark) {
          grad.addColorStop(0, "rgba(30, 42, 18, 0.42)");
          grad.addColorStop(0.6, "rgba(45, 60, 25, 0.22)");
          grad.addColorStop(1, "rgba(0,0,0,0)");
        } else {
          grad.addColorStop(0, "rgba(150, 185, 70, 0.20)");
          grad.addColorStop(0.6, "rgba(130, 170, 65, 0.08)");
          grad.addColorStop(1, "rgba(0,0,0,0)");
        }
        ctx2.fillStyle = grad;
        ctx2.beginPath();
        ctx2.ellipse(s.x, s.y, p.r * 1.1, p.r * 0.77, 0, 0, Math.PI * 2);
        ctx2.fill();
        const hasFlowers = !p.dark && Math.floor(p.x) % 3 === 0;
        if (hasFlowers) {
          const flowerSeed = Math.abs(Math.sin(p.x * 12.9 + p.y * 3.4) * 10);
          ctx2.fillStyle = Math.floor(flowerSeed) % 2 === 0 ? "#ffe082" : "#ff8a80";
          for (let f = 0; f < 3; f++) {
            const fx = s.x + Math.sin(flowerSeed + f * 2.5) * (p.r * 0.35);
            const fy = s.y + Math.cos(flowerSeed + f * 1.8) * (p.r * 0.28);
            ctx2.beginPath();
            ctx2.arc(fx, fy, 2, 0, Math.PI * 2);
            ctx2.fill();
            ctx2.fillStyle = "#ffffff";
            ctx2.beginPath();
            ctx2.arc(fx, fy, 0.8, 0, Math.PI * 2);
            ctx2.fill();
            ctx2.fillStyle = Math.floor(flowerSeed) % 2 === 0 ? "#ffe082" : "#ff8a80";
          }
        }
      }
    }
    for (const b of bloodDecals) {
      const s = worldToScreen(b.x, b.y);
      if (s.x < -30 || s.x > canvas2.width + 30 || s.y < -30 || s.y > canvas2.height + 30) continue;
      ctx2.save();
      ctx2.translate(s.x, s.y);
      ctx2.rotate(b.rot);
      ctx2.globalAlpha = b.alpha;
      ctx2.fillStyle = "#3a0d0d";
      ctx2.beginPath();
      ctx2.ellipse(0, 0, b.r, b.r * 0.6, 0, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.globalAlpha = 1;
      ctx2.restore();
    }
    const time = performance.now();
    for (const d of decor) {
      const s = worldToScreen(d.x, d.y);
      if (s.x < -20 || s.x > canvas2.width + 20 || s.y < -20 || s.y > canvas2.height + 20) continue;
      ctx2.save();
      ctx2.translate(s.x, s.y);
      const typeIndex = Math.floor(d.x + d.y) % 6;
      if (typeIndex === 0) {
        const rot = d.a + Math.sin(time * 4e-4 + d.x) * 0.1;
        ctx2.rotate(rot);
        ctx2.fillStyle = "rgba(10,25,12,0.12)";
        ctx2.beginPath();
        ctx2.ellipse(1, 1, 4 * d.s, 2 * d.s, Math.PI * 0.25, 0, Math.PI * 2);
        ctx2.fill();
        ctx2.fillStyle = Math.floor(d.x) % 2 === 0 ? "#b05c38" : "#cd9b4d";
        ctx2.beginPath();
        ctx2.ellipse(0, 0, 3.8 * d.s, 1.8 * d.s, Math.PI * 0.25, 0, Math.PI * 2);
        ctx2.fill();
        ctx2.strokeStyle = "rgba(0,0,0,0.14)";
        ctx2.lineWidth = 0.8;
        ctx2.beginPath();
        ctx2.moveTo(-3 * d.s, -1 * d.s);
        ctx2.lineTo(3 * d.s, 1 * d.s);
        ctx2.stroke();
      } else if (typeIndex === 1) {
        ctx2.fillStyle = "rgba(10,20,15,0.16)";
        ctx2.beginPath();
        ctx2.ellipse(1, 1, 3.2 * d.s, 1.8 * d.s, 0, 0, Math.PI * 2);
        ctx2.fill();
        ctx2.fillStyle = "#85929e";
        ctx2.beginPath();
        ctx2.ellipse(0, 0, 2.8 * d.s, 1.5 * d.s, 0.15, 0, Math.PI * 2);
        ctx2.fill();
        ctx2.fillStyle = "#aeb6bf";
        ctx2.beginPath();
        ctx2.ellipse(-0.6, -0.3, 1.2 * d.s, 0.7 * d.s, 0.15, 0, Math.PI * 2);
        ctx2.fill();
      } else {
        ctx2.fillStyle = mixHex(TUFT_DAY, TUFT_NIGHT, dayNight.factor);
        const sway = Math.sin(time * 18e-4 + d.x * 0.04 + d.y * 0.04) * 0.14;
        ctx2.rotate(d.a + sway);
        const bladeLen = 9 * d.s;
        ctx2.fillStyle = "rgba(10, 25, 12, 0.16)";
        ctx2.beginPath();
        ctx2.ellipse(0, 0, 4.5 * d.s, 1.5, 0, 0, Math.PI * 2);
        ctx2.fill();
        ctx2.fillStyle = mixHex(TUFT_DAY, TUFT_NIGHT, dayNight.factor);
        ctx2.beginPath();
        for (let i = -1; i <= 1; i++) {
          const bx = i * 3 * d.s;
          ctx2.moveTo(bx - 1.5, 0);
          ctx2.lineTo(bx, -bladeLen * (1 - Math.abs(i) * 0.25));
          ctx2.lineTo(bx + 1.5, 0);
        }
        ctx2.fill();
      }
      ctx2.restore();
    }
    if (dayNight.factor <= 0.25) {
      const a = (1 - dayNight.factor * 4) * 0.35;
      ctx2.fillStyle = `rgba(255,255,210,${a})`;
      for (let i = 0; i < 16; i++) {
        const px = (i * 713 + Math.sin(time * 8e-4 + i) * 50) % canvas2.width;
        const py = (i * 324 + time * 0.012 + Math.cos(time * 6e-4 + i) * 30) % canvas2.height;
        ctx2.beginPath();
        ctx2.arc(px, py, 1.8, 0, Math.PI * 2);
        ctx2.fill();
      }
    }
    if (dayNight.factor > 0.25) {
      for (const f of fireflies) {
        const s = worldToScreen(f.x, f.y + Math.sin(time * f.speed + f.phase) * 10);
        if (s.x < -10 || s.x > canvas2.width + 10 || s.y < -10 || s.y > canvas2.height + 10) continue;
        const a = Math.min(1, dayNight.factor * 1.4) * (0.5 + 0.5 * Math.sin(time * 3e-3 + f.phase * 3));
        ctx2.fillStyle = `rgba(255,240,150,${a * 0.7})`;
        ctx2.beginPath();
        ctx2.arc(s.x, s.y, 2.2, 0, Math.PI * 2);
        ctx2.fill();
      }
    }
  }
  function drawStars(ctx2, canvas2) {
    if (dayNight.factor < 0.3) return;
    const a = (dayNight.factor - 0.3) / 0.7;
    const t = performance.now();
    for (const st of stars) {
      const tw = 0.5 + 0.5 * Math.sin(t * 2e-3 + st.phase);
      ctx2.fillStyle = `rgba(255,255,255,${a * tw * 0.8})`;
      ctx2.beginPath();
      ctx2.arc(st.xf * canvas2.width, st.yf * canvas2.height * 0.6, st.r, 0, Math.PI * 2);
      ctx2.fill();
    }
  }
  function drawWorldBounds(ctx2) {
    const tl = worldToScreen(0, 0);
    ctx2.strokeStyle = "#ff6b6b55";
    ctx2.lineWidth = 6;
    ctx2.strokeRect(tl.x, tl.y, WORLD_W, WORLD_H);
  }
  function drawResource(ctx2, canvas2, r) {
    const s = worldToScreen(r.x, r.y);
    if (s.x < -60 || s.x > canvas2.width + 60 || s.y < -60 || s.y > canvas2.height + 60) return;
    const OUTLINE = "#111815";
    if (r.type === "tree") {
      if (imgTree.complete && imgTree.naturalWidth !== 0) {
        const seed = Math.abs(Math.sin(r.x * 12.9898 + r.y * 78.233) * 43758.5453) % 1;
        const scaleMul = 0.88 + seed * 0.24;
        const rot = (seed - 0.5) * 0.12;
        ctx2.save();
        ctx2.translate(s.x, s.y);
        ctx2.rotate(rot);
        ctx2.scale(scaleMul, scaleMul);
        const dw = r.radius * 3.2;
        const dh = dw * (imgTree.naturalHeight / imgTree.naturalWidth);
        ctx2.drawImage(imgTree, -dw / 2, -dh * 0.75, dw, dh);
        ctx2.restore();
      } else {
        ctx2.fillStyle = "rgba(10, 20, 12, 0.4)";
        ctx2.beginPath();
        ctx2.ellipse(s.x, s.y + r.radius * 0.65, r.radius * 1.1, r.radius * 0.42, 0, 0, Math.PI * 2);
        ctx2.fill();
        ctx2.strokeStyle = "#432f1f";
        ctx2.lineWidth = 4;
        ctx2.lineCap = "round";
        [-1, 1].forEach((side) => {
          const bx = s.x + side * r.radius * 0.28;
          const by = s.y - r.radius * 0.05;
          ctx2.beginPath();
          ctx2.moveTo(s.x, s.y + r.radius * 0.25);
          ctx2.lineTo(bx, by);
          ctx2.lineTo(bx + side * r.radius * 0.3, by - r.radius * 0.22);
          ctx2.stroke();
        });
        ctx2.fillStyle = "#5c402c";
        ctx2.strokeStyle = OUTLINE;
        ctx2.lineWidth = 2.5;
        ctx2.beginPath();
        ctx2.moveTo(s.x - r.radius * 0.16, s.y + r.radius * 0.15);
        ctx2.quadraticCurveTo(s.x - r.radius * 0.2, s.y + r.radius * 0.4, s.x - r.radius * 0.42, s.y + r.radius * 0.65);
        ctx2.lineTo(s.x - r.radius * 0.24, s.y + r.radius * 0.65);
        ctx2.quadraticCurveTo(s.x, s.y + r.radius * 0.48, s.x + r.radius * 0.24, s.y + r.radius * 0.65);
        ctx2.lineTo(s.x + r.radius * 0.42, s.y + r.radius * 0.65);
        ctx2.quadraticCurveTo(s.x + r.radius * 0.2, s.y + r.radius * 0.4, s.x + r.radius * 0.16, s.y + r.radius * 0.15);
        ctx2.closePath();
        ctx2.fill();
        ctx2.stroke();
        ctx2.strokeStyle = "#3a271a";
        ctx2.lineWidth = 1.5;
        ctx2.beginPath();
        ctx2.moveTo(s.x - r.radius * 0.06, s.y + r.radius * 0.22);
        ctx2.quadraticCurveTo(s.x - r.radius * 0.08, s.y + r.radius * 0.45, s.x - r.radius * 0.15, s.y + r.radius * 0.6);
        ctx2.moveTo(s.x + r.radius * 0.06, s.y + r.radius * 0.22);
        ctx2.quadraticCurveTo(s.x + r.radius * 0.08, s.y + r.radius * 0.45, s.x + r.radius * 0.15, s.y + r.radius * 0.6);
        ctx2.stroke();
        const canopy = [
          { dx: -r.radius * 0.44, dy: r.radius * 0.12, rr: r.radius * 0.6 },
          { dx: r.radius * 0.44, dy: r.radius * 0.12, rr: r.radius * 0.6 },
          { dx: -r.radius * 0.42, dy: -r.radius * 0.32, rr: r.radius * 0.66 },
          { dx: r.radius * 0.42, dy: -r.radius * 0.32, rr: r.radius * 0.66 },
          { dx: 0, dy: -r.radius * 0.52, rr: r.radius * 0.72 },
          { dx: 0, dy: -r.radius * 0.08, rr: r.radius * 0.78 }
        ];
        ctx2.fillStyle = OUTLINE;
        for (const b of canopy) {
          ctx2.beginPath();
          ctx2.arc(s.x + b.dx, s.y + b.dy, b.rr + 3.2, 0, Math.PI * 2);
          ctx2.fill();
        }
        for (const b of canopy) {
          ctx2.fillStyle = "#1e3d24";
          ctx2.beginPath();
          ctx2.arc(s.x + b.dx, s.y + b.dy, b.rr, 0, Math.PI * 2);
          ctx2.fill();
        }
        for (const b of canopy) {
          ctx2.fillStyle = radialFill(ctx2, s.x + b.dx, s.y + b.dy, b.rr, "#35663e", "#1e3d24");
          ctx2.beginPath();
          ctx2.arc(s.x + b.dx, s.y + b.dy, b.rr - 1.5, 0, Math.PI * 2);
          ctx2.fill();
        }
        for (const b of canopy) {
          ctx2.fillStyle = "rgba(126, 191, 134, 0.45)";
          ctx2.beginPath();
          ctx2.arc(s.x + b.dx - b.rr * 0.16, s.y + b.dy - b.rr * 0.16, b.rr * 0.72, 0, Math.PI * 2);
          ctx2.fill();
        }
        ctx2.strokeStyle = "rgba(15, 30, 20, 0.42)";
        ctx2.lineWidth = 1.8;
        for (const b of canopy) {
          ctx2.beginPath();
          ctx2.arc(s.x + b.dx + b.rr * 0.15, s.y + b.dy + b.rr * 0.15, b.rr * 0.5, Math.PI * 0.75, Math.PI * 1.25);
          ctx2.stroke();
        }
      }
    } else if (r.type === "iron") {
      if (imgIron.complete && imgIron.naturalWidth !== 0) {
        const seed = Math.abs(Math.sin(r.x * 12.9898 + r.y * 78.233) * 43758.5453) % 1;
        const scaleMul = 0.88 + seed * 0.24;
        const rot = seed * Math.PI * 2;
        ctx2.save();
        ctx2.translate(s.x, s.y);
        ctx2.rotate(rot);
        ctx2.scale(scaleMul, scaleMul);
        const dw = r.radius * 2.8;
        const dh = dw * (imgIron.naturalHeight / imgIron.naturalWidth);
        ctx2.drawImage(imgIron, -dw / 2, -dh * 0.58, dw, dh);
        ctx2.restore();
      } else {
        ctx2.fillStyle = "rgba(10, 18, 14, 0.38)";
        ctx2.beginPath();
        ctx2.ellipse(s.x, s.y + r.radius * 0.4, r.radius * 1.1, r.radius * 0.45, 0, 0, Math.PI * 2);
        ctx2.fill();
        ctx2.fillStyle = "#708090";
        ctx2.strokeStyle = "#2d3748";
        ctx2.lineWidth = 3;
        ctx2.beginPath();
        ctx2.arc(s.x, s.y, r.radius, 0, Math.PI * 2);
        ctx2.fill();
        ctx2.stroke();
      }
    } else {
      if (imgStone.complete && imgStone.naturalWidth !== 0) {
        const seed = Math.abs(Math.sin(r.x * 12.9898 + r.y * 78.233) * 43758.5453) % 1;
        const scaleMul = 0.88 + seed * 0.24;
        const rot = seed * Math.PI * 2;
        ctx2.save();
        ctx2.translate(s.x, s.y);
        ctx2.rotate(rot);
        ctx2.scale(scaleMul, scaleMul);
        const dw = r.radius * 2.7;
        const dh = dw * (imgStone.naturalHeight / imgStone.naturalWidth);
        ctx2.drawImage(imgStone, -dw / 2, -dh * 0.58, dw, dh);
        ctx2.restore();
      } else {
        ctx2.fillStyle = "rgba(10, 18, 14, 0.38)";
        ctx2.beginPath();
        ctx2.ellipse(s.x, s.y + r.radius * 0.4, r.radius * 1.1, r.radius * 0.45, 0, 0, Math.PI * 2);
        ctx2.fill();
        const stones = [
          { dx: -r.radius * 0.36, dy: r.radius * 0.2, rx: r.radius * 0.58, ry: r.radius * 0.48, rot: 0.15 },
          { dx: r.radius * 0.42, dy: r.radius * 0.25, rx: r.radius * 0.45, ry: r.radius * 0.38, rot: -0.3 },
          { dx: r.radius * 0.44, dy: -r.radius * 0.08, rx: r.radius * 0.34, ry: r.radius * 0.28, rot: 0.7 },
          { dx: -r.radius * 0.04, dy: -r.radius * 0.15, rx: r.radius * 0.78, ry: r.radius * 0.65, rot: -0.1 }
        ];
        ctx2.fillStyle = OUTLINE;
        for (const stone of stones) {
          ctx2.save();
          ctx2.translate(s.x + stone.dx, s.y + stone.dy);
          ctx2.rotate(stone.rot);
          ctx2.beginPath();
          ctx2.ellipse(0, 0, stone.rx + 2.8, stone.ry + 2.8, 0, 0, Math.PI * 2);
          ctx2.fill();
          ctx2.restore();
        }
        for (const stone of stones) {
          ctx2.save();
          ctx2.translate(s.x + stone.dx, s.y + stone.dy);
          ctx2.rotate(stone.rot);
          ctx2.fillStyle = radialFill(ctx2, 0, 0, stone.rx, "#85929e", "#4d5656");
          ctx2.beginPath();
          ctx2.ellipse(0, 0, stone.rx, stone.ry, 0, 0, Math.PI * 2);
          ctx2.fill();
          ctx2.fillStyle = "rgba(255, 255, 255, 0.12)";
          ctx2.beginPath();
          ctx2.ellipse(-stone.rx * 0.2, -stone.ry * 0.2, stone.rx * 0.5, stone.ry * 0.4, 0, 0, Math.PI * 2);
          ctx2.fill();
          ctx2.fillStyle = "#596e43";
          ctx2.beginPath();
          ctx2.ellipse(-stone.rx * 0.12, -stone.ry * 0.38, stone.rx * 0.6, stone.ry * 0.32, 0, 0, Math.PI * 2);
          ctx2.fill();
          ctx2.strokeStyle = "#2c3e50";
          ctx2.lineWidth = 2;
          ctx2.beginPath();
          ctx2.moveTo(-stone.rx * 0.55, -stone.ry * 0.08);
          ctx2.lineTo(stone.rx * 0.18, -stone.ry * 0.22);
          ctx2.lineTo(stone.rx * 0.48, stone.ry * 0.38);
          ctx2.stroke();
          ctx2.restore();
        }
        ctx2.strokeStyle = "#1b2631";
        ctx2.lineWidth = 2.2;
        ctx2.beginPath();
        ctx2.moveTo(s.x - r.radius * 0.18, s.y - r.radius * 0.45);
        ctx2.lineTo(s.x - r.radius * 0.04, s.y - r.radius * 0.08);
        ctx2.lineTo(s.x - r.radius * 0.3, s.y + r.radius * 0.28);
        ctx2.stroke();
      }
    }
    if (r.hp < r.maxHp) {
      const w = r.radius * 2;
      ctx2.fillStyle = "#00000088";
      ctx2.fillRect(s.x - w / 2, s.y - r.radius - 12, w, 5);
      ctx2.fillStyle = "#8bd17c";
      ctx2.fillRect(s.x - w / 2, s.y - r.radius - 12, w * (r.hp / r.maxHp), 5);
    }
  }
  function drawCrate(ctx2, c) {
    const s = worldToScreen(c.x, c.y);
    drawShadow(ctx2, s.x, s.y, c.radius);
    ctx2.fillStyle = "#e0b04a";
    ctx2.fillRect(s.x - c.radius, s.y - c.radius, c.radius * 2, c.radius * 2);
    ctx2.strokeStyle = "#8a641f";
    ctx2.lineWidth = 3;
    ctx2.strokeRect(s.x - c.radius, s.y - c.radius, c.radius * 2, c.radius * 2);
    ctx2.beginPath();
    ctx2.moveTo(s.x - c.radius, s.y);
    ctx2.lineTo(s.x + c.radius, s.y);
    ctx2.stroke();
    ctx2.beginPath();
    ctx2.moveTo(s.x, s.y - c.radius);
    ctx2.lineTo(s.x, s.y + c.radius);
    ctx2.stroke();
  }
  function drawStructure(ctx2, st) {
    const s = worldToScreen(st.x, st.y);
    drawShadow(ctx2, s.x, s.y, st.radius);
    const ang = st.angle || 0;
    const lvl = st.level || 1;
    if (st.type === "wall") {
      const tierGray = ["#8f9498", "#a9aeb2", "#c3c8cc"];
      const col = tierGray[st.tier ?? 0];
      const w = st.radius * 2.3, h = st.radius * 1;
      ctx2.save();
      ctx2.translate(s.x, s.y);
      ctx2.rotate(ang + Math.PI / 2);
      ctx2.fillStyle = col;
      ctx2.strokeStyle = "#2a2d30";
      ctx2.lineWidth = 4;
      roundRectPath(ctx2, -w / 2, -h / 2, w, h, 5);
      ctx2.fill();
      ctx2.stroke();
      ctx2.strokeStyle = "rgba(0,0,0,0.32)";
      ctx2.lineWidth = 2.5;
      for (let i = 1; i < 3; i++) {
        const dx = -w / 2 + i * (w / 3);
        ctx2.beginPath();
        ctx2.moveTo(dx, -h / 2 + 3);
        ctx2.lineTo(dx, h / 2 - 3);
        ctx2.stroke();
      }
      ctx2.beginPath();
      ctx2.moveTo(-w / 2 + 3, 0);
      ctx2.lineTo(w / 2 - 3, 0);
      ctx2.stroke();
      ctx2.strokeStyle = "rgba(255,255,255,0.22)";
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      ctx2.moveTo(-w / 2 + 5, -h / 2 + 3);
      ctx2.lineTo(w / 2 - 5, -h / 2 + 3);
      ctx2.stroke();
      ctx2.restore();
    } else if (st.type === "spike") {
      const w = st.radius * 2.4, h = st.radius * 0.62;
      ctx2.save();
      ctx2.translate(s.x, s.y);
      ctx2.rotate(ang + Math.PI / 2);
      const spikeTierColors = ["#b8c0c4", "#d8e0e4", "#f0f8fc"];
      ctx2.fillStyle = spikeTierColors[st.tier ?? 0];
      ctx2.strokeStyle = "#1a1208";
      ctx2.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const px = -w / 2 + (i + 0.5) * (w / 5);
        ctx2.beginPath();
        ctx2.moveTo(px - 5, -h / 2 + 2);
        ctx2.lineTo(px, -h / 2 - h * 1.5);
        ctx2.lineTo(px + 5, -h / 2 + 2);
        ctx2.closePath();
        ctx2.fill();
        ctx2.stroke();
        ctx2.beginPath();
        ctx2.moveTo(px - 5, h / 2 - 2);
        ctx2.lineTo(px, h / 2 + h * 1.5);
        ctx2.lineTo(px + 5, h / 2 - 2);
        ctx2.closePath();
        ctx2.fill();
        ctx2.stroke();
      }
      ctx2.fillStyle = "#7a5230";
      ctx2.strokeStyle = "#2a1c0e";
      ctx2.lineWidth = 3.5;
      roundRectPath(ctx2, -w / 2, -h / 2, w, h, 4);
      ctx2.fill();
      ctx2.stroke();
      ctx2.strokeStyle = "rgba(0,0,0,0.22)";
      ctx2.lineWidth = 1.4;
      ctx2.beginPath();
      ctx2.moveTo(-w / 2 + 4, -h * 0.15);
      ctx2.lineTo(w / 2 - 4, -h * 0.15);
      ctx2.stroke();
      ctx2.beginPath();
      ctx2.moveTo(-w / 2 + 4, h * 0.15);
      ctx2.lineTo(w / 2 - 4, h * 0.15);
      ctx2.stroke();
      ctx2.restore();
    } else if (st.type === "cannon") {
      ctx2.save();
      ctx2.translate(s.x, s.y);
      const baseColors = ["#4a5a5e", "#597b7f", "#6a9a9e", "#3a7d8c", "#ffd76a"];
      ctx2.fillStyle = baseColors[lvl - 1];
      ctx2.strokeStyle = "#1c2426";
      ctx2.lineWidth = 3.5;
      ctx2.beginPath();
      ctx2.arc(0, 0, st.radius, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.stroke();
      ctx2.fillStyle = "#ffffff";
      for (let i = 0; i < lvl; i++) {
        const aDots = i * Math.PI * 2 / lvl;
        ctx2.beginPath();
        ctx2.arc(Math.cos(aDots) * (st.radius * 0.6), Math.sin(aDots) * (st.radius * 0.6), 2, 0, Math.PI * 2);
        ctx2.fill();
      }
      const aimA = st.aimAngle ?? -Math.PI / 2;
      ctx2.rotate(aimA + Math.PI / 2);
      ctx2.fillStyle = "#2f3a3c";
      ctx2.strokeStyle = "#1c2426";
      ctx2.lineWidth = 2.5;
      ctx2.fillRect(-5, -st.radius - 8, 10, 11);
      ctx2.strokeRect(-5, -st.radius - 8, 10, 11);
      ctx2.fillStyle = lvl === 5 ? "#e74c3c" : "#ffd76a";
      ctx2.fillRect(-6, -st.radius - 12, 12, 4);
      ctx2.strokeRect(-6, -st.radius - 12, 12, 4);
      ctx2.restore();
    } else if (st.type === "mortar") {
      ctx2.save();
      ctx2.translate(s.x, s.y);
      ctx2.fillStyle = "#34495e";
      ctx2.strokeStyle = "#1a252f";
      ctx2.lineWidth = 4;
      ctx2.beginPath();
      ctx2.arc(0, 0, st.radius, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.stroke();
      ctx2.strokeStyle = "#f1c40f";
      ctx2.lineWidth = 2.5;
      for (let i = 0; i < 8; i++) {
        const edgeA = i * Math.PI * 2 / 8;
        ctx2.beginPath();
        ctx2.moveTo(Math.cos(edgeA) * (st.radius - 3), Math.sin(edgeA) * (st.radius - 3));
        ctx2.lineTo(Math.cos(edgeA + 0.15) * st.radius, Math.sin(edgeA + 0.15) * st.radius);
        ctx2.stroke();
      }
      const aimA = st.aimAngle ?? -Math.PI / 2;
      ctx2.rotate(aimA + Math.PI / 2);
      ctx2.fillStyle = "#2c3e50";
      ctx2.strokeStyle = "#1a252f";
      ctx2.lineWidth = 2;
      ctx2.fillRect(-7, -st.radius - 3, 14, 12);
      ctx2.strokeRect(-7, -st.radius - 3, 14, 12);
      ctx2.fillStyle = "#111";
      ctx2.beginPath();
      ctx2.arc(0, -st.radius - 1, 5, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.restore();
    } else if (st.type === "sniper") {
      ctx2.save();
      ctx2.translate(s.x, s.y);
      ctx2.fillStyle = "#7f8c8d";
      ctx2.strokeStyle = "#2c3e50";
      ctx2.lineWidth = 3.5;
      ctx2.beginPath();
      ctx2.arc(0, 0, st.radius, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.stroke();
      ctx2.fillStyle = "#34495e";
      ctx2.beginPath();
      ctx2.arc(0, 0, st.radius * 0.6, 0, Math.PI * 2);
      ctx2.fill();
      const aimA = st.aimAngle ?? -Math.PI / 2;
      ctx2.rotate(aimA + Math.PI / 2);
      ctx2.fillStyle = "#333333";
      ctx2.strokeStyle = "#000000";
      ctx2.lineWidth = 1.5;
      ctx2.fillRect(-2, -st.radius - 16, 4, 18);
      ctx2.strokeRect(-2, -st.radius - 16, 4, 18);
      ctx2.fillStyle = "#e74c3c";
      ctx2.beginPath();
      ctx2.arc(0, -st.radius - 16, 2.5, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.restore();
    } else if (st.type === "tesla") {
      ctx2.save();
      ctx2.translate(s.x, s.y);
      ctx2.fillStyle = "#d35400";
      ctx2.strokeStyle = "#873600";
      ctx2.lineWidth = 3.5;
      ctx2.beginPath();
      ctx2.arc(0, 0, st.radius, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.stroke();
      ctx2.strokeStyle = "#e67e22";
      ctx2.lineWidth = 3;
      ctx2.beginPath();
      ctx2.arc(0, 0, st.radius * 0.7, 0, Math.PI * 2);
      ctx2.stroke();
      ctx2.beginPath();
      ctx2.arc(0, 0, st.radius * 0.45, 0, Math.PI * 2);
      ctx2.stroke();
      ctx2.fillStyle = "#5dade2";
      ctx2.strokeStyle = "#2874a6";
      ctx2.lineWidth = 1.5;
      const pulseRadius = st.radius * 0.3 + Math.sin(performance.now() * 0.015) * 1.5;
      ctx2.beginPath();
      ctx2.arc(0, 0, pulseRadius, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.stroke();
      if (Math.random() < 0.35) {
        ctx2.strokeStyle = "#ffffff";
        ctx2.lineWidth = 1.2;
        ctx2.beginPath();
        ctx2.moveTo(0, 0);
        const angleSpark = Math.random() * Math.PI * 2;
        const sparkDist = st.radius * (0.4 + Math.random() * 0.45);
        ctx2.lineTo(Math.cos(angleSpark) * sparkDist, Math.sin(angleSpark) * sparkDist);
        ctx2.stroke();
      }
      ctx2.restore();
    } else if (st.type === "frost") {
      ctx2.save();
      ctx2.translate(s.x, s.y);
      const spec = TOWER_LEVELS.frost[lvl - 1];
      ctx2.fillStyle = "rgba(165, 243, 252, 0.04)";
      ctx2.strokeStyle = "rgba(56, 189, 248, 0.15)";
      ctx2.lineWidth = 1.5;
      ctx2.beginPath();
      ctx2.arc(0, 0, spec.range, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.stroke();
      ctx2.fillStyle = "#a5f3fc";
      ctx2.strokeStyle = "#0284c7";
      ctx2.lineWidth = 3.5;
      ctx2.beginPath();
      ctx2.arc(0, 0, st.radius, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.stroke();
      ctx2.fillStyle = "#e0f2fe";
      ctx2.beginPath();
      for (let i = 0; i < 6; i++) {
        const shardA = i * Math.PI * 2 / 6;
        ctx2.lineTo(Math.cos(shardA) * (st.radius * 0.8), Math.sin(shardA) * (st.radius * 0.8));
      }
      ctx2.closePath();
      ctx2.fill();
      ctx2.stroke();
      ctx2.restore();
    } else if (st.type === "toxic") {
      ctx2.save();
      ctx2.translate(s.x, s.y);
      ctx2.fillStyle = "#1e8449";
      ctx2.strokeStyle = "#145a32";
      ctx2.lineWidth = 3.5;
      ctx2.beginPath();
      ctx2.arc(0, 0, st.radius, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.stroke();
      ctx2.fillStyle = "#2ecc71";
      const nowBubble = performance.now();
      [[-6, -6], [6, -6], [-6, 6], [6, 6]].forEach(([ox, oy], i) => {
        const pRadius = 3 + Math.sin(nowBubble * 8e-3 + i) * 1;
        ctx2.beginPath();
        ctx2.arc(ox, oy, pRadius, 0, Math.PI * 2);
        ctx2.fill();
      });
      const aimA = st.aimAngle ?? -Math.PI / 2;
      ctx2.rotate(aimA + Math.PI / 2);
      ctx2.fillStyle = "#27ae60";
      ctx2.strokeStyle = "#145a32";
      ctx2.lineWidth = 2;
      ctx2.fillRect(-4, -st.radius - 4, 8, 10);
      ctx2.strokeRect(-4, -st.radius - 4, 8, 10);
      ctx2.restore();
    } else if (st.type === "factory") {
      const w = st.radius * 2.1, h = st.radius * 1.5;
      ctx2.save();
      ctx2.translate(s.x, s.y);
      ctx2.rotate(ang + Math.PI / 2);
      ctx2.fillStyle = "#c0392b";
      ctx2.strokeStyle = "#78281f";
      ctx2.lineWidth = 4;
      roundRectPath(ctx2, -w / 2, -h / 2, w, h, 6);
      ctx2.fill();
      ctx2.stroke();
      ctx2.fillStyle = "#922b21";
      ctx2.beginPath();
      ctx2.moveTo(-w / 2, -h / 2);
      ctx2.lineTo(-w / 4, -h / 2 - 8);
      ctx2.lineTo(-w / 4, -h / 2);
      ctx2.lineTo(0, -h / 2 - 8);
      ctx2.lineTo(0, -h / 2);
      ctx2.lineTo(w / 4, -h / 2 - 8);
      ctx2.lineTo(w / 4, -h / 2);
      ctx2.lineTo(w / 2, -h / 2 - 8);
      ctx2.lineTo(w / 2, -h / 2);
      ctx2.closePath();
      ctx2.fill();
      ctx2.stroke();
      ctx2.fillStyle = "#7f8c8d";
      ctx2.strokeStyle = "#2c3e50";
      ctx2.lineWidth = 2;
      ctx2.fillRect(-w * 0.3, -h / 2 - 14, 5, 12);
      ctx2.strokeRect(-w * 0.3, -h / 2 - 14, 5, 12);
      ctx2.fillRect(w * 0.2, -h / 2 - 14, 5, 12);
      ctx2.strokeRect(w * 0.2, -h / 2 - 14, 5, 12);
      ctx2.restore();
      if (Math.random() < 0.12) {
        const smokeX = s.x + (Math.random() < 0.5 ? -w * 0.3 : w * 0.2);
        const smokeY = s.y - h / 2 - 14;
      }
    } else if (st.type === "campfire") {
      ctx2.fillStyle = "#5c4530";
      ctx2.strokeStyle = "#22190f";
      ctx2.lineWidth = 3;
      ctx2.beginPath();
      ctx2.arc(s.x, s.y, st.radius, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.stroke();
      ctx2.fillStyle = "#ff9f43";
      ctx2.beginPath();
      ctx2.arc(s.x, s.y - 3, st.radius * 0.4, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.fillStyle = "#ffe066";
      ctx2.beginPath();
      ctx2.arc(s.x, s.y - 6, st.radius * 0.2, 0, Math.PI * 2);
      ctx2.fill();
    } else if (st.type === "shop") {
      const w = st.radius * 2.2, h = st.radius * 1.3;
      ctx2.save();
      ctx2.translate(s.x, s.y);
      ctx2.rotate(ang + Math.PI / 2);
      ctx2.fillStyle = "#7a5230";
      ctx2.strokeStyle = "#2a1c0e";
      ctx2.lineWidth = 3.5;
      roundRectPath(ctx2, -w / 2, -h / 2, w, h, 5);
      ctx2.fill();
      ctx2.stroke();
      const stripes = 5;
      for (let i = 0; i < stripes; i++) {
        ctx2.fillStyle = i % 2 === 0 ? "#c98b4a" : "#ffd76a";
        const sx0 = -w / 2 + i * (w / stripes);
        ctx2.beginPath();
        ctx2.moveTo(sx0, -h / 2);
        ctx2.lineTo(sx0 + w / stripes, -h / 2);
        ctx2.lineTo(sx0 + w / stripes * 0.6, -h / 2 - 10);
        ctx2.lineTo(sx0 + w / stripes * 0.4, -h / 2 - 10);
        ctx2.closePath();
        ctx2.fill();
      }
      ctx2.strokeStyle = "#2a1c0e";
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      ctx2.moveTo(-w / 2, -h / 2);
      ctx2.lineTo(w / 2, -h / 2);
      ctx2.stroke();
      ctx2.restore();
      ctx2.fillStyle = "#ffd76a";
      ctx2.beginPath();
      ctx2.arc(s.x, s.y - st.radius * 0.1, st.radius * 0.32, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.strokeStyle = "#8a641f";
      ctx2.lineWidth = 2;
      ctx2.stroke();
      ctx2.fillStyle = "#7a5230";
      ctx2.font = `bold ${Math.round(st.radius * 0.4)}px 'Orbitron', sans-serif`;
      ctx2.textAlign = "center";
      ctx2.fillText("$", s.x, s.y - st.radius * 0.1 + st.radius * 0.14);
    }
    if (st.type === "cannon" || st.type === "mortar" || st.type === "sniper" || st.type === "tesla" || st.type === "frost" || st.type === "toxic") {
      ctx2.save();
      ctx2.fillStyle = "rgba(10, 18, 14, 0.72)";
      ctx2.strokeStyle = "rgba(255, 215, 106, 0.25)";
      ctx2.lineWidth = 1;
      roundRectPath(ctx2, s.x - 14, s.y - st.radius - 23, 28, 9, 2);
      ctx2.fill();
      ctx2.stroke();
      ctx2.fillStyle = "#ffd76a";
      ctx2.font = "bold 8px 'Share Tech Mono', monospace";
      ctx2.textAlign = "center";
      ctx2.fillText("LV " + lvl, s.x, s.y - st.radius - 16);
      ctx2.restore();
    }
    if (st.hp < st.maxHp) {
      const w = st.radius * 2;
      ctx2.fillStyle = "#00000088";
      ctx2.fillRect(s.x - w / 2, s.y - st.radius - 14, w, 5);
      ctx2.fillStyle = "#e2b477";
      ctx2.fillRect(s.x - w / 2, s.y - st.radius - 14, w * (st.hp / st.maxHp), 5);
    }
    const mp = mouseWorldPos2();
    const isHovered = dist(mp.x, mp.y, st.x, st.y) <= st.radius + 10;
    const isSelected = st === inspectedStructure;
    if (isSelected || isHovered) {
      ctx2.save();
      ctx2.strokeStyle = isSelected ? "#ffd76a" : "#4ecdc4";
      ctx2.lineWidth = 2.2;
      ctx2.setLineDash([4, 3]);
      ctx2.beginPath();
      ctx2.arc(s.x, s.y, st.radius + 6, 0, Math.PI * 2);
      ctx2.stroke();
      ctx2.setLineDash([]);
      let range = null;
      if (st.type === "cannon" || st.type === "mortar" || st.type === "sniper" || st.type === "tesla" || st.type === "frost" || st.type === "toxic") {
        const currentLevel = st.level || 1;
        const specList = TOWER_LEVELS[st.type];
        if (specList && specList[currentLevel - 1]) {
          range = specList[currentLevel - 1].range;
        }
      } else if (st.type === "campfire") {
        range = st.healRadius || 150;
      }
      if (range) {
        ctx2.strokeStyle = isSelected ? "rgba(255, 215, 106, 0.75)" : "rgba(78, 205, 196, 0.55)";
        ctx2.lineWidth = 1.8;
        ctx2.setLineDash([6, 4]);
        ctx2.beginPath();
        ctx2.arc(s.x, s.y, range, 0, Math.PI * 2);
        ctx2.stroke();
        ctx2.fillStyle = isSelected ? "rgba(255, 215, 106, 0.06)" : "rgba(78, 205, 196, 0.04)";
        ctx2.beginPath();
        ctx2.arc(s.x, s.y, range, 0, Math.PI * 2);
        ctx2.fill();
      }
      ctx2.restore();
    }
  }
  function drawBuildPreview(ctx2) {
    if (!player.alive || shopOpen || !selectedBuild || findNearestShop(80)) return;
    const target = getBuildTarget();
    const s = worldToScreen(target.cx, target.cy);
    const half = TILE / 2;
    let color = "#8bd17c";
    let label = "";
    if (target.occupant && target.canUpgrade) {
      if (target.occupant.type === "wall" || target.occupant.type === "spike") {
        const tiers = STRUCTURE_TIERS[target.occupant.type];
        const next = tiers[(target.occupant.tier || 0) + 1];
        if (next) {
          color = "#4ecdc4";
          label = "UPGRADE  " + next.pointsCost + " pts";
        } else {
          color = "#8bd17c";
          label = "MAX TIER";
        }
      } else if (target.occupant.type === "cannon" || target.occupant.type === "mortar" || target.occupant.type === "sniper" || target.occupant.type === "tesla" || target.occupant.type === "frost" || target.occupant.type === "toxic") {
        const lvl = target.occupant.level || 1;
        if (lvl < 5) {
          const levels = TOWER_LEVELS[target.occupant.type];
          const nextSpec = levels[lvl];
          const costInfo = nextSpec.cost;
          if (costInfo) {
            color = "#ffd76a";
            label = "UPGRADE  " + costInfo.amount + " " + costInfo.resource;
          }
        } else {
          color = "#8bd17c";
          label = "MAX LEVEL";
        }
      }
    } else if (target.occupant) {
      color = "#ff5c5c";
      label = "occupied";
    } else if (target.blockedByResource) {
      color = "#ff5c5c";
      label = "blocked";
    } else if (!target.canAfford) {
      color = "#ff9f43";
      label = "not enough materials";
    }
    ctx2.save();
    ctx2.strokeStyle = color;
    ctx2.lineWidth = 2;
    ctx2.setLineDash([5, 4]);
    ctx2.strokeRect(s.x - half, s.y - half, TILE, TILE);
    ctx2.setLineDash([]);
    ctx2.globalAlpha = 0.12;
    ctx2.fillStyle = color;
    ctx2.fillRect(s.x - half, s.y - half, TILE, TILE);
    ctx2.globalAlpha = 1;
    ctx2.restore();
    if (!target.occupant && !target.blockedByResource) {
      const def = BUILD_DEFS[selectedBuild];
      const ghostAngle = getPlacementAngle();
      const ghost = { type: selectedBuild, x: target.cx, y: target.cy, radius: def.radius, hp: def.hp, maxHp: def.hp, angle: ghostAngle };
      if (selectedBuild === "cannon" || selectedBuild === "mortar" || selectedBuild === "sniper" || selectedBuild === "tesla" || selectedBuild === "frost" || selectedBuild === "toxic") {
        ghost.aimAngle = ghostAngle;
        ghost.level = 1;
      }
      ctx2.save();
      ctx2.globalAlpha = 0.5;
      drawStructure(ctx2, ghost);
      ctx2.restore();
    }
    if (label) {
      ctx2.font = "12px 'Share Tech Mono', monospace";
      ctx2.textAlign = "center";
      ctx2.fillStyle = color;
      ctx2.fillText(label, s.x, s.y - half - 8);
    }
  }
  function minimapPoint(wx, wy, mapX, mapY) {
    return { x: mapX + wx / WORLD_W * MINIMAP_SIZE, y: mapY + wy / WORLD_H * MINIMAP_SIZE };
  }
  function drawMinimap(ctx2, canvas2) {
    const mapX = canvas2.width - MINIMAP_SIZE - MINIMAP_MARGIN;
    const mapY = MINIMAP_MARGIN;
    const now = performance.now();
    ctx2.save();
    ctx2.fillStyle = "rgba(16,29,24,0.85)";
    ctx2.strokeStyle = dayNight.isNight ? "#7c9bd1" : "#2c4536";
    ctx2.lineWidth = 2;
    ctx2.fillRect(mapX, mapY, MINIMAP_SIZE, MINIMAP_SIZE);
    ctx2.strokeRect(mapX, mapY, MINIMAP_SIZE, MINIMAP_SIZE);
    ctx2.beginPath();
    ctx2.rect(mapX, mapY, MINIMAP_SIZE, MINIMAP_SIZE);
    ctx2.clip();
    let baseX = WORLD_W / 2, baseY = WORLD_H / 2;
    if (structures.length > 0) {
      let sx = 0, sy = 0;
      for (const st of structures) {
        sx += st.x;
        sy += st.y;
      }
      baseX = sx / structures.length;
      baseY = sy / structures.length;
    }
    const basePt = minimapPoint(baseX, baseY, mapX, mapY);
    ctx2.fillStyle = "#c98b4a";
    ctx2.strokeStyle = "#2a1c0e";
    ctx2.lineWidth = 1;
    ctx2.beginPath();
    ctx2.moveTo(basePt.x, basePt.y - 5);
    ctx2.lineTo(basePt.x - 5, basePt.y + 4);
    ctx2.lineTo(basePt.x + 5, basePt.y + 4);
    ctx2.closePath();
    ctx2.fill();
    ctx2.stroke();
    ctx2.fillStyle = "#e0b04a";
    for (const c of crates) {
      const p = minimapPoint(c.x, c.y, mapX, mapY);
      ctx2.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    for (const pu of powerups) {
      const p = minimapPoint(pu.x, pu.y, mapX, mapY);
      const def = POWERUP_DEFS[pu.kind];
      const pulse = 0.6 + 0.4 * Math.sin(now * 6e-3);
      ctx2.fillStyle = def.color;
      ctx2.beginPath();
      ctx2.arc(p.x, p.y, 3 * pulse, 0, Math.PI * 2);
      ctx2.fill();
    }
    if (activeBoss) {
      const p = minimapPoint(activeBoss.x, activeBoss.y, mapX, mapY);
      const pulse = 0.7 + 0.3 * Math.sin(now * 0.01);
      ctx2.fillStyle = "#c084fc";
      ctx2.beginPath();
      ctx2.arc(p.x, p.y, 5 * pulse, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.strokeStyle = "#ffffff";
      ctx2.lineWidth = 1;
      ctx2.stroke();
    }
    const pp = minimapPoint(player.x, player.y, mapX, mapY);
    ctx2.fillStyle = "#eaf3ec";
    ctx2.strokeStyle = "#0a1410";
    ctx2.lineWidth = 1;
    ctx2.beginPath();
    ctx2.arc(pp.x, pp.y, 4, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.stroke();
    ctx2.strokeStyle = "#eaf3ec";
    ctx2.lineWidth = 2;
    ctx2.beginPath();
    ctx2.moveTo(pp.x, pp.y);
    ctx2.lineTo(pp.x + Math.cos(player.angle) * 9, pp.y + Math.sin(player.angle) * 9);
    ctx2.stroke();
    ctx2.restore();
    ctx2.fillStyle = dayNight.isNight ? "rgba(124,155,209,0.85)" : "rgba(234,243,236,0.55)";
    ctx2.font = "10px 'Orbitron', sans-serif";
    ctx2.textAlign = "center";
    ctx2.fillText(dayNight.isNight ? "MAP \xB7 NIGHT" : "MAP", mapX + MINIMAP_SIZE / 2, mapY + MINIMAP_SIZE + 13);
  }
  function drawFireZones(ctx2) {
    const now = performance.now();
    ctx2.save();
    for (const fz of fireZones) {
      const s = worldToScreen(fz.x, fz.y);
      const pulse = 1 + 0.08 * Math.sin(now * 0.01 + fz.x);
      const grad = ctx2.createRadialGradient(s.x, s.y, fz.radius * 0.1, s.x, s.y, fz.radius * pulse);
      grad.addColorStop(0, "rgba(255, 100, 30, 0.42)");
      grad.addColorStop(0.5, "rgba(230, 70, 10, 0.22)");
      grad.addColorStop(1, "rgba(150, 20, 0, 0)");
      ctx2.fillStyle = grad;
      ctx2.beginPath();
      ctx2.arc(s.x, s.y, fz.radius * pulse, 0, Math.PI * 2);
      ctx2.fill();
      if (Math.random() < 0.15) {
        const sparkA = Math.random() * Math.PI * 2;
        const sparkD = Math.random() * fz.radius * 0.7;
        ctx2.fillStyle = "#ffcc00";
        ctx2.beginPath();
        ctx2.arc(s.x + Math.cos(sparkA) * sparkD, s.y + Math.sin(sparkA) * sparkD, 2, 0, Math.PI * 2);
        ctx2.fill();
      }
    }
    ctx2.restore();
  }
  function drawToxicClouds(ctx2) {
    const now = performance.now();
    ctx2.save();
    for (const tc of toxicClouds) {
      const s = worldToScreen(tc.x, tc.y);
      const pulse = 1 + 0.05 * Math.sin(now * 7e-3 + tc.x);
      const grad = ctx2.createRadialGradient(s.x, s.y, tc.radius * 0.2, s.x, s.y, tc.radius * pulse);
      grad.addColorStop(0, "rgba(46, 204, 113, 0.32)");
      grad.addColorStop(0.6, "rgba(39, 174, 96, 0.16)");
      grad.addColorStop(1, "rgba(20, 90, 50, 0)");
      ctx2.fillStyle = grad;
      ctx2.beginPath();
      ctx2.arc(s.x, s.y, tc.radius * pulse, 0, Math.PI * 2);
      ctx2.fill();
      if (Math.random() < 0.1) {
        const bubbleA = Math.random() * Math.PI * 2;
        const bubbleD = Math.random() * tc.radius * 0.8;
        ctx2.fillStyle = "rgba(46, 204, 113, 0.45)";
        ctx2.beginPath();
        ctx2.arc(s.x + Math.cos(bubbleA) * bubbleD, s.y + Math.sin(bubbleA) * bubbleD, 3, 0, Math.PI * 2);
        ctx2.fill();
      }
    }
    ctx2.restore();
  }
  function drawSniperLasers(ctx2) {
    const now = performance.now();
    ctx2.save();
    for (const sl of sniperLasers) {
      const s = worldToScreen(sl.sx, sl.sy);
      const t = worldToScreen(sl.tx, sl.ty);
      const alpha = Math.max(0, (sl.endsAt - now) / 150);
      ctx2.strokeStyle = `rgba(255, 92, 92, ${alpha * 0.65})`;
      ctx2.lineWidth = 4.5;
      ctx2.beginPath();
      ctx2.moveTo(s.x, s.y);
      ctx2.lineTo(t.x, t.y);
      ctx2.stroke();
      ctx2.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
      ctx2.lineWidth = 1.8;
      ctx2.beginPath();
      ctx2.moveTo(s.x, s.y);
      ctx2.lineTo(t.x, t.y);
      ctx2.stroke();
    }
    ctx2.restore();
  }
  function drawTeslaChains(ctx2) {
    const now = performance.now();
    ctx2.save();
    for (const tc of teslaChains) {
      const alpha = Math.max(0, (tc.endsAt - now) / 100);
      ctx2.strokeStyle = `rgba(137, 207, 240, ${alpha * 0.9})`;
      ctx2.shadowColor = "#89cff0";
      ctx2.shadowBlur = 8;
      for (const seg of tc.segments) {
        const s = worldToScreen(seg.sx, seg.sy);
        const t = worldToScreen(seg.tx, seg.ty);
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const len = Math.hypot(dx, dy);
        const steps = Math.max(3, Math.floor(len / 15));
        ctx2.lineWidth = 2.5;
        ctx2.beginPath();
        ctx2.moveTo(s.x, s.y);
        for (let i = 1; i < steps; i++) {
          const tVal = i / steps;
          const px = s.x + dx * tVal;
          const py = s.y + dy * tVal;
          const normalX = -dy / len;
          const normalY = dx / len;
          const offset = (Math.random() - 0.5) * 8.5;
          ctx2.lineTo(px + normalX * offset, py + normalY * offset);
        }
        ctx2.lineTo(t.x, t.y);
        ctx2.stroke();
      }
      ctx2.shadowBlur = 0;
    }
    ctx2.restore();
  }

  // src/render/drawZombie.ts
  function def_ranged(z) {
    return !!ZTYPE[z.type].ranged;
  }
  function drawZombieArmBlobs(ctx2, sx, sy, radius, angle, spread, reach, bodyCol, bodyCol2, OUTLINE, flashing) {
    const armColor = flashing ? "#ffffff" : ARM_SHADOW;
    [-1, 1].forEach((side) => {
      const armAngle = angle + side * spread;
      const blobDist = radius * reach;
      const bx = sx + Math.cos(armAngle) * blobDist, by = sy + Math.sin(armAngle) * blobDist;
      const blobR = radius * 0.52;
      ctx2.strokeStyle = OUTLINE;
      ctx2.lineCap = "round";
      ctx2.lineWidth = radius * 0.6 + 5;
      ctx2.beginPath();
      ctx2.moveTo(sx, sy);
      ctx2.lineTo(bx, by);
      ctx2.stroke();
      ctx2.strokeStyle = armColor;
      ctx2.lineWidth = radius * 0.6;
      ctx2.beginPath();
      ctx2.moveTo(sx, sy);
      ctx2.lineTo(bx, by);
      ctx2.stroke();
      ctx2.lineCap = "butt";
      ctx2.fillStyle = flashing ? "#ffffff" : radialFill(ctx2, bx, by, blobR, bodyCol, bodyCol2);
      ctx2.beginPath();
      ctx2.arc(bx, by, blobR, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.strokeStyle = OUTLINE;
      ctx2.lineWidth = 2.5;
      ctx2.stroke();
      ctx2.fillStyle = "rgba(255,255,255,0.22)";
      ctx2.beginPath();
      ctx2.ellipse(bx - blobR * 0.3, by - blobR * 0.35, blobR * 0.32, blobR * 0.2, -0.4, 0, Math.PI * 2);
      ctx2.fill();
    });
  }
  function drawBossZombie(ctx2, z, s, angle, flashing, OUTLINE) {
    const r = z.radius;
    const bodyCol = flashing ? "#ffffff" : z.skinColor;
    const bodyCol2 = flashing ? "#ffffff" : z.skinColor2;
    [-1, 1].forEach((side) => {
      const a = angle + side * Math.PI / 2.1;
      const px = s.x + Math.cos(a) * r * 0.95, py = s.y + Math.sin(a) * r * 0.95;
      ctx2.fillStyle = "#5c4a34";
      ctx2.strokeStyle = OUTLINE;
      ctx2.lineWidth = 3;
      ctx2.beginPath();
      ctx2.ellipse(px, py, r * 0.42, r * 0.36, a, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.stroke();
      ctx2.fillStyle = "#3f3222";
      ctx2.beginPath();
      ctx2.ellipse(px, py, r * 0.22, r * 0.18, a, 0, Math.PI * 2);
      ctx2.fill();
    });
    [-0.62, 0.62].forEach((off) => {
      const a = angle + off;
      const ax = s.x + Math.cos(a) * r * 0.95, ay = s.y + Math.sin(a) * r * 0.95;
      ctx2.fillStyle = bodyCol2;
      ctx2.strokeStyle = OUTLINE;
      ctx2.lineWidth = 3;
      ctx2.beginPath();
      ctx2.arc(ax, ay, r * 0.34, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.stroke();
      ctx2.fillStyle = "#e8e2d0";
      for (let i = -1; i <= 1; i++) {
        const fa = a + i * 0.4;
        const fx = ax + Math.cos(fa) * r * 0.34, fy = ay + Math.sin(fa) * r * 0.34;
        ctx2.beginPath();
        ctx2.moveTo(fx, fy);
        ctx2.lineTo(fx + Math.cos(fa) * 10, fy + Math.sin(fa) * 10);
        ctx2.lineTo(fx + Math.cos(fa + 0.25) * 4, fy + Math.sin(fa + 0.25) * 4);
        ctx2.closePath();
        ctx2.fill();
        ctx2.stroke();
      }
    });
    for (let i = 0; i < 9; i++) {
      const a = angle + i / 9 * Math.PI * 2;
      ctx2.fillStyle = "#7c3aed";
      ctx2.strokeStyle = OUTLINE;
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      ctx2.moveTo(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r);
      ctx2.lineTo(s.x + Math.cos(a + 0.16) * (r + 18), s.y + Math.sin(a + 0.16) * (r + 18));
      ctx2.lineTo(s.x + Math.cos(a - 0.16) * (r + 18), s.y + Math.sin(a - 0.16) * (r + 18));
      ctx2.closePath();
      ctx2.fill();
      ctx2.stroke();
    }
    ctx2.fillStyle = radialFill(ctx2, s.x, s.y, r, bodyCol, bodyCol2);
    ctx2.beginPath();
    ctx2.ellipse(s.x, s.y, r, r * 0.98, 0, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.strokeStyle = OUTLINE;
    ctx2.lineWidth = 4.5;
    ctx2.stroke();
    ctx2.strokeStyle = "#a855f7";
    ctx2.lineWidth = 3.5;
    ctx2.beginPath();
    ctx2.moveTo(s.x - Math.cos(angle) * r * 0.4, s.y - Math.sin(angle) * r * 0.4);
    ctx2.lineTo(s.x + Math.cos(angle + 0.5) * r * 0.1, s.y + Math.sin(angle + 0.5) * r * 0.1);
    ctx2.lineTo(s.x + Math.cos(angle - 0.5) * r * 0.4, s.y + Math.sin(angle - 0.5) * r * 0.4);
    ctx2.stroke();
    ctx2.fillStyle = "rgba(0,0,0,0.18)";
    for (let i = 0; i < 7; i++) {
      const a = angle + i * 2.44 + i * i * 0.7;
      const rr = r * (0.35 + i % 3 * 0.16);
      const mx2 = s.x + Math.cos(a) * rr, my2 = s.y + Math.sin(a) * rr;
      ctx2.beginPath();
      ctx2.ellipse(mx2, my2, r * 0.13, r * 0.09, a, 0, Math.PI * 2);
      ctx2.fill();
    }
    ctx2.fillStyle = "rgba(255,255,255,0.16)";
    ctx2.beginPath();
    ctx2.ellipse(s.x - r * 0.32, s.y - r * 0.38, r * 0.34, r * 0.2, -0.4, 0, Math.PI * 2);
    ctx2.fill();
    const snoutX = s.x + Math.cos(angle) * r * 0.78, snoutY = s.y + Math.sin(angle) * r * 0.78;
    ctx2.fillStyle = radialFill(ctx2, snoutX, snoutY, r * 0.5, bodyCol2, z.skinDark);
    ctx2.beginPath();
    ctx2.ellipse(snoutX, snoutY, r * 0.46, r * 0.34, angle, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.strokeStyle = OUTLINE;
    ctx2.lineWidth = 3;
    ctx2.stroke();
    ctx2.fillStyle = "#f0ead6";
    ctx2.strokeStyle = OUTLINE;
    ctx2.lineWidth = 2;
    [-0.55, 0.55].forEach((off) => {
      const a = angle + off;
      const bx = snoutX + Math.cos(a) * r * 0.3, by = snoutY + Math.sin(a) * r * 0.3;
      ctx2.beginPath();
      ctx2.moveTo(bx, by);
      ctx2.quadraticCurveTo(bx + Math.cos(angle) * 14, by + Math.sin(angle) * 14 - 10, bx + Math.cos(angle) * 22, by + Math.sin(angle) * 22 - 16);
      ctx2.lineTo(bx + Math.cos(angle) * 10, by + Math.sin(angle) * 10);
      ctx2.closePath();
      ctx2.fill();
      ctx2.stroke();
    });
    ctx2.fillStyle = z.skinDark;
    [-0.3, 0.3].forEach((off) => {
      const a = angle + off;
      const nx = snoutX + Math.cos(a) * r * 0.32 + Math.cos(angle) * r * 0.14, ny = snoutY + Math.sin(a) * r * 0.32 + Math.sin(angle) * r * 0.14;
      ctx2.beginPath();
      ctx2.ellipse(nx, ny, r * 0.06, r * 0.04, angle, 0, Math.PI * 2);
      ctx2.fill();
    });
    ctx2.fillStyle = "#e8e2d0";
    ctx2.strokeStyle = OUTLINE;
    ctx2.lineWidth = 3;
    [-0.95, 0.95].forEach((off) => {
      const ha = angle + off;
      const bx = s.x + Math.cos(ha) * r * 0.75, by = s.y + Math.sin(ha) * r * 0.75;
      const tx = s.x + Math.cos(ha) * r * 1.55, ty = s.y + Math.sin(ha) * r * 1.55;
      ctx2.beginPath();
      ctx2.moveTo(bx, by);
      ctx2.quadraticCurveTo(bx + Math.cos(ha + 0.6) * 20, by + Math.sin(ha + 0.6) * 20, tx, ty);
      ctx2.lineTo(bx + Math.cos(ha - 0.25) * 14, by + Math.sin(ha - 0.25) * 14);
      ctx2.closePath();
      ctx2.fill();
      ctx2.stroke();
    });
    ctx2.fillStyle = bodyCol2;
    ctx2.strokeStyle = OUTLINE;
    ctx2.lineWidth = 2.5;
    [angle - Math.PI / 2, angle + Math.PI / 2].forEach((a) => {
      const ex = s.x + Math.cos(a) * r * 0.9, ey = s.y + Math.sin(a) * r * 0.9;
      const tx = s.x + Math.cos(a) * r * 1.2, ty = s.y + Math.sin(a) * r * 1.2;
      ctx2.beginPath();
      ctx2.moveTo(ex - 8, ey - 8);
      ctx2.lineTo(tx, ty);
      ctx2.lineTo(ex + 8, ey + 8);
      ctx2.closePath();
      ctx2.fill();
      ctx2.stroke();
    });
    ctx2.fillStyle = "#ff3b3b";
    [angle - 0.4, angle + 0.4].forEach((a) => {
      const ex = s.x + Math.cos(a) * r * 0.34, ey = s.y + Math.sin(a) * r * 0.34;
      ctx2.beginPath();
      ctx2.ellipse(ex, ey, r * 0.11, r * 0.06, angle, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.strokeStyle = "#1a0a0a";
      ctx2.lineWidth = 2.5;
      ctx2.beginPath();
      ctx2.moveTo(ex - Math.cos(angle) * 8 + Math.sin(angle) * 6 * (a < angle ? 1 : -1), ey - Math.sin(angle) * 8 - Math.cos(angle) * 6 * (a < angle ? 1 : -1));
      ctx2.lineTo(ex + Math.cos(angle) * 8 + Math.sin(angle) * 6 * (a < angle ? 1 : -1), ey + Math.sin(angle) * 8 - Math.cos(angle) * 6 * (a < angle ? 1 : -1));
      ctx2.stroke();
    });
    const mx = snoutX + Math.cos(angle) * r * 0.2, my = snoutY + Math.sin(angle) * r * 0.2;
    ctx2.fillStyle = "#1a0a0a";
    ctx2.beginPath();
    ctx2.ellipse(mx, my, r * 0.26, r * 0.14, angle, 0, Math.PI);
    ctx2.fill();
    ctx2.fillStyle = "#f0ead6";
    for (let i = -2; i <= 2; i++) {
      const ta = angle + Math.PI / 2;
      const tx2 = mx + Math.cos(ta) * i * r * 0.09, ty2 = my + Math.sin(ta) * i * r * 0.09;
      ctx2.beginPath();
      ctx2.moveTo(tx2 - 4, ty2);
      ctx2.lineTo(tx2, ty2 + 8);
      ctx2.lineTo(tx2 + 4, ty2);
      ctx2.closePath();
      ctx2.fill();
    }
  }
  function drawWolfZombie(ctx2, z, s, angle, flashing, OUTLINE) {
    const r = z.radius;
    const bodyCol = flashing ? "#ffffff" : z.skinColor;
    const bodyCol2 = flashing ? "#ffffff" : z.skinColor2;
    const legCol = flashing ? "#ffffff" : z.skinDark;
    const fx = Math.cos(angle), fy = Math.sin(angle);
    const px = Math.cos(angle + Math.PI / 2), py = Math.sin(angle + Math.PI / 2);
    const tailBaseX = s.x - fx * r * 0.85, tailBaseY = s.y - fy * r * 0.85;
    const tailTipX = s.x - fx * r * 1.8 + px * r * 0.3, tailTipY = s.y - fy * r * 1.8 + py * r * 0.3;
    ctx2.lineCap = "round";
    ctx2.strokeStyle = OUTLINE;
    ctx2.lineWidth = r * 0.34 + 4;
    ctx2.beginPath();
    ctx2.moveTo(tailBaseX, tailBaseY);
    ctx2.quadraticCurveTo(s.x - fx * r * 1.5, s.y - fy * r * 1.5, tailTipX, tailTipY);
    ctx2.stroke();
    ctx2.strokeStyle = legCol;
    ctx2.lineWidth = r * 0.34;
    ctx2.beginPath();
    ctx2.moveTo(tailBaseX, tailBaseY);
    ctx2.quadraticCurveTo(s.x - fx * r * 1.5, s.y - fy * r * 1.5, tailTipX, tailTipY);
    ctx2.stroke();
    ctx2.lineCap = "butt";
    [[0.5, 1], [0.5, -1], [-0.45, 1], [-0.45, -1]].forEach(([along, side]) => {
      const hipX = s.x + fx * r * along, hipY = s.y + fy * r * along;
      const footX = hipX + px * r * 0.55 * side, footY = hipY + py * r * 0.55 * side;
      ctx2.lineCap = "round";
      ctx2.strokeStyle = OUTLINE;
      ctx2.lineWidth = r * 0.3 + 4;
      ctx2.beginPath();
      ctx2.moveTo(hipX, hipY);
      ctx2.lineTo(footX, footY);
      ctx2.stroke();
      ctx2.strokeStyle = legCol;
      ctx2.lineWidth = r * 0.3;
      ctx2.beginPath();
      ctx2.moveTo(hipX, hipY);
      ctx2.lineTo(footX, footY);
      ctx2.stroke();
      ctx2.lineCap = "butt";
      ctx2.fillStyle = OUTLINE;
      ctx2.beginPath();
      ctx2.arc(footX, footY, r * 0.14, 0, Math.PI * 2);
      ctx2.fill();
    });
    ctx2.fillStyle = radialFill(ctx2, s.x, s.y, r, bodyCol, bodyCol2);
    ctx2.beginPath();
    ctx2.ellipse(s.x, s.y, r * 1.05, r * 0.68, angle, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.strokeStyle = OUTLINE;
    ctx2.lineWidth = 3;
    ctx2.stroke();
    ctx2.lineCap = "round";
    ctx2.strokeStyle = legCol;
    ctx2.lineWidth = r * 0.12;
    ctx2.beginPath();
    ctx2.moveTo(s.x - fx * r * 0.75, s.y - fy * r * 0.75);
    ctx2.lineTo(s.x + fx * r * 0.55, s.y + fy * r * 0.55);
    ctx2.stroke();
    ctx2.lineCap = "butt";
    ctx2.fillStyle = legCol;
    [-0.3, 0, 0.3].forEach((off) => {
      const furAngle = angle + Math.PI + off;
      const fux = s.x + Math.cos(furAngle) * r * 0.68;
      const fuy = s.y + Math.sin(furAngle) * r * 0.68;
      ctx2.beginPath();
      ctx2.arc(fux, fuy, r * 0.15, 0, Math.PI * 2);
      ctx2.fill();
    });
    ctx2.fillStyle = "rgba(255,255,255,0.18)";
    ctx2.beginPath();
    ctx2.ellipse(s.x - px * r * 0.3 + fx * r * 0.1, s.y - py * r * 0.3 + fy * r * 0.1, r * 0.28, r * 0.16, angle, 0, Math.PI * 2);
    ctx2.fill();
    const headX = s.x + fx * r * 0.95, headY = s.y + fy * r * 0.95;
    ctx2.fillStyle = radialFill(ctx2, headX, headY, r * 0.55, bodyCol2, z.skinDark);
    ctx2.beginPath();
    ctx2.ellipse(headX, headY, r * 0.5, r * 0.36, angle, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.strokeStyle = OUTLINE;
    ctx2.lineWidth = 2.5;
    ctx2.stroke();
    ctx2.fillStyle = legCol;
    ctx2.strokeStyle = OUTLINE;
    ctx2.lineWidth = 2;
    [-1, 1].forEach((side) => {
      const a = angle + side * 0.5;
      const bx = headX + Math.cos(a) * r * 0.3, by = headY + Math.sin(a) * r * 0.3;
      const tx = headX + Math.cos(a) * r * 0.7, ty = headY + Math.sin(a) * r * 0.7;
      ctx2.beginPath();
      ctx2.moveTo(bx - px * r * 0.1 * side, by - py * r * 0.1 * side);
      ctx2.lineTo(tx, ty);
      ctx2.lineTo(bx + px * r * 0.1 * side, by + py * r * 0.1 * side);
      ctx2.closePath();
      ctx2.fill();
      ctx2.stroke();
    });
    ctx2.fillStyle = flashing ? "#ffffff" : "#ffcf4d";
    [-1, 1].forEach((side) => {
      const ex = headX + fx * r * 0.15 + px * r * 0.22 * side;
      const ey = headY + fy * r * 0.15 + py * r * 0.22 * side;
      ctx2.beginPath();
      ctx2.arc(ex, ey, r * 0.09, 0, Math.PI * 2);
      ctx2.fill();
    });
    const snoutX = headX + fx * r * 0.42, snoutY = headY + fy * r * 0.42;
    ctx2.fillStyle = "#1a0a0a";
    ctx2.beginPath();
    ctx2.ellipse(snoutX, snoutY, r * 0.22, r * 0.13, angle, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.fillStyle = "#f0ead6";
    [-1, 1].forEach((side) => {
      const tx = snoutX + px * r * 0.12 * side, ty = snoutY + py * r * 0.12 * side;
      ctx2.beginPath();
      ctx2.moveTo(tx - px * r * 0.04 * side, ty - py * r * 0.04 * side);
      ctx2.lineTo(tx + fx * r * 0.14, ty + fy * r * 0.14);
      ctx2.lineTo(tx + px * r * 0.04 * side, ty + py * r * 0.04 * side);
      ctx2.closePath();
      ctx2.fill();
    });
  }
  function drawZombie(ctx2, canvas2, z) {
    const s = worldToScreen(z.x, z.y);
    if (s.x < -110 || s.x > canvas2.width + 110 || s.y < -110 || s.y > canvas2.height + 110) return;
    const angle = Math.atan2(player.y - z.y, player.x - z.x);
    const flashing = performance.now() - z.flash < 90;
    const OUTLINE = "#141f18";
    const bodyCol = flashing ? "#ffffff" : z.skinColor;
    const bodyCol2 = flashing ? "#ffffff" : z.skinColor2;
    drawShadow(ctx2, s.x, s.y, z.radius);
    if (z.type === "boss") {
      drawBossZombie(ctx2, z, s, angle, flashing, OUTLINE);
      const barW2 = z.radius * 2;
      ctx2.fillStyle = "#00000088";
      ctx2.fillRect(s.x - barW2 / 2, s.y - z.radius - 18, barW2, 6);
      ctx2.fillStyle = "#c084fc";
      ctx2.fillRect(s.x - barW2 / 2, s.y - z.radius - 18, barW2 * (z.hp / z.maxHp), 6);
      return;
    }
    if (z.type === "wolf") {
      drawWolfZombie(ctx2, z, s, angle, flashing, OUTLINE);
      const barW3 = z.radius * 2;
      ctx2.fillStyle = "#00000088";
      ctx2.fillRect(s.x - barW3 / 2, s.y - z.radius - 12, barW3, 5);
      ctx2.fillStyle = "#ff5c5c";
      ctx2.fillRect(s.x - barW3 / 2, s.y - z.radius - 12, barW3 * (z.hp / z.maxHp), 5);
      return;
    }
    if (z.type === "spider") {
      drawSpiderZombie(ctx2, z, s, angle, flashing, OUTLINE);
      const barW2 = z.radius * 2;
      ctx2.fillStyle = "#00000088";
      ctx2.fillRect(s.x - barW2 / 2, s.y - z.radius - 12, barW2, 5);
      ctx2.fillStyle = "#ff5c5c";
      ctx2.fillRect(s.x - barW2 / 2, s.y - z.radius - 12, barW2 * (z.hp / z.maxHp), 5);
      return;
    }
    if (z.type === "witch") {
      drawWitchZombie(ctx2, z, s, angle, flashing, OUTLINE);
      const barW2 = z.radius * 2;
      ctx2.fillStyle = "#00000088";
      ctx2.fillRect(s.x - barW2 / 2, s.y - z.radius - 12, barW2, 5);
      ctx2.fillStyle = "#ff5c5c";
      ctx2.fillRect(s.x - barW2 / 2, s.y - z.radius - 12, barW2 * (z.hp / z.maxHp), 5);
      return;
    }
    if (z.type === "brute") {
      ctx2.fillStyle = z.skinDark;
      ctx2.strokeStyle = OUTLINE;
      ctx2.lineWidth = 2;
      [-0.7, 0.7].forEach((off) => {
        const a = angle + off - Math.PI / 2;
        ctx2.beginPath();
        ctx2.moveTo(s.x + Math.cos(angle + off) * z.radius * 0.7, s.y + Math.sin(angle + off) * z.radius * 0.7);
        ctx2.lineTo(s.x + Math.cos(angle + off) * z.radius * 0.7 + Math.cos(a) * 10, s.y + Math.sin(angle + off) * z.radius * 0.7 + Math.sin(a) * 10);
        ctx2.lineTo(s.x + Math.cos(angle + off) * z.radius * 1.05, s.y + Math.sin(angle + off) * z.radius * 1.05);
        ctx2.closePath();
        ctx2.fill();
        ctx2.stroke();
      });
    }
    const armSpread = def_ranged(z) ? 0.62 : 0.48;
    const armReach = def_ranged(z) ? 0.8 : 0.88;
    drawZombieArmBlobs(ctx2, s.x, s.y, z.radius, angle, armSpread, armReach, bodyCol, bodyCol2, OUTLINE, flashing);
    if (z.type === "spitter") {
      ctx2.fillStyle = "rgba(46, 204, 113, 0.75)";
      [-1, 1].forEach((side) => {
        const armAngle = angle + side * armSpread;
        const hx = s.x + Math.cos(armAngle) * z.radius * armReach;
        const hy = s.y + Math.sin(armAngle) * z.radius * armReach;
        ctx2.beginPath();
        ctx2.arc(hx + Math.sin(performance.now() * 8e-3) * 3, hy + 4, 3.5, 0, Math.PI * 2);
        ctx2.fill();
      });
    }
    if (z.type === "spitter") {
      ctx2.fillStyle = flashing ? "#ffffff" : "#437040";
      ctx2.strokeStyle = OUTLINE;
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      ctx2.arc(s.x - Math.cos(angle) * z.radius * 0.5, s.y - Math.sin(angle) * z.radius * 0.5, z.radius * 0.55, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.stroke();
    }
    if (z.clothColor) {
      ctx2.fillStyle = z.clothColor;
      ctx2.strokeStyle = OUTLINE;
      ctx2.lineWidth = 2.5;
      ctx2.beginPath();
      ctx2.arc(s.x, s.y + z.radius * 0.55, z.radius * 0.68, 0, Math.PI);
      ctx2.closePath();
      ctx2.fill();
      ctx2.stroke();
    }
    const rx = z.radius * z.squishX, ry = z.radius * z.squishY;
    ctx2.fillStyle = radialFill(ctx2, s.x, s.y, z.radius, bodyCol, bodyCol2);
    ctx2.beginPath();
    ctx2.ellipse(s.x, s.y, rx, ry, 0, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.strokeStyle = OUTLINE;
    ctx2.lineWidth = 3.5;
    ctx2.stroke();
    ctx2.fillStyle = "rgba(0,0,0,0.12)";
    for (let i = 0; i < 3; i++) {
      const offX = Math.sin(i * 1.5) * z.radius * 0.35;
      const offY = Math.cos(i * 1.5) * z.radius * 0.35;
      ctx2.beginPath();
      ctx2.arc(s.x + offX, s.y + offY, z.radius * 0.11, 0, Math.PI * 2);
      ctx2.fill();
    }
    if (z.type === "scout") {
      ctx2.fillStyle = "#e74c3c";
      ctx2.strokeStyle = OUTLINE;
      ctx2.lineWidth = 1.5;
      ctx2.beginPath();
      ctx2.ellipse(s.x, s.y - z.radius * 0.25, z.radius * 0.9, z.radius * 0.16, angle, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.stroke();
    }
    if (z.type === "brute") {
      ctx2.fillStyle = "#7f8c8d";
      ctx2.strokeStyle = OUTLINE;
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      ctx2.ellipse(s.x, s.y + z.radius * 0.4, z.radius * 0.55, z.radius * 0.22, angle, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.stroke();
    }
    if (z.type === "exploder") {
      ctx2.fillStyle = "#e74c3c";
      ctx2.strokeStyle = OUTLINE;
      ctx2.lineWidth = 2;
      const ex = s.x + Math.cos(angle + Math.PI) * z.radius * 0.1;
      const ey = s.y + Math.sin(angle + Math.PI) * z.radius * 0.1;
      ctx2.save();
      ctx2.translate(ex, ey);
      ctx2.rotate(angle);
      ctx2.fillRect(-z.radius * 0.32, -z.radius * 0.08, z.radius * 0.64, z.radius * 0.4);
      ctx2.strokeRect(-z.radius * 0.32, -z.radius * 0.08, z.radius * 0.64, z.radius * 0.4);
      ctx2.strokeStyle = "#2c3e50";
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      ctx2.moveTo(-z.radius * 0.75, z.radius * 0.12);
      ctx2.lineTo(z.radius * 0.75, z.radius * 0.12);
      ctx2.stroke();
      ctx2.restore();
    }
    ctx2.fillStyle = "rgba(255,255,255,0.22)";
    ctx2.beginPath();
    ctx2.ellipse(s.x - rx * 0.32, s.y - ry * 0.38, rx * 0.32, ry * 0.2, -0.4, 0, Math.PI * 2);
    ctx2.fill();
    if (z.hairKind === "hood") {
      ctx2.fillStyle = z.skinDark;
      ctx2.strokeStyle = OUTLINE;
      ctx2.lineWidth = 2.5;
      ctx2.beginPath();
      ctx2.arc(s.x, s.y, z.radius * 1.02, angle + Math.PI * 0.58, angle + Math.PI * 1.42);
      ctx2.closePath();
      ctx2.fill();
      ctx2.stroke();
    } else if (z.hairKind === "tuft") {
      ctx2.fillStyle = z.skinDark;
      ctx2.strokeStyle = OUTLINE;
      ctx2.lineWidth = 2;
      const backAngle = angle + Math.PI;
      for (let i = -1; i <= 1; i++) {
        const a = backAngle + i * 0.4;
        const perp = a + Math.PI / 2;
        const baseX = s.x + Math.cos(a) * z.radius * 0.85, baseY = s.y + Math.sin(a) * z.radius * 0.85;
        const tipX = s.x + Math.cos(a) * z.radius * 1.25, tipY = s.y + Math.sin(a) * z.radius * 1.25;
        ctx2.beginPath();
        ctx2.moveTo(baseX + Math.cos(perp) * 3, baseY + Math.sin(perp) * 3);
        ctx2.lineTo(tipX, tipY);
        ctx2.lineTo(baseX - Math.cos(perp) * 3, baseY - Math.sin(perp) * 3);
        ctx2.closePath();
        ctx2.fill();
        ctx2.stroke();
      }
    }
    if (z.type === "exploder") {
      const pulse = z.fuseStart ? 0.5 + 0.5 * Math.sin(performance.now() * 0.03) : 0.3 + 0.2 * Math.sin(performance.now() * 6e-3);
      ctx2.strokeStyle = `rgba(255,${z.fuseStart ? 60 : 160},60,${pulse})`;
      ctx2.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const a = angle + i * 2.1;
        ctx2.beginPath();
        ctx2.moveTo(s.x, s.y);
        ctx2.lineTo(s.x + Math.cos(a) * z.radius * 0.8, s.y + Math.sin(a) * z.radius * 0.8);
        ctx2.stroke();
      }
    }
    const e1a = angle - 0.45, e2a = angle + 0.45;
    if (z.type === "exploder") {
      ctx2.fillStyle = "#ffb347";
      [e1a, e2a].forEach((a) => {
        const ex = s.x + Math.cos(a) * z.radius * 0.42, ey = s.y + Math.sin(a) * z.radius * 0.42;
        ctx2.beginPath();
        ctx2.ellipse(ex, ey, z.radius * 0.13, z.radius * 0.06, angle, 0, Math.PI * 2);
        ctx2.fill();
      });
    } else {
      const upx = Math.cos(angle), upy = Math.sin(angle);
      const perpx = Math.cos(angle + Math.PI / 2), perpy = Math.sin(angle + Math.PI / 2);
      const eyeSep = z.radius * 0.3;
      const eyeFwd = z.radius * 0.22;
      [-1, 1].forEach((side) => {
        const ex = s.x + upx * eyeFwd + perpx * eyeSep * side;
        const ey = s.y + upy * eyeFwd + perpy * eyeSep * side;
        ctx2.fillStyle = "#f4f4ec";
        ctx2.strokeStyle = OUTLINE;
        ctx2.lineWidth = 1.4;
        ctx2.beginPath();
        ctx2.arc(ex, ey, z.radius * 0.16, 0, Math.PI * 2);
        ctx2.fill();
        ctx2.stroke();
        ctx2.fillStyle = "#1c1c1c";
        ctx2.beginPath();
        ctx2.arc(ex + upx * z.radius * 0.045, ey + upy * z.radius * 0.045, z.radius * 0.075, 0, Math.PI * 2);
        ctx2.fill();
        const browFwd = z.radius * 0.34;
        const halfLen = z.radius * 0.13;
        const innerX = ex - upx * (browFwd + z.radius * 0.03) - perpx * halfLen * side;
        const innerY = ey - upy * (browFwd + z.radius * 0.03) - perpy * halfLen * side;
        const outerX = ex - upx * browFwd + perpx * halfLen * side;
        const outerY = ey - upy * browFwd + perpy * halfLen * side;
        ctx2.strokeStyle = z.skinDark;
        ctx2.lineWidth = 2.6;
        ctx2.lineCap = "round";
        ctx2.beginPath();
        ctx2.moveTo(innerX, innerY);
        ctx2.lineTo(outerX, outerY);
        ctx2.stroke();
        ctx2.lineCap = "butt";
      });
      const mx = s.x + Math.cos(angle) * z.radius * 0.55, my = s.y + Math.sin(angle) * z.radius * 0.55;
      if (z.mouthKind === "open") {
        ctx2.fillStyle = "#1c1c1c";
        ctx2.beginPath();
        ctx2.ellipse(mx, my, z.radius * 0.22, z.radius * 0.16, angle, 0, Math.PI * 2);
        ctx2.fill();
        ctx2.fillStyle = "#e8e2d0";
        for (let i = -1; i <= 1; i += 2) {
          ctx2.fillRect(mx + i * z.radius * 0.12 - 1.5, my - z.radius * 0.1, 3, z.radius * 0.12);
        }
      } else if (z.mouthKind === "grimace") {
        ctx2.strokeStyle = OUTLINE;
        ctx2.lineWidth = 2;
        ctx2.beginPath();
        for (let i = -2; i <= 2; i++) {
          const zx = mx + Math.cos(angle + Math.PI / 2) * i * z.radius * 0.09;
          const zy = my + Math.sin(angle + Math.PI / 2) * i * z.radius * 0.09 + (i % 2 === 0 ? 2 : -2);
          if (i === -2) ctx2.moveTo(zx, zy);
          else ctx2.lineTo(zx, zy);
        }
        ctx2.stroke();
      } else {
        ctx2.strokeStyle = OUTLINE;
        ctx2.lineWidth = 2;
        ctx2.beginPath();
        ctx2.arc(mx, my, z.radius * 0.22, angle - Math.PI * 0.35, angle + Math.PI * 0.35);
        ctx2.stroke();
      }
    }
    const barW = z.radius * 2;
    ctx2.fillStyle = "#00000088";
    ctx2.fillRect(s.x - barW / 2, s.y - z.radius - 12, barW, 5);
    ctx2.fillStyle = "#ff5c5c";
    ctx2.fillRect(s.x - barW / 2, s.y - z.radius - 12, barW * (z.hp / z.maxHp), 5);
  }
  function drawSpiderZombie(ctx2, z, s, angle, flashing, OUTLINE) {
    const r = z.radius;
    const bodyCol = flashing ? "#ffffff" : z.skinColor;
    const bodyCol2 = flashing ? "#ffffff" : z.skinColor2;
    const legCol = flashing ? "#ffffff" : z.skinDark;
    const fx = Math.cos(angle), fy = Math.sin(angle);
    const px = Math.cos(angle + Math.PI / 2), py = Math.sin(angle + Math.PI / 2);
    const legAngles = [-1.3, -0.9, -0.5, -0.1, 0.1, 0.5, 0.9, 1.3];
    legAngles.forEach((legOffset, idx) => {
      const side = idx < 4 ? -1 : 1;
      const a = angle + legOffset + side * Math.PI / 4;
      const hipX = s.x + Math.cos(angle + legOffset) * r * 0.45;
      const hipY = s.y + Math.sin(angle + legOffset) * r * 0.45;
      const jointX = hipX + Math.cos(a) * r * 0.8;
      const jointY = hipY + Math.sin(a) * r * 0.8;
      const tipAngle = a + side * 0.6;
      const tipX = jointX + Math.cos(tipAngle) * r * 0.7;
      const tipY = jointY + Math.sin(tipAngle) * r * 0.7;
      ctx2.lineCap = "round";
      ctx2.strokeStyle = OUTLINE;
      ctx2.lineWidth = r * 0.22 + 4;
      ctx2.beginPath();
      ctx2.moveTo(hipX, hipY);
      ctx2.lineTo(jointX, jointY);
      ctx2.lineTo(tipX, tipY);
      ctx2.stroke();
      ctx2.strokeStyle = legCol;
      ctx2.lineWidth = r * 0.22;
      ctx2.beginPath();
      ctx2.moveTo(hipX, hipY);
      ctx2.lineTo(jointX, jointY);
      ctx2.lineTo(tipX, tipY);
      ctx2.stroke();
      if (!flashing) {
        ctx2.strokeStyle = OUTLINE;
        ctx2.lineWidth = 1.5;
        const hairAngle = a + Math.PI / 2;
        ctx2.beginPath();
        ctx2.moveTo(jointX, jointY);
        ctx2.lineTo(jointX + Math.cos(hairAngle) * 5, jointY + Math.sin(hairAngle) * 5);
        ctx2.stroke();
      }
      ctx2.lineCap = "butt";
    });
    const abdX = s.x - fx * r * 0.45, abdY = s.y - fy * r * 0.45;
    ctx2.fillStyle = radialFill(ctx2, abdX, abdY, r * 1, bodyCol, "#000000");
    ctx2.beginPath();
    ctx2.ellipse(abdX, abdY, r * 1, r * 0.82, angle, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.strokeStyle = OUTLINE;
    ctx2.lineWidth = 3;
    ctx2.stroke();
    const headX = s.x + fx * r * 0.45, headY = s.y + fy * r * 0.45;
    ctx2.fillStyle = radialFill(ctx2, headX, headY, r * 0.65, bodyCol, bodyCol2);
    ctx2.beginPath();
    ctx2.ellipse(headX, headY, r * 0.65, r * 0.55, angle, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.strokeStyle = OUTLINE;
    ctx2.lineWidth = 2.5;
    ctx2.stroke();
    ctx2.fillStyle = "#f0ead6";
    ctx2.strokeStyle = OUTLINE;
    ctx2.lineWidth = 1.5;
    [-1, 1].forEach((side) => {
      const fangAngle = angle + side * 0.25;
      const fx1 = headX + Math.cos(fangAngle) * r * 0.5;
      const fy1 = headY + Math.sin(fangAngle) * r * 0.5;
      ctx2.beginPath();
      ctx2.moveTo(fx1, fy1);
      ctx2.lineTo(fx1 + Math.cos(angle + side * 0.1) * 7, fy1 + Math.sin(angle + side * 0.1) * 7);
      ctx2.lineTo(fx1 + Math.cos(angle - side * 0.1) * 3, fy1 + Math.sin(angle - side * 0.1) * 3);
      ctx2.closePath();
      ctx2.fill();
      ctx2.stroke();
    });
    ctx2.fillStyle = "#ff1e1e";
    [-0.3, -0.1, 0.1, 0.3].forEach((off) => {
      const ex1 = headX + fx * r * 0.32 + px * r * off * 0.7;
      const ey1 = headY + fy * r * 0.32 + py * r * off * 0.7;
      ctx2.beginPath();
      ctx2.arc(ex1, ey1, r * 0.08, 0, Math.PI * 2);
      ctx2.fill();
      const ex2 = headX + fx * r * 0.15 + px * r * off * 0.8;
      const ey2 = headY + fy * r * 0.15 + py * r * off * 0.8;
      ctx2.beginPath();
      ctx2.arc(ex2, ey2, r * 0.06, 0, Math.PI * 2);
      ctx2.fill();
    });
  }
  function drawWitchZombie(ctx2, z, s, angle, flashing, OUTLINE) {
    const r = z.radius;
    const bodyCol = flashing ? "#ffffff" : z.skinColor;
    const bodyCol2 = flashing ? "#ffffff" : z.skinColor2;
    const fx = Math.cos(angle), fy = Math.sin(angle);
    const px = Math.cos(angle + Math.PI / 2), py = Math.sin(angle + Math.PI / 2);
    ctx2.save();
    ctx2.strokeStyle = "rgba(192, 132, 252, 0.4)";
    ctx2.lineWidth = 3;
    ctx2.beginPath();
    ctx2.arc(s.x, s.y, 160, 0, Math.PI * 2);
    ctx2.stroke();
    ctx2.fillStyle = "rgba(192, 132, 252, 0.04)";
    ctx2.fill();
    ctx2.restore();
    const armSpread = 0.8;
    const armReach = 0.85;
    drawZombieArmBlobs(ctx2, s.x, s.y, r, angle, armSpread, armReach, bodyCol, bodyCol2, OUTLINE, flashing);
    if (!flashing) {
      ctx2.fillStyle = "#c084fc";
      [-1, 1].forEach((side) => {
        const hAngle = angle + side * armSpread;
        const hx2 = s.x + Math.cos(hAngle) * r * armReach;
        const hy2 = s.y + Math.sin(hAngle) * r * armReach;
        ctx2.beginPath();
        ctx2.arc(hx2 + Math.random() * 6 - 3, hy2 + Math.random() * 6 - 3, 2.5 + Math.random() * 3, 0, Math.PI * 2);
        ctx2.fill();
      });
    }
    const staffAngle = angle + 0.7;
    const handDist = r * 0.85;
    const hx = s.x + Math.cos(staffAngle) * handDist;
    const hy = s.y + Math.sin(staffAngle) * handDist;
    ctx2.strokeStyle = "#5c4033";
    ctx2.lineWidth = 3.5;
    ctx2.beginPath();
    ctx2.moveTo(hx - Math.cos(angle) * r * 0.5, hy - Math.sin(angle) * r * 0.5);
    ctx2.lineTo(hx + Math.cos(angle) * r * 0.9, hy + Math.sin(angle) * r * 0.9);
    ctx2.stroke();
    ctx2.fillStyle = "#9b59b6";
    ctx2.strokeStyle = OUTLINE;
    ctx2.lineWidth = 1.5;
    ctx2.beginPath();
    ctx2.moveTo(hx + Math.cos(angle) * r * 0.9 - px * 4, hy + Math.sin(angle) * r * 0.9 - py * 4);
    ctx2.lineTo(hx + Math.cos(angle) * r * 0.9 + Math.cos(angle) * 12, hy + Math.sin(angle) * r * 0.9 + Math.sin(angle) * 12);
    ctx2.lineTo(hx + Math.cos(angle) * r * 0.9 + px * 4, hy + Math.sin(angle) * r * 0.9 + py * 4);
    ctx2.closePath();
    ctx2.fill();
    ctx2.stroke();
    ctx2.fillStyle = "#4a235a";
    ctx2.strokeStyle = OUTLINE;
    ctx2.lineWidth = 2.5;
    ctx2.beginPath();
    ctx2.arc(s.x, s.y + r * 0.45, r * 0.8, 0, Math.PI);
    ctx2.closePath();
    ctx2.fill();
    ctx2.stroke();
    const rx = r * z.squishX, ry = r * z.squishY;
    ctx2.fillStyle = radialFill(ctx2, s.x, s.y, r, bodyCol, bodyCol2);
    ctx2.beginPath();
    ctx2.ellipse(s.x, s.y, rx, ry, 0, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.strokeStyle = OUTLINE;
    ctx2.lineWidth = 3.5;
    ctx2.stroke();
    ctx2.fillStyle = "#2ecc71";
    [-1, 1].forEach((side) => {
      const ex = s.x + fx * r * 0.22 + px * r * 0.3 * side;
      const ey = s.y + fy * r * 0.22 + py * r * 0.3 * side;
      ctx2.beginPath();
      ctx2.arc(ex, ey, r * 0.16, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.fillStyle = "#0e1c0e";
      ctx2.beginPath();
      ctx2.arc(ex, ey, r * 0.06, 0, Math.PI * 2);
      ctx2.fill();
    });
    ctx2.fillStyle = "#1a052e";
    ctx2.strokeStyle = OUTLINE;
    ctx2.lineWidth = 3;
    const brimW = r * 1.5, brimH = r * 0.95;
    ctx2.beginPath();
    ctx2.ellipse(s.x, s.y, brimW, brimH, angle, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.stroke();
    const coneBaseL = s.x - px * r * 0.4 - fx * r * 0.1;
    const coneBaseR = s.x + px * r * 0.4 - fx * r * 0.1;
    const coneTip = s.x - fx * r * 1.4;
    const coneBaseLy = s.y - py * r * 0.4 - fy * r * 0.1;
    const coneBaseRy = s.y + py * r * 0.4 - fy * r * 0.1;
    const coneTipy = s.y - fy * r * 1.4;
    ctx2.beginPath();
    ctx2.moveTo(coneBaseL, coneBaseLy);
    ctx2.lineTo(coneBaseR, coneBaseRy);
    ctx2.lineTo(coneTip, coneTipy);
    ctx2.closePath();
    ctx2.fill();
    ctx2.stroke();
    ctx2.fillStyle = "#8e44ad";
    ctx2.beginPath();
    ctx2.moveTo(coneBaseL, coneBaseLy);
    ctx2.lineTo(coneBaseR, coneBaseRy);
    ctx2.lineTo(s.x - fx * r * 0.35, s.y - fy * r * 0.35);
    ctx2.closePath();
    ctx2.fill();
  }

  // src/render/drawPlayer.ts
  function drawArms(ctx2, sx, sy, radius, angle, spread, reach, armColor, outlineColor, armRadius, fingers) {
    const a1 = angle - spread, a2 = angle + spread;
    const d = radius * reach;
    ctx2.strokeStyle = outlineColor;
    ctx2.lineWidth = 2;
    [a1, a2].forEach((a) => {
      const ax = sx + Math.cos(a) * d, ay = sy + Math.sin(a) * d;
      ctx2.fillStyle = armColor;
      ctx2.beginPath();
      ctx2.arc(ax, ay, radius * armRadius, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.stroke();
      if (fingers) {
        ctx2.lineWidth = 1.5;
        for (let i = -1; i <= 1; i++) {
          const fa = a + i * 0.5;
          ctx2.beginPath();
          ctx2.moveTo(ax, ay);
          ctx2.lineTo(ax + Math.cos(fa) * radius * armRadius * 1.5, ay + Math.sin(fa) * radius * armRadius * 1.5);
          ctx2.stroke();
        }
      }
    });
  }
  function drawWeapon(ctx2, weapon, OUTLINE, insta, sinceShot) {
    const r = player.radius;
    const flashColor = insta ? "rgba(255,140,60,0.95)" : "rgba(255,224,102,0.9)";
    if (weapon === "dualguns") {
      const drawMiniPistol = (yOff) => {
        ctx2.fillStyle = "#20242a";
        ctx2.strokeStyle = OUTLINE;
        ctx2.lineWidth = 1.6;
        ctx2.beginPath();
        ctx2.moveTo(r - 6, yOff - 2);
        ctx2.lineTo(r - 13, yOff - 5);
        ctx2.lineTo(r - 13, yOff + 5);
        ctx2.lineTo(r - 6, yOff + 2);
        ctx2.closePath();
        ctx2.fill();
        ctx2.stroke();
        ctx2.fillStyle = "#3a4148";
        ctx2.fillRect(r - 3, yOff - 3.5, 24, 7);
        ctx2.strokeRect(r - 3, yOff - 3.5, 24, 7);
        ctx2.fillStyle = "#8a94a0";
        ctx2.fillRect(r + 2, yOff - 3.5, 14, 2.2);
        ctx2.fillStyle = "#20242a";
        ctx2.fillRect(r + 18, yOff - 5, 7, 10);
        ctx2.strokeRect(r + 18, yOff - 5, 7, 10);
        if (sinceShot < 70) {
          ctx2.fillStyle = flashColor;
          ctx2.beginPath();
          ctx2.arc(r + 27, yOff, insta ? 7 : 5, 0, Math.PI * 2);
          ctx2.fill();
        }
      };
      drawMiniPistol(-9);
      drawMiniPistol(9);
    } else if (weapon === "machinegun") {
      ctx2.fillStyle = "#20242a";
      ctx2.strokeStyle = OUTLINE;
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      ctx2.moveTo(r - 8, -5);
      ctx2.lineTo(r - 22, -11);
      ctx2.lineTo(r - 22, 11);
      ctx2.lineTo(r - 8, 5);
      ctx2.closePath();
      ctx2.fill();
      ctx2.stroke();
      ctx2.fillStyle = "#2c3234";
      ctx2.fillRect(r - 4, -7, 44, 14);
      ctx2.strokeRect(r - 4, -7, 44, 14);
      ctx2.fillStyle = "#1c2022";
      ctx2.fillRect(r + 2, -10, 26, 3);
      ctx2.fillStyle = "#3a4024";
      ctx2.strokeStyle = OUTLINE;
      ctx2.lineWidth = 1.8;
      ctx2.beginPath();
      ctx2.moveTo(r + 6, 7);
      ctx2.lineTo(r + 2, 24);
      ctx2.lineTo(r + 14, 24);
      ctx2.lineTo(r + 14, 7);
      ctx2.closePath();
      ctx2.fill();
      ctx2.stroke();
      ctx2.fillStyle = "#20242a";
      ctx2.fillRect(r + 32, -9, 12, 18);
      ctx2.strokeRect(r + 32, -9, 12, 18);
      if (sinceShot < 70) {
        ctx2.fillStyle = flashColor;
        ctx2.beginPath();
        ctx2.arc(r + 46, 0, insta ? 12 : 9, 0, Math.PI * 2);
        ctx2.fill();
      }
    } else if (weapon === "shotgun") {
      ctx2.fillStyle = "#6b4423";
      ctx2.strokeStyle = OUTLINE;
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      ctx2.moveTo(r - 6, -6);
      ctx2.lineTo(r - 20, -9);
      ctx2.lineTo(r - 20, 9);
      ctx2.lineTo(r - 6, 6);
      ctx2.closePath();
      ctx2.fill();
      ctx2.stroke();
      ctx2.fillStyle = "#3a3f42";
      ctx2.fillRect(r - 2, -7, 26, 14);
      ctx2.strokeRect(r - 2, -7, 26, 14);
      ctx2.fillStyle = "#7a5230";
      ctx2.strokeStyle = OUTLINE;
      ctx2.lineWidth = 1.6;
      ctx2.fillRect(r + 2, 6, 14, 7);
      ctx2.strokeRect(r + 2, 6, 14, 7);
      ctx2.fillStyle = "#20242a";
      ctx2.strokeStyle = OUTLINE;
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      ctx2.moveTo(r + 24, -7);
      ctx2.lineTo(r + 34, -9);
      ctx2.lineTo(r + 34, 9);
      ctx2.lineTo(r + 24, 7);
      ctx2.closePath();
      ctx2.fill();
      ctx2.stroke();
      if (sinceShot < 70) {
        ctx2.fillStyle = flashColor;
        ctx2.beginPath();
        ctx2.arc(r + 36, 0, insta ? 11 : 9, 0, Math.PI * 2);
        ctx2.fill();
      }
    } else if (weapon === "grenadelauncher") {
      ctx2.fillStyle = "#2a2f22";
      ctx2.strokeStyle = OUTLINE;
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      ctx2.moveTo(r - 6, -5);
      ctx2.lineTo(r - 16, -9);
      ctx2.lineTo(r - 16, 9);
      ctx2.lineTo(r - 6, 5);
      ctx2.closePath();
      ctx2.fill();
      ctx2.stroke();
      ctx2.fillStyle = "#4a5c3a";
      ctx2.fillRect(r - 2, -10, 30, 20);
      ctx2.strokeRect(r - 2, -10, 30, 20);
      ctx2.fillStyle = "#ff9f43";
      ctx2.fillRect(r + 16, -10, 4, 20);
      ctx2.strokeStyle = OUTLINE;
      ctx2.lineWidth = 1.6;
      ctx2.beginPath();
      ctx2.moveTo(r + 2, -10);
      ctx2.lineTo(r + 2, -16);
      ctx2.lineTo(r + 14, -16);
      ctx2.lineTo(r + 14, -10);
      ctx2.stroke();
      ctx2.fillStyle = "#1c2018";
      ctx2.strokeStyle = OUTLINE;
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      ctx2.arc(r + 28, 0, 9, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.stroke();
      ctx2.fillStyle = "#0a0c08";
      ctx2.beginPath();
      ctx2.arc(r + 28, 0, 5, 0, Math.PI * 2);
      ctx2.fill();
      if (sinceShot < 120) {
        ctx2.fillStyle = insta ? "rgba(255,140,60,0.95)" : "rgba(255,159,67,0.9)";
        ctx2.beginPath();
        ctx2.arc(r + 28, 0, insta ? 13 : 10, 0, Math.PI * 2);
        ctx2.fill();
      }
    } else {
      ctx2.fillStyle = "#20242a";
      ctx2.strokeStyle = OUTLINE;
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      ctx2.moveTo(r - 8, -3);
      ctx2.lineTo(r - 18, -8);
      ctx2.lineTo(r - 18, 8);
      ctx2.lineTo(r - 8, 3);
      ctx2.closePath();
      ctx2.fill();
      ctx2.stroke();
      ctx2.fillStyle = "#33393b";
      ctx2.fillRect(r - 4, -5, 34, 10);
      ctx2.strokeRect(r - 4, -5, 34, 10);
      ctx2.fillStyle = "#14181a";
      ctx2.fillRect(r + 6, -9, 6, 4);
      ctx2.strokeRect(r + 6, -9, 6, 4);
      ctx2.fillStyle = "#20242a";
      ctx2.fillRect(r + 22, -7, 10, 14);
      ctx2.strokeRect(r + 22, -7, 10, 14);
      if (sinceShot < 70) {
        ctx2.fillStyle = flashColor;
        ctx2.beginPath();
        ctx2.arc(r + 34, 0, insta ? 10 : 7, 0, Math.PI * 2);
        ctx2.fill();
      }
    }
  }
  function drawPlayer(ctx2) {
    const s = worldToScreen(player.x, player.y);
    const angle = player.angle;
    const tint = player.skinTint ? SKIN_TINTS[player.skinTint] : ["#ffd9ad", "#e0ac7a"];
    const skin = player.alive ? radialFill(ctx2, s.x, s.y, player.radius, tint[0], tint[1]) : "#555";
    const armColor = player.alive ? tint[1] : "#444";
    const OUTLINE = "#4a3220";
    const insta = performance.now() < player.instaKillUntil;
    if (player.alive) {
      const glowR = player.radius * (insta ? 3.2 : 2.2);
      const glow = ctx2.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowR);
      glow.addColorStop(0, insta ? "rgba(255,215,106,0.35)" : "rgba(255,220,150,0.22)");
      glow.addColorStop(1, "rgba(255,220,150,0)");
      ctx2.fillStyle = glow;
      ctx2.beginPath();
      ctx2.arc(s.x, s.y, glowR, 0, Math.PI * 2);
      ctx2.fill();
    }
    if (player.alive && (player.mutation === "vampire" || player.mutation === "pyromaniac")) {
      const auraColor = player.mutation === "vampire" ? "rgba(138,43,180,0.4)" : "rgba(255,60,40,0.4)";
      const auraR = player.radius * 2.6;
      const aura = ctx2.createRadialGradient(s.x, s.y, 0, s.x, s.y, auraR);
      aura.addColorStop(0, auraColor);
      aura.addColorStop(1, "rgba(0,0,0,0)");
      ctx2.fillStyle = aura;
      ctx2.beginPath();
      ctx2.arc(s.x, s.y, auraR, 0, Math.PI * 2);
      ctx2.fill();
    }
    drawShadow(ctx2, s.x, s.y, player.radius);
    const bx = s.x - Math.cos(angle) * player.radius * 0.7, by = s.y - Math.sin(angle) * player.radius * 0.7;
    ctx2.fillStyle = "#5a4632";
    ctx2.strokeStyle = OUTLINE;
    ctx2.lineWidth = 2.5;
    ctx2.beginPath();
    ctx2.arc(bx, by, player.radius * 0.4, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.stroke();
    ctx2.save();
    ctx2.translate(s.x, s.y);
    ctx2.rotate(angle);
    drawWeapon(ctx2, player.weapon, OUTLINE, insta, performance.now() - player.lastShot);
    ctx2.restore();
    drawArms(ctx2, s.x, s.y, player.radius, angle, 0.4, 0.75, armColor, OUTLINE, 0.34, true);
    ctx2.fillStyle = tint[1];
    ctx2.strokeStyle = OUTLINE;
    ctx2.lineWidth = 2.2;
    [angle - Math.PI / 2, angle + Math.PI / 2].forEach((a) => {
      const ex = s.x + Math.cos(a) * player.radius * 0.9, ey = s.y + Math.sin(a) * player.radius * 0.9;
      ctx2.beginPath();
      ctx2.arc(ex, ey, player.radius * 0.22, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.stroke();
    });
    ctx2.fillStyle = skin;
    ctx2.beginPath();
    ctx2.arc(s.x, s.y, player.radius, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.strokeStyle = OUTLINE;
    ctx2.lineWidth = 3.5;
    ctx2.stroke();
    ctx2.fillStyle = "rgba(255,255,255,0.25)";
    ctx2.beginPath();
    ctx2.ellipse(s.x - player.radius * 0.32, s.y - player.radius * 0.38, player.radius * 0.32, player.radius * 0.2, -0.4, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.fillStyle = "#4a3220";
    ctx2.strokeStyle = OUTLINE;
    ctx2.lineWidth = 2;
    ctx2.beginPath();
    ctx2.arc(s.x, s.y, player.radius * 1, angle + Math.PI * 0.62, angle + Math.PI * 1.38);
    ctx2.closePath();
    ctx2.fill();
    ctx2.stroke();
    {
      const upx = Math.cos(angle), upy = Math.sin(angle);
      const perpx = Math.cos(angle + Math.PI / 2), perpy = Math.sin(angle + Math.PI / 2);
      const eyeSep = player.radius * 0.3;
      const eyeFwd = player.radius * 0.24;
      [-1, 1].forEach((side) => {
        const ex = s.x + upx * eyeFwd + perpx * eyeSep * side;
        const ey = s.y + upy * eyeFwd + perpy * eyeSep * side;
        ctx2.fillStyle = "#2a2118";
        ctx2.beginPath();
        ctx2.arc(ex, ey, player.radius * 0.075, 0, Math.PI * 2);
        ctx2.fill();
        const browFwd = player.radius * 0.34;
        const halfLen = player.radius * 0.11;
        const innerX = ex - upx * (browFwd + player.radius * 0.025) - perpx * halfLen * side;
        const innerY = ey - upy * (browFwd + player.radius * 0.025) - perpy * halfLen * side;
        const outerX = ex - upx * browFwd + perpx * halfLen * side;
        const outerY = ey - upy * browFwd + perpy * halfLen * side;
        ctx2.strokeStyle = "#3a2818";
        ctx2.lineWidth = 2.2;
        ctx2.lineCap = "round";
        ctx2.beginPath();
        ctx2.moveTo(innerX, innerY);
        ctx2.lineTo(outerX, outerY);
        ctx2.stroke();
        ctx2.lineCap = "butt";
      });
    }
    const mx = s.x + Math.cos(angle) * player.radius * 0.5, my = s.y + Math.sin(angle) * player.radius * 0.5;
    ctx2.strokeStyle = "#8a5a3a";
    ctx2.lineWidth = 2;
    ctx2.beginPath();
    ctx2.arc(mx, my, player.radius * 0.2, angle - Math.PI * 0.3, angle + Math.PI * 0.3);
    ctx2.stroke();
    if (player.mutation === "vampire") {
      const upx = Math.cos(angle), upy = Math.sin(angle);
      const perpx = Math.cos(angle + Math.PI / 2), perpy = Math.sin(angle + Math.PI / 2);
      ctx2.fillStyle = "#8a3ab0";
      ctx2.strokeStyle = "#2a1038";
      ctx2.lineWidth = 1;
      [-1, 1].forEach((side) => {
        const bx2 = mx + perpx * player.radius * 0.1 * side, by2 = my + perpy * player.radius * 0.1 * side;
        const tipx = bx2 + upx * player.radius * 0.22, tipy = by2 + upy * player.radius * 0.22;
        ctx2.beginPath();
        ctx2.moveTo(bx2 - perpx * player.radius * 0.05 * side, by2 - perpy * player.radius * 0.05 * side);
        ctx2.lineTo(tipx, tipy);
        ctx2.lineTo(bx2 + perpx * player.radius * 0.05 * side, by2 + perpy * player.radius * 0.05 * side);
        ctx2.closePath();
        ctx2.fill();
        ctx2.stroke();
      });
    }
  }
  function drawBullets(ctx2) {
    for (const b of bullets) {
      const s = worldToScreen(b.x, b.y);
      if (b.explosive) {
        ctx2.fillStyle = "#4a5c3a";
        ctx2.strokeStyle = "#1c2018";
        ctx2.lineWidth = 1.5;
        ctx2.beginPath();
        ctx2.arc(s.x, s.y, b.radius * 1.8, 0, Math.PI * 2);
        ctx2.fill();
        ctx2.stroke();
        ctx2.fillStyle = "#ff9f43";
        ctx2.beginPath();
        ctx2.arc(s.x, s.y, b.radius * 0.6, 0, Math.PI * 2);
        ctx2.fill();
        continue;
      }
      const col = b.owner === "turret" ? "154,209,255" : b.owner === "zombie" ? "139,227,107" : "255,224,102";
      ctx2.strokeStyle = `rgba(${col},0.5)`;
      ctx2.lineWidth = b.radius;
      ctx2.beginPath();
      ctx2.moveTo(s.x - b.vx * 1.6, s.y - b.vy * 1.6);
      ctx2.lineTo(s.x, s.y);
      ctx2.stroke();
      ctx2.fillStyle = `rgb(${col})`;
      ctx2.beginPath();
      ctx2.arc(s.x, s.y, b.radius, 0, Math.PI * 2);
      ctx2.fill();
    }
  }
  function drawParticles(ctx2) {
    ctx2.font = "12px 'Share Tech Mono', monospace";
    ctx2.textAlign = "center";
    for (const p of particles) {
      const s = worldToScreen(p.x, p.y);
      ctx2.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx2.fillStyle = p.color;
      ctx2.fillText(p.text, s.x, s.y);
    }
    for (const p of bursts) {
      const s = worldToScreen(p.x, p.y);
      ctx2.globalAlpha = Math.max(0, p.life / p.maxLife);
      if (p.shape === "casing") {
        ctx2.save();
        ctx2.translate(s.x, s.y);
        ctx2.rotate(p.rot || 0);
        ctx2.fillStyle = p.color;
        ctx2.fillRect(-3, -1.5, 6, 3);
        ctx2.restore();
      } else {
        ctx2.fillStyle = p.color;
        ctx2.beginPath();
        ctx2.arc(s.x, s.y, p.radius, 0, Math.PI * 2);
        ctx2.fill();
      }
    }
    ctx2.globalAlpha = 1;
  }
  function drawPowerup(ctx2, canvas2, p) {
    const s = worldToScreen(p.x, p.y);
    if (s.x < -40 || s.x > canvas2.width + 40 || s.y < -40 || s.y > canvas2.height + 40) return;
    const def = POWERUP_DEFS[p.kind];
    const t = performance.now();
    const pulse = 0.7 + 0.3 * Math.sin(t * 6e-3);
    const age = t - p.spawnTime;
    const fadeStart = POWERUP_LIFETIME_MS - 3e3;
    const fade = age > fadeStart ? Math.max(0.15, 0.5 + 0.5 * Math.sin(age * 0.02)) : 1;
    ctx2.save();
    ctx2.globalAlpha = 0.3 * pulse * fade;
    ctx2.fillStyle = def.color;
    ctx2.beginPath();
    ctx2.arc(s.x, s.y, p.radius * 2.6 * pulse, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.globalAlpha = fade;
    ctx2.translate(s.x, s.y);
    ctx2.rotate(t * 12e-4);
    ctx2.fillStyle = def.color;
    ctx2.strokeStyle = "#14201a";
    ctx2.lineWidth = 2.5;
    ctx2.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI * 2;
      const a2 = a + Math.PI / 4;
      ctx2.lineTo(Math.cos(a) * p.radius, Math.sin(a) * p.radius);
      ctx2.lineTo(Math.cos(a2) * p.radius * 0.4, Math.sin(a2) * p.radius * 0.4);
    }
    ctx2.closePath();
    ctx2.fill();
    ctx2.stroke();
    ctx2.restore();
    ctx2.globalAlpha = fade;
    ctx2.fillStyle = "#14201a";
    ctx2.font = "bold 12px 'Orbitron', sans-serif";
    ctx2.textAlign = "center";
    ctx2.fillText(def.symbol, s.x, s.y + 4);
    ctx2.globalAlpha = 1;
  }

  // src/render/renderer.ts
  function drawNightOverlay(ctx2, canvas2) {
    if (bloodMoon.active) {
      const cx2 = canvas2.width / 2, cy2 = canvas2.height / 2;
      const grad2 = ctx2.createRadialGradient(cx2, cy2, canvas2.height * 0.18, cx2, cy2, canvas2.height * 0.85);
      grad2.addColorStop(0, "rgba(40,4,4,0.10)");
      grad2.addColorStop(1, "rgba(28,2,2,0.70)");
      ctx2.fillStyle = grad2;
      ctx2.fillRect(0, 0, canvas2.width, canvas2.height);
      return;
    }
    if (dayNight.factor <= 0.02) return;
    const cx = canvas2.width / 2, cy = canvas2.height / 2;
    const grad = ctx2.createRadialGradient(cx, cy, canvas2.height * 0.18, cx, cy, canvas2.height * 0.85);
    grad.addColorStop(0, `rgba(10,15,35,${0.04 * dayNight.factor})`);
    grad.addColorStop(1, `rgba(5,8,22,${0.72 * dayNight.factor})`);
    ctx2.fillStyle = grad;
    ctx2.fillRect(0, 0, canvas2.width, canvas2.height);
  }
  function drawFlashlight(ctx2, canvas2) {
    if (bloodMoon.active) {
      const s2 = worldToScreen(player.x, player.y);
      const angle2 = player.angle;
      const len2 = 620, spread2 = 0.5;
      ctx2.save();
      ctx2.globalCompositeOperation = "lighter";
      ctx2.beginPath();
      ctx2.moveTo(s2.x, s2.y);
      ctx2.arc(s2.x, s2.y, len2, angle2 - spread2, angle2 + spread2);
      ctx2.closePath();
      const grad2 = ctx2.createRadialGradient(s2.x, s2.y, 0, s2.x, s2.y, len2);
      grad2.addColorStop(0, "rgba(255,40,40,0.24)");
      grad2.addColorStop(1, "rgba(255,40,40,0)");
      ctx2.fillStyle = grad2;
      ctx2.fill();
      ctx2.restore();
      return;
    }
    if (dayNight.factor < 0.35) return;
    const s = worldToScreen(player.x, player.y);
    const angle = player.angle;
    const len = 620, spread = 0.5;
    ctx2.save();
    ctx2.globalCompositeOperation = "lighter";
    ctx2.beginPath();
    ctx2.moveTo(s.x, s.y);
    ctx2.arc(s.x, s.y, len, angle - spread, angle + spread);
    ctx2.closePath();
    const grad = ctx2.createRadialGradient(s.x, s.y, 0, s.x, s.y, len);
    grad.addColorStop(0, `rgba(255,244,214,${0.2 * dayNight.factor})`);
    grad.addColorStop(1, "rgba(255,244,214,0)");
    ctx2.fillStyle = grad;
    ctx2.fill();
    ctx2.restore();
  }
  function render(ctx2, canvas2) {
    camera.x = clamp(player.x - canvas2.width / 2, 0, WORLD_W - canvas2.width);
    camera.y = clamp(player.y - canvas2.height / 2, 0, WORLD_H - canvas2.height);
    if (shake.time > 0) {
      camera.x += rand(-shake.mag, shake.mag);
      camera.y += rand(-shake.mag, shake.mag);
    }
    drawBackground(ctx2, canvas2);
    drawWorldBounds(ctx2);
    drawFireZones(ctx2);
    drawToxicClouds(ctx2);
    for (const r of resources) drawResource(ctx2, canvas2, r);
    for (const c of crates) drawCrate(ctx2, c);
    for (const p of powerups) drawPowerup(ctx2, canvas2, p);
    for (const st of structures) drawStructure(ctx2, st);
    drawBuildPreview(ctx2);
    for (const z of zombies) drawZombie(ctx2, canvas2, z);
    drawBullets(ctx2);
    drawPlayer(ctx2);
    drawParticles(ctx2);
    drawSniperLasers(ctx2);
    drawTeslaChains(ctx2);
    drawStars(ctx2, canvas2);
    drawNightOverlay(ctx2, canvas2);
    drawFlashlight(ctx2, canvas2);
    const grad = ctx2.createRadialGradient(canvas2.width / 2, canvas2.height / 2, canvas2.height * 0.35, canvas2.width / 2, canvas2.height / 2, canvas2.height * 0.75);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx2.fillStyle = grad;
    ctx2.fillRect(0, 0, canvas2.width, canvas2.height);
    drawMinimap(ctx2, canvas2);
  }

  // src/net/socket.ts
  var SESSION_TOKEN_KEY = "nightfall_session_token";
  var socket = null;
  var myId = null;
  var myRoomId = null;
  var net = {
    onWelcome: null,
    onLobby: null,
    onPlayers: null,
    onZombies: null,
    onBullets: null,
    onDisconnected: null
  };
  function getMyId() {
    return myId;
  }
  function getSavedToken() {
    try {
      return localStorage.getItem(SESSION_TOKEN_KEY) || "";
    } catch {
      return "";
    }
  }
  function saveToken(token) {
    try {
      localStorage.setItem(SESSION_TOKEN_KEY, token);
    } catch {
    }
  }
  function connect(name) {
    if (socket) disconnect();
    const token = getSavedToken();
    const params = new URLSearchParams();
    if (token) params.set("token", token);
    params.set("name", name);
    const url = WS_URL + "?" + params.toString();
    socket = new WebSocket(url);
    socket.onmessage = (e) => {
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      switch (msg.type) {
        case "welcome":
          myId = msg.id;
          myRoomId = msg.roomId;
          saveToken(msg.sessionToken);
          net.onWelcome?.(msg);
          break;
        case "lobby":
          net.onLobby?.(msg);
          break;
        case "players":
          net.onPlayers?.(msg);
          break;
        case "zombies":
          net.onZombies?.(msg);
          break;
        case "bullets":
          net.onBullets?.(msg);
          break;
      }
    };
    socket.onclose = () => {
      socket = null;
      myId = null;
      myRoomId = null;
      net.onDisconnected?.();
    };
  }
  function disconnect() {
    if (socket) {
      socket.onclose = null;
      socket.close();
      socket = null;
    }
    myId = null;
    myRoomId = null;
  }
  function send(payload) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    }
  }
  function sendReady(ready) {
    send({ type: "ready", ready });
  }

  // src/ui/metaUI.ts
  function costFor(key) {
    const def = PERM_DEFS[key];
    const lvl = meta.perm[key];
    return Math.round(def.costBase * (lvl + 1));
  }
  function renderMetaPanel() {
    const ptsVal = byId("metaPointsVal");
    if (ptsVal) ptsVal.textContent = String(meta.metaPoints);
    const waveVal = byId("bestWaveVal");
    if (waveVal) waveVal.textContent = String(meta.bestWave);
    const killsVal = byId("lifetimeKillsVal");
    if (killsVal) killsVal.textContent = String(meta.lifetimeKills);
    const gamesVal = byId("gamesPlayedVal");
    if (gamesVal) gamesVal.textContent = String(meta.gamesPlayed);
    const wrap = byId("metaUpgrades");
    if (!wrap) return;
    wrap.innerHTML = "";
    Object.keys(PERM_DEFS).forEach((key) => {
      const def = PERM_DEFS[key];
      const lvl = meta.perm[key];
      const cost = costFor(key);
      const affordable = meta.metaPoints >= cost;
      const btn = document.createElement("div");
      btn.className = "meta-btn" + (affordable ? "" : " disabled");
      btn.innerHTML = `<b>${def.label}</b><span class="lvl">Lv ${lvl}</span><div>${def.desc}</div><div class="cost">${cost} pts</div>`;
      btn.onclick = async () => {
        if (meta.metaPoints < cost) return;
        meta.metaPoints -= cost;
        meta.perm[key]++;
        await saveMeta();
        renderMetaPanel();
      };
      wrap.appendChild(btn);
    });
  }
  function renderStartBonuses() {
    const wrap = byId("startBonuses");
    if (!wrap) return;
    wrap.innerHTML = "";
    START_BONUS_DEFS.forEach((b) => {
      const owned = !!meta.startBonuses[b.key];
      const affordable = meta.metaPoints >= b.cost;
      const btn = document.createElement("div");
      btn.className = "meta-btn" + (owned ? " equipped" : affordable ? "" : " disabled");
      btn.innerHTML = `<b>${b.label}</b><div>${b.desc}</div><div class="cost">${owned ? "OWNED" : b.cost + " pts"}</div>`;
      btn.onclick = async () => {
        if (owned || meta.metaPoints < b.cost) return;
        meta.metaPoints -= b.cost;
        meta.startBonuses[b.key] = true;
        await saveMeta();
        renderStartBonuses();
        renderMetaPanel();
      };
      wrap.appendChild(btn);
    });
  }
  function renderMetaSkins() {
    const wrap = byId("metaSkins");
    if (!wrap) return;
    wrap.innerHTML = "";
    const equipDefault = document.createElement("div");
    equipDefault.className = "meta-btn" + (meta.equippedSkin === null ? " equipped" : "");
    equipDefault.innerHTML = `<b>Default</b><div class="cost">${meta.equippedSkin === null ? "EQUIPPED" : "EQUIP"}</div>`;
    equipDefault.onclick = async () => {
      meta.equippedSkin = null;
      await saveMeta();
      renderMetaSkins();
    };
    wrap.appendChild(equipDefault);
    META_SKIN_DEFS.forEach((s) => {
      const owned = meta.unlockedSkins.includes(s.key);
      const equipped = meta.equippedSkin === s.key;
      const affordable = meta.metaPoints >= s.cost;
      const btn = document.createElement("div");
      btn.className = "meta-btn" + (equipped ? " equipped" : !owned && !affordable ? " disabled" : "");
      btn.innerHTML = `<b>${s.label}</b><div class="cost">${owned ? equipped ? "EQUIPPED" : "EQUIP" : s.cost + " pts"}</div>`;
      btn.onclick = async () => {
        if (!owned) {
          if (meta.metaPoints < s.cost) return;
          meta.metaPoints -= s.cost;
          meta.unlockedSkins.push(s.key);
        }
        meta.equippedSkin = s.key;
        await saveMeta();
        renderMetaSkins();
        renderMetaPanel();
      };
      wrap.appendChild(btn);
    });
  }
  async function renderLeaderboard() {
    const list = await loadLeaderboard();
    const el = byId("leaderboardList");
    if (!el) return;
    if (!list.length) {
      el.innerHTML = '<div class="lb-empty">No runs yet \u2014 be the first survivor.</div>';
      return;
    }
    el.innerHTML = list.map((e, i) => `
    <div class="lb-row">
      <span class="lb-rank">#${i + 1}</span>
      <span>${escapeHtml(e.name || "Survivor")}</span>
      <span>wave ${e.wave}</span>
      <span>${e.kills} kills</span>
    </div>
  `).join("");
  }
  function renderModeSelect() {
    const wrap = byId("modeSelect");
    if (!wrap) return;
    wrap.innerHTML = "";
    Object.keys(MODE_DEFS).forEach((key) => {
      const def = MODE_DEFS[key];
      const card = document.createElement("div");
      card.className = "class-card" + (selectedMode === key ? " active" : "");
      card.innerHTML = `<b>${def.label}</b><span>${def.desc}</span>`;
      card.onclick = () => {
        setSelectedMode(key);
        renderModeSelect();
        updateStartBtnLabel();
      };
      wrap.appendChild(card);
    });
  }
  function updateStartBtnLabel() {
    const btn = byId("startBtn");
    if (btn) btn.textContent = selectedMode === "team" ? "QUEUE UP" : "ENTER THE FOREST";
  }
  function renderClassSelect(onConfirm) {
    const wrap = byId("classSelect");
    if (!wrap) return;
    wrap.innerHTML = "";
    const classIcons = { gunner: "\u{1F52B}", builder: "\u{1F528}", scavenger: "\u{1F392}" };
    Object.keys(CLASS_DEFS).forEach((key) => {
      const def = CLASS_DEFS[key];
      const icon = classIcons[key] || "\u2694\uFE0F";
      const card = document.createElement("div");
      card.className = "class-card-modal" + (selectedClass === key ? " active" : "");
      card.innerHTML = `
      <div class="class-img-slot">
        <span class="class-icon">${icon}</span>
        <span class="img-label">IMAGE SLOT</span>
      </div>
      <b class="class-name">${def.label}</b>
      <div class="class-perk">${def.desc}</div>
      <button class="class-pick-btn">CHOOSE ${def.label.toUpperCase()}</button>
    `;
      card.onclick = () => {
        setSelectedClass(key);
        renderClassSelect(onConfirm);
        if (onConfirm) onConfirm();
      };
      wrap.appendChild(card);
    });
  }
  async function initMenu() {
    await loadMeta();
    if (meta.name) {
      const input = byId("nameInput");
      if (input) input.value = meta.name;
    }
    renderMetaPanel();
    renderStartBonuses();
    renderMetaSkins();
    renderModeSelect();
    renderClassSelect();
    renderLeaderboard();
  }
  var countdownTickTimer;
  function stopCountdownTicker() {
    if (countdownTickTimer) {
      clearInterval(countdownTickTimer);
      countdownTickTimer = void 0;
    }
  }
  function applyLobbyMessage(msg) {
    const myId2 = getMyId();
    lobby.players = msg.players.map((p) => ({ id: p.id, name: p.name, ready: p.ready, isLocal: p.id === myId2 }));
    lobby.phase = msg.phase;
    lobby.countdownEndsAt = msg.countdownEndsAt;
    lobby.onPlayersChanged?.();
    stopCountdownTicker();
    if (msg.phase === "countdown") {
      countdownTickTimer = setInterval(() => lobby.onPlayersChanged?.(), 200);
    } else if (msg.phase === "active") {
      lobby.onMatchStart?.();
    }
  }
  net.onLobby = applyLobbyMessage;
  function lobbySetReady(ready) {
    sendReady(ready);
  }
  function lobbyLeave() {
    stopCountdownTicker();
    disconnect();
    lobby.players = [];
    lobby.phase = "waiting";
    lobby.countdownEndsAt = null;
    lobby.onPlayersChanged?.();
  }
  function openLobby() {
    byId("lobbyOverlay").classList.remove("hidden");
    connect(playerName);
  }
  function renderLobby() {
    const wrap = byId("lobbySlots");
    if (!wrap) return;
    wrap.innerHTML = "";
    for (let i = 0; i < 4; i++) {
      const p = lobby.players[i];
      const slot = document.createElement("div");
      if (p) {
        slot.className = "lobby-slot filled" + (p.ready ? " ready" : "");
        slot.innerHTML = `<b class="name">${escapeHtml(p.name)}${p.isLocal ? " (You)" : ""}</b><span class="state">${p.ready ? "READY" : "not ready"}</span>`;
      } else {
        slot.className = "lobby-slot empty";
        slot.innerHTML = `<b class="name">\u2014</b><span class="state">Waiting for player...</span>`;
      }
      wrap.appendChild(slot);
    }
    const total = lobby.players.length;
    const readyCount = lobby.players.filter((p) => p.ready).length;
    const statusEl = byId("lobbyStatus");
    if (statusEl) {
      if (lobby.phase === "countdown" && lobby.countdownEndsAt) {
        const secsLeft = Math.max(0, Math.ceil((lobby.countdownEndsAt - Date.now()) / 1e3));
        statusEl.textContent = `All ready \u2014 starting in ${secsLeft}s...`;
      } else if (lobby.phase === "active") {
        statusEl.textContent = "Starting...";
      } else if (total < 2) {
        statusEl.textContent = `Waiting for players... (${total}/4)`;
      } else {
        statusEl.textContent = `Waiting for everyone to ready up (${readyCount} ready / ${total} joined)`;
      }
    }
    const me = lobby.players.find((p) => p.isLocal);
    const readyBtn = byId("lobbyReadyBtn");
    if (readyBtn) {
      readyBtn.textContent = me?.ready ? "NOT READY" : "READY";
      readyBtn.classList.toggle("is-ready", !!me?.ready);
    }
  }

  // src/ui/shopUI.ts
  var upgrades = [
    { key: "hp", label: "Vitality", desc: "+20 Max HP", apply: () => {
      player.maxHp += 20;
      player.hp += 20;
    } },
    { key: "spd", label: "Speed", desc: "+0.35 Speed", apply: () => {
      player.maxSpeed += 0.35;
    } },
    { key: "dmg", label: "Power", desc: "+3 Damage", apply: () => {
      player.damage += 3;
    } },
    { key: "rate", label: "Reload", desc: "+0.45 Fire Rate", apply: () => {
      player.fireRate += 0.45;
    } }
  ];
  function createShopItems() {
    return [
      { key: "buy_insta", category: "powerup", label: "Insta-Kill", desc: "20s of one-shot kills", cost: 80, apply: () => applyPowerup("insta") },
      { key: "buy_double", category: "powerup", label: "Double XP", desc: "30s of 2x XP", cost: 60, apply: () => applyPowerup("double") },
      { key: "buy_heal", category: "powerup", label: "Full Heal", desc: "restore all HP", cost: 50, apply: () => applyPowerup("heal") },
      { key: "buy_nuke", category: "powerup", label: "Nuke", desc: "devastate nearby zombies", cost: 150, apply: () => applyPowerup("nuke") },
      { key: "boost_speed", category: "boost", label: "Adrenaline", desc: "+35% speed, 45s", cost: 40, apply: () => {
        player.speedBoostUntil = performance.now() + 45e3;
        showBanner("ADRENALINE", "speed boosted", "power");
      } },
      { key: "boost_damage", category: "boost", label: "Sharpshooter", desc: "+50% damage, 45s", cost: 70, apply: () => {
        player.damageBoostUntil = performance.now() + 45e3;
        showBanner("SHARPSHOOTER", "damage boosted", "power");
      } },
      { key: "boost_rate", category: "boost", label: "Rapid Fire", desc: "+40% fire rate, 45s", cost: 70, apply: () => {
        player.fireRateBoostUntil = performance.now() + 45e3;
        showBanner("RAPID FIRE", "fire rate boosted", "power");
      } },
      { key: "boost_regen", category: "boost", label: "Field Medic", desc: "3x HP regen, 45s", cost: 40, apply: () => {
        player.regenBoostUntil = performance.now() + 45e3;
        showBanner("FIELD MEDIC", "regen boosted", "power");
      } },
      {
        key: "special_repair",
        category: "special",
        label: "Repair Crew",
        desc: "fully repair all structures",
        cost: 50,
        apply: () => {
          for (const s of structures) s.hp = s.maxHp;
          showBanner("REPAIR CREW", "structures restored", "power");
        }
      },
      {
        key: "special_cache",
        category: "special",
        label: "Supply Drop",
        desc: "+40 wood, +30 stone",
        cost: 40,
        apply: () => {
          player.wood += 40;
          player.stone += 30;
          showBanner("SUPPLY DROP", "+40 wood, +30 stone", "power");
        }
      },
      {
        key: "special_life",
        category: "special",
        label: "Second Chance",
        desc: "survive one lethal hit",
        cost: 200,
        disabledIf: () => player.secondChance,
        apply: () => {
          player.secondChance = true;
          showBanner("SECOND CHANCE", "you'll survive one lethal hit", "power");
        }
      },
      { key: "skin_default", category: "cosmetic", label: "Default", desc: "no tint", cost: 0, isEquipped: () => player.skinTint === null, apply: () => {
        player.skinTint = null;
      } },
      { key: "skin_crimson", category: "cosmetic", label: "Crimson", desc: "red skin tint", cost: 30, isEquipped: () => player.skinTint === "crimson", apply: () => {
        player.skinTint = "crimson";
      } },
      { key: "skin_azure", category: "cosmetic", label: "Azure", desc: "blue skin tint", cost: 30, isEquipped: () => player.skinTint === "azure", apply: () => {
        player.skinTint = "azure";
      } },
      { key: "skin_golden", category: "cosmetic", label: "Golden", desc: "gold skin tint", cost: 30, isEquipped: () => player.skinTint === "golden", apply: () => {
        player.skinTint = "golden";
      } },
      { key: "skin_shadow", category: "cosmetic", label: "Shadow", desc: "dark skin tint", cost: 30, isEquipped: () => player.skinTint === "shadow", apply: () => {
        player.skinTint = "shadow";
      } }
    ];
  }
  var shopItemsList = createShopItems();
  function renderShopPanel() {
    const ptsVal = byId("shopPointsVal");
    if (ptsVal) ptsVal.textContent = String(player.points);
    const wrap = byId("shopItems");
    if (!wrap) return;
    wrap.innerHTML = "";
    const categories = [
      { key: "powerup", title: "POWERUPS" },
      { key: "boost", title: "TEMPORARY BOOSTS" },
      { key: "special", title: "SPECIAL ITEMS" },
      { key: "cosmetic", title: "COSMETICS" }
    ];
    categories.forEach((cat) => {
      const title = document.createElement("div");
      title.className = "shop-cat-title";
      title.textContent = cat.title;
      wrap.appendChild(title);
      const row = document.createElement("div");
      row.className = "shop-row";
      shopItemsList.filter((it) => it.category === cat.key).forEach((item) => {
        const cantAfford = player.points < item.cost;
        const blocked = !!(item.disabledIf && item.disabledIf());
        const equipped = !!(item.isEquipped && item.isEquipped());
        const btn = document.createElement("div");
        btn.className = "shop-item" + ((cantAfford || blocked) && !equipped ? " disabled" : "") + (equipped ? " equipped" : "");
        btn.innerHTML = `<b>${item.label}</b><div class="desc">${item.desc}</div><div class="cost">${item.cost > 0 ? item.cost + " pts" : "free"}</div>`;
        btn.onclick = () => {
          if (blocked || equipped) return;
          if (player.points < item.cost) return;
          player.points -= item.cost;
          item.apply();
          renderShopPanel();
        };
        row.appendChild(btn);
      });
      wrap.appendChild(row);
    });
  }
  function toggleShop() {
    setShopOpen(!shopOpen);
    if (shopOpen) {
      renderShopPanel();
      byId("shopPanel").classList.remove("hidden");
    } else {
      byId("shopPanel").classList.add("hidden");
    }
  }
  function selectBuild(key) {
    setSelectedBuild(selectedBuild === key ? null : key);
    setManualBuildAngle(null);
    renderBuildBar();
  }
  function drawBuildPreview2(canvas2, key) {
    const ctx2 = canvas2.getContext("2d");
    if (!ctx2) return;
    ctx2.clearRect(0, 0, canvas2.width, canvas2.height);
    ctx2.save();
    const cx = canvas2.width / 2;
    const cy = canvas2.height / 2;
    ctx2.fillStyle = "rgba(0,0,0,0.18)";
    ctx2.beginPath();
    ctx2.ellipse(cx, cy + 6, 12, 4, 0, 0, Math.PI * 2);
    ctx2.fill();
    if (key === "wall") {
      ctx2.save();
      ctx2.translate(cx, cy);
      ctx2.rotate(Math.PI / 6);
      ctx2.fillStyle = "#a9aeb2";
      ctx2.strokeStyle = "#2a2d30";
      ctx2.lineWidth = 2;
      const w = 26, h = 9;
      ctx2.beginPath();
      if (ctx2.roundRect) ctx2.roundRect(-w / 2, -h / 2, w, h, 2.5);
      else ctx2.rect(-w / 2, -h / 2, w, h);
      ctx2.fill();
      ctx2.stroke();
      ctx2.strokeStyle = "rgba(0,0,0,0.2)";
      ctx2.lineWidth = 0.8;
      ctx2.beginPath();
      ctx2.moveTo(-w / 2 + w / 3, -h / 2);
      ctx2.lineTo(-w / 2 + w / 3, h / 2);
      ctx2.moveTo(w / 2 - w / 3, -h / 2);
      ctx2.lineTo(w / 2 - w / 3, h / 2);
      ctx2.moveTo(-w / 2, 0);
      ctx2.lineTo(w / 2, 0);
      ctx2.stroke();
      ctx2.restore();
    } else if (key === "spike") {
      ctx2.save();
      ctx2.translate(cx, cy + 1);
      ctx2.fillStyle = "#d8e0e4";
      ctx2.strokeStyle = "#1a1208";
      ctx2.lineWidth = 1.2;
      const w = 24, h = 6;
      for (let i = 0; i < 4; i++) {
        const px = -w / 2 + (i + 0.5) * (w / 4);
        ctx2.beginPath();
        ctx2.moveTo(px - 2, -h / 2);
        ctx2.lineTo(px, -h / 2 - 5);
        ctx2.lineTo(px + 2, -h / 2);
        ctx2.closePath();
        ctx2.fill();
        ctx2.stroke();
      }
      ctx2.fillStyle = "#7a5230";
      ctx2.strokeStyle = "#2a1c0e";
      ctx2.lineWidth = 1.6;
      ctx2.beginPath();
      if (ctx2.roundRect) ctx2.roundRect(-w / 2, -h / 2, w, h, 1.5);
      else ctx2.rect(-w / 2, -h / 2, w, h);
      ctx2.fill();
      ctx2.stroke();
      ctx2.restore();
    } else if (key === "cannon") {
      ctx2.save();
      ctx2.translate(cx, cy);
      ctx2.fillStyle = "#6a9a9e";
      ctx2.strokeStyle = "#1c2426";
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      ctx2.arc(0, 0, 8, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.stroke();
      ctx2.fillStyle = "#2f3a3c";
      ctx2.fillRect(-2, -12, 4, 7);
      ctx2.strokeRect(-2, -12, 4, 7);
      ctx2.restore();
    } else if (key === "mortar") {
      ctx2.save();
      ctx2.translate(cx, cy);
      ctx2.fillStyle = "#34495e";
      ctx2.strokeStyle = "#2c3e50";
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      ctx2.arc(0, 0, 8, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.stroke();
      ctx2.fillStyle = "#1a252f";
      ctx2.beginPath();
      ctx2.arc(0, 0, 5, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.restore();
    } else if (key === "sniper") {
      ctx2.save();
      ctx2.translate(cx, cy);
      ctx2.fillStyle = "#7f8c8d";
      ctx2.strokeStyle = "#bdc3c7";
      ctx2.lineWidth = 1.5;
      ctx2.beginPath();
      ctx2.arc(0, 0, 6, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.stroke();
      ctx2.fillStyle = "#333";
      ctx2.fillRect(-1, -14, 2, 10);
      ctx2.fillStyle = "#e74c3c";
      ctx2.beginPath();
      ctx2.arc(0, -14, 1.5, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.restore();
    } else if (key === "tesla") {
      ctx2.save();
      ctx2.translate(cx, cy);
      ctx2.fillStyle = "#d35400";
      ctx2.strokeStyle = "#e67e22";
      ctx2.lineWidth = 1.8;
      ctx2.beginPath();
      ctx2.moveTo(-6, 8);
      ctx2.lineTo(-2, -6);
      ctx2.lineTo(2, -6);
      ctx2.lineTo(6, 8);
      ctx2.closePath();
      ctx2.fill();
      ctx2.stroke();
      ctx2.fillStyle = "#5dade2";
      ctx2.beginPath();
      ctx2.arc(0, -6, 4, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.restore();
    } else if (key === "frost") {
      ctx2.save();
      ctx2.translate(cx, cy);
      ctx2.fillStyle = "#a5f3fc";
      ctx2.strokeStyle = "#38bdf8";
      ctx2.lineWidth = 1.5;
      ctx2.beginPath();
      ctx2.moveTo(0, -10);
      ctx2.lineTo(5, -2);
      ctx2.lineTo(3, 8);
      ctx2.lineTo(-3, 8);
      ctx2.lineTo(-5, -2);
      ctx2.closePath();
      ctx2.fill();
      ctx2.stroke();
      ctx2.restore();
    } else if (key === "toxic") {
      ctx2.save();
      ctx2.translate(cx, cy);
      ctx2.fillStyle = "#27ae60";
      ctx2.strokeStyle = "#1e8449";
      ctx2.lineWidth = 1.8;
      ctx2.beginPath();
      ctx2.arc(0, 0, 7, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.stroke();
      ctx2.fillStyle = "#2ecc71";
      ctx2.beginPath();
      ctx2.arc(-2, -2, 2, 0, Math.PI * 2);
      ctx2.arc(2, 2, 1.5, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.restore();
    } else if (key === "factory") {
      ctx2.save();
      ctx2.translate(cx, cy);
      ctx2.fillStyle = "#c0392b";
      ctx2.strokeStyle = "#962d22";
      ctx2.lineWidth = 2;
      ctx2.fillRect(-10, -4, 20, 11);
      ctx2.strokeRect(-10, -4, 20, 11);
      ctx2.fillStyle = "#7f8c8d";
      ctx2.fillRect(-6, -10, 3, 6);
      ctx2.fillRect(2, -10, 3, 6);
      ctx2.restore();
    } else if (key === "campfire") {
      ctx2.save();
      ctx2.translate(cx, cy);
      ctx2.fillStyle = "#5c4530";
      ctx2.strokeStyle = "#22190f";
      ctx2.lineWidth = 1.6;
      ctx2.beginPath();
      ctx2.arc(0, 1.5, 8, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.stroke();
      ctx2.fillStyle = "#ff9f43";
      ctx2.beginPath();
      ctx2.arc(0, -0.5, 4, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.fillStyle = "#ffe066";
      ctx2.beginPath();
      ctx2.arc(0, -2, 2, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.restore();
    } else if (key === "shop") {
      ctx2.save();
      ctx2.translate(cx, cy + 1);
      const w = 24, h = 13;
      ctx2.fillStyle = "#7a5230";
      ctx2.strokeStyle = "#2a1c0e";
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      if (ctx2.roundRect) ctx2.roundRect(-w / 2, -h / 2, w, h, 2);
      else ctx2.rect(-w / 2, -h / 2, w, h);
      ctx2.fill();
      ctx2.stroke();
      const stripes = 4;
      for (let i = 0; i < stripes; i++) {
        ctx2.fillStyle = i % 2 === 0 ? "#c98b4a" : "#ffd76a";
        const sx = -w / 2 + i * (w / stripes);
        ctx2.beginPath();
        ctx2.moveTo(sx, -h / 2);
        ctx2.lineTo(sx + w / stripes, -h / 2);
        ctx2.lineTo(sx + w / stripes * 0.8, -h / 2 - 4);
        ctx2.lineTo(sx + w / stripes * 0.2, -h / 2 - 4);
        ctx2.closePath();
        ctx2.fill();
      }
      ctx2.restore();
    }
    ctx2.restore();
  }
  function renderBuildBar() {
    const bar = byId("buildBar");
    if (!bar) return;
    bar.innerHTML = "";
    const order = ["wall", "spike", "cannon", "mortar", "sniper", "campfire", "shop", "factory"];
    order.forEach((key, index) => {
      const def = BUILD_DEFS[key];
      const wCost = Math.ceil(def.wood * (player.buildDiscount || 1));
      const sCost = Math.ceil(def.stone * (player.buildDiscount || 1));
      const slot = document.createElement("div");
      slot.className = "build-slot" + (selectedBuild === key ? " active" : "");
      slot.onclick = () => selectBuild(key);
      const badge = document.createElement("div");
      badge.className = "build-key-badge";
      badge.textContent = String(index + 1);
      slot.appendChild(badge);
      const canvasWrap = document.createElement("div");
      canvasWrap.className = "build-canvas-wrap";
      const canvas2 = document.createElement("canvas");
      canvas2.width = 50;
      canvas2.height = 36;
      canvasWrap.appendChild(canvas2);
      slot.appendChild(canvasWrap);
      drawBuildPreview2(canvas2, key);
      const label = document.createElement("b");
      label.textContent = def.label;
      slot.appendChild(label);
      const cost = document.createElement("div");
      cost.className = "cost";
      cost.textContent = (wCost ? wCost + "w " : "") + (sCost ? sCost + "s" : "");
      slot.appendChild(cost);
      bar.appendChild(slot);
    });
  }
  function renderUpgradePanel() {
    const panel = byId("upgradePanel");
    if (!panel) return;
    panel.innerHTML = "";
    if (player.statPoints <= 0) return;
    upgrades.forEach((u) => {
      const btn = document.createElement("div");
      btn.className = "upgrade-btn";
      btn.innerHTML = `<b>${u.label}</b>${u.desc}`;
      btn.onclick = () => {
        if (player.statPoints <= 0) return;
        u.apply();
        player.statPoints--;
        renderUpgradePanel();
      };
      panel.appendChild(btn);
    });
  }
  function tryBuildOrUpgrade() {
    if (!player.alive) return;
    if (shopOpen) {
      toggleShop();
      return;
    }
    if (factoryOpen) {
      toggleFactory();
      return;
    }
    if (!selectedBuild) {
      if (findNearestShop(80)) {
        toggleShop();
        return;
      }
      if (findNearestFactory(80)) {
        toggleFactory();
        return;
      }
      spawnParticle(player.x, player.y - 30, "no building selected", "#7fa08c");
      return;
    }
    const target = getBuildTarget();
    const occupant = target.occupant;
    if (occupant && target.canUpgrade) {
      if (occupant.type === "wall" || occupant.type === "spike") {
        const tiers = STRUCTURE_TIERS[occupant.type];
        const curTier = occupant.tier || 0;
        const next = tiers[curTier + 1];
        if (next) {
          if (player.points >= next.pointsCost) {
            player.points -= next.pointsCost;
            occupant.tier = curTier + 1;
            occupant.maxHp = next.hpMax;
            occupant.hp = next.hpMax;
            if (occupant.type === "spike") {
              occupant.damage = next.damage;
            }
            spawnParticle(occupant.x, occupant.y - 30, next.name.toUpperCase() + " " + occupant.type.toUpperCase(), "#c7cfd2");
          } else {
            spawnParticle(player.x, player.y - 30, "need " + next.pointsCost + " points", "#ff8080");
          }
        } else {
          spawnParticle(occupant.x, occupant.y - 30, "MAX TIER", "#8bd17c");
        }
        return;
      }
      if (occupant.type === "cannon" || occupant.type === "mortar" || occupant.type === "sniper" || occupant.type === "tesla" || occupant.type === "frost" || occupant.type === "toxic") {
        const curLvl = occupant.level || 1;
        if (curLvl >= 5) {
          spawnParticle(occupant.x, occupant.y - 30, "MAX LEVEL", "#8bd17c");
          return;
        }
        const levels = TOWER_LEVELS[occupant.type];
        const nextSpec = levels[curLvl];
        const costInfo = nextSpec.cost;
        if (costInfo) {
          const res = costInfo.resource;
          const amt = costInfo.amount;
          if (player[res] >= amt) {
            player[res] -= amt;
            occupant.level = curLvl + 1;
            const hpFactor = 1 + (occupant.level - 1) * 0.5;
            const baseHp = BUILD_DEFS[occupant.type].hp;
            occupant.maxHp = Math.round(baseHp * hpFactor);
            occupant.hp = occupant.maxHp;
            spawnParticle(occupant.x, occupant.y - 30, "Lv." + occupant.level + " " + occupant.type.toUpperCase() + "!", "#ffd76a");
            spawnBurst(occupant.x, occupant.y, "#ffd76a", 12);
          } else {
            spawnParticle(player.x, player.y - 30, "need " + amt + " " + res, "#ff8080");
          }
        }
        return;
      }
    }
    if (occupant) {
      spawnParticle(player.x, player.y - 30, "cell occupied", "#ff8080");
      return;
    }
    if (target.blockedByResource) {
      spawnParticle(player.x, player.y - 30, "blocked", "#ff8080");
      return;
    }
    if (!target.canAfford) {
      spawnParticle(player.x, player.y - 30, "not enough materials", "#ff8080");
      return;
    }
    const def = BUILD_DEFS[selectedBuild];
    const wCost = Math.ceil(def.wood * (player.buildDiscount || 1));
    const sCost = Math.ceil(def.stone * (player.buildDiscount || 1));
    player.wood -= wCost;
    player.stone -= sCost;
    const placedAngle = getPlacementAngle();
    const s = { type: selectedBuild, x: target.cx, y: target.cy, radius: def.radius, hp: def.hp, maxHp: def.hp, angle: placedAngle };
    if (selectedBuild === "wall") s.tier = 0;
    if (selectedBuild === "spike") {
      s.damage = def.damage;
      s.tier = 0;
    }
    if (selectedBuild === "campfire") {
      s.healRadius = def.healRadius;
      s.healRate = def.healRate;
    }
    if (selectedBuild === "cannon" || selectedBuild === "mortar" || selectedBuild === "sniper" || selectedBuild === "tesla" || selectedBuild === "frost" || selectedBuild === "toxic") {
      s.level = 1;
      s.aimAngle = placedAngle;
      s.lastShot = 0;
    }
    structures.push(s);
  }
  function renderWeaponChoice() {
    const wrap = byId("weaponChoiceItems");
    if (!wrap) return;
    wrap.innerHTML = "";
    Object.keys(WEAPON_DEFS).filter((k) => k !== "pistol").forEach((key) => {
      const def = WEAPON_DEFS[key];
      const card = document.createElement("div");
      card.className = "weapon-card";
      card.innerHTML = `<b>${def.label}</b><div class="desc">${def.desc}</div><div class="playstyle">${def.playstyle}</div>`;
      card.onclick = () => {
        player.weapon = key;
        player.weaponChosen = true;
        setWeaponChoiceOpen(false);
        byId("weaponChoicePanel").classList.add("hidden");
        showBanner(def.label.toUpperCase() + " UNLOCKED", def.playstyle, "power");
      };
      wrap.appendChild(card);
    });
  }
  function openWeaponChoice() {
    setWeaponChoiceOpen(true);
    renderWeaponChoice();
    byId("weaponChoicePanel").classList.remove("hidden");
  }
  function renderMutationChoice() {
    const wrap = byId("mutationChoiceItems");
    if (!wrap) return;
    wrap.innerHTML = "";
    Object.keys(MUTATION_DEFS).forEach((key) => {
      const def = MUTATION_DEFS[key];
      const card = document.createElement("div");
      card.className = "mutation-card";
      card.innerHTML = `<b>${def.label}</b><div class="desc">${def.desc}</div><div class="playstyle">${def.playstyle}</div>`;
      card.onclick = () => {
        player.mutation = key;
        player.mutationChosen = true;
        def.apply(player);
        setMutationChoiceOpen(false);
        byId("mutationChoicePanel").classList.add("hidden");
        showBanner(def.label.toUpperCase() + " UNLOCKED", def.playstyle, "power");
      };
      wrap.appendChild(card);
    });
  }
  function openMutationChoice() {
    setMutationChoiceOpen(true);
    renderMutationChoice();
    byId("mutationChoicePanel").classList.remove("hidden");
  }
  function updateHud() {
    byId("waveLabel").textContent = "WAVE " + wave;
    byId("zLabel").textContent = "zombies: " + zombies.length + (zombiesToSpawn > 0 ? " (+" + zombiesToSpawn + ")" : "");
    byId("woodCount").textContent = String(player.wood);
    byId("stoneCount").textContent = String(player.stone);
    byId("ironCount").textContent = String(player.iron);
    byId("goldCount").textContent = String(player.gold);
    byId("levelTag").textContent = "LEVEL " + player.level + (player.statPoints > 0 ? "  \u2022  " + player.statPoints + " pt available" : "");
    byId("pointsCount").textContent = String(player.points);
    const now = performance.now();
    const instaEl = byId("puInsta");
    if (now < player.instaKillUntil) {
      instaEl.classList.add("show");
      instaEl.textContent = "\u26A1 INSTA-KILL " + Math.ceil((player.instaKillUntil - now) / 1e3) + "s";
    } else instaEl.classList.remove("show");
    const doubleEl = byId("puDouble");
    if (now < player.doubleXpUntil) {
      doubleEl.classList.add("show");
      doubleEl.textContent = "2x XP " + Math.ceil((player.doubleXpUntil - now) / 1e3) + "s";
    } else doubleEl.classList.remove("show");
    const speedEl = byId("puSpeed");
    if (now < player.speedBoostUntil) {
      speedEl.classList.add("show");
      speedEl.textContent = "\u{1F4A8} SPEED " + Math.ceil((player.speedBoostUntil - now) / 1e3) + "s";
    } else speedEl.classList.remove("show");
    const dmgEl = byId("puDamage");
    if (now < player.damageBoostUntil) {
      dmgEl.classList.add("show");
      dmgEl.textContent = "\u{1F3AF} DAMAGE " + Math.ceil((player.damageBoostUntil - now) / 1e3) + "s";
    } else dmgEl.classList.remove("show");
    const rateEl = byId("puRate");
    if (now < player.fireRateBoostUntil) {
      rateEl.classList.add("show");
      rateEl.textContent = "\u{1F525} RAPID FIRE " + Math.ceil((player.fireRateBoostUntil - now) / 1e3) + "s";
    } else rateEl.classList.remove("show");
    const regenEl = byId("puRegen");
    if (now < player.regenBoostUntil) {
      regenEl.classList.add("show");
      regenEl.textContent = "\u{1F49A} REGEN " + Math.ceil((player.regenBoostUntil - now) / 1e3) + "s";
    } else regenEl.classList.remove("show");
    const heatEl = byId("puHeat");
    if (player.mutation === "overclocked") {
      heatEl.classList.add("show");
      const overheated = now < player.overheatedUntil;
      heatEl.textContent = overheated ? "\u{1F321}\uFE0F OVERHEATED " + Math.ceil((player.overheatedUntil - now) / 1e3) + "s" : "\u{1F321}\uFE0F HEAT " + Math.round(player.heat) + "%";
    } else heatEl.classList.remove("show");
    const shopHintEl = byId("shopHint");
    const factoryHintEl = byId("factoryHint");
    const nearShop = !shopOpen && !factoryOpen && findNearestShop(80);
    const nearFactory = !factoryOpen && !shopOpen && findNearestFactory(80);
    if (nearShop) shopHintEl?.classList.add("show");
    else shopHintEl?.classList.remove("show");
    if (nearFactory) factoryHintEl?.classList.add("show");
    else factoryHintEl?.classList.remove("show");
    if (shopOpen && !findNearestShop(100)) toggleShop();
    if (factoryOpen && !findNearestFactory(100)) toggleFactory();
    const rotateHintEl = byId("rotateHint");
    if (selectedBuild === "wall" || selectedBuild === "spike") rotateHintEl.classList.add("show");
    else rotateHintEl.classList.remove("show");
    byId("hpFill").style.width = Math.max(0, player.hp / player.maxHp * 100) + "%";
    byId("hpText").textContent = Math.round(Math.max(0, player.hp)) + "/" + player.maxHp;
    byId("xpFill").style.width = player.xp / player.xpToNext * 100 + "%";
    byId("xpText").textContent = Math.round(player.xp) + "/" + player.xpToNext;
    if (inspectedStructure) renderStructureInspector();
  }
  var ADVANCED_TOWERS = ["tesla", "frost", "toxic"];
  function renderFactoryPanel() {
    const wrap = byId("factoryItems");
    if (!wrap) return;
    wrap.innerHTML = "";
    ADVANCED_TOWERS.forEach((key) => {
      const def = BUILD_DEFS[key];
      const wCost = Math.ceil(def.wood * (player.buildDiscount || 1));
      const sCost = Math.ceil(def.stone * (player.buildDiscount || 1));
      const cantAfford = player.wood < wCost || player.stone < sCost;
      const card = document.createElement("div");
      card.className = "factory-item" + (cantAfford ? " disabled" : "");
      let desc = "";
      let badgeText = "";
      if (key === "tesla") {
        badgeText = "CONTROL / CHAIN";
        desc = "Fires chain lightning striking up to 6 targets. Lv.5 stuns enemies.";
      } else if (key === "frost") {
        badgeText = "CONTROL / AURA";
        desc = "Emits a slowing freeze aura. Lv.5 freezes enemies solid.";
      } else if (key === "toxic") {
        badgeText = "DEBUFF / ACID";
        desc = "Fires acid shells creating toxic clouds that shred enemy armor.";
      }
      card.innerHTML = `
      <div class="factory-item-header">
        <b>${def.label}</b>
        <span class="factory-badge">${badgeText}</span>
      </div>
      <div class="desc">${desc}</div>
      <div class="factory-item-footer">
        <div class="cost">${wCost} Wood, ${sCost} Stone</div>
        <button class="factory-build-btn">${selectedBuild === key ? "SELECTED" : "CRAFT & PLACE"}</button>
      </div>
    `;
      const btn = card.querySelector(".factory-build-btn");
      btn.onclick = (e) => {
        e.stopPropagation();
        if (cantAfford) {
          spawnParticle(player.x, player.y - 30, "not enough materials", "#ff8080");
          return;
        }
        selectBuild(key);
        toggleFactory();
      };
      wrap.appendChild(card);
    });
  }
  function toggleFactory() {
    setFactoryOpen(!factoryOpen);
    if (factoryOpen) {
      if (shopOpen) setShopOpen(false);
      renderFactoryPanel();
      byId("factoryPanel")?.classList.remove("hidden");
    } else {
      byId("factoryPanel")?.classList.add("hidden");
    }
  }
  function closeStructureInspector() {
    setInspectedStructure(null);
    byId("structureInspector")?.classList.add("hidden");
  }
  function renderStructureInspector() {
    const panel = byId("structureInspector");
    if (!panel) return;
    if (!inspectedStructure || inspectedStructure.hp <= 0) {
      panel.classList.add("hidden");
      return;
    }
    const st = inspectedStructure;
    panel.classList.remove("hidden");
    const def = BUILD_DEFS[st.type];
    const nameEl = byId("inspectorName");
    const lvlEl = byId("inspectorLvl");
    const hpFill = byId("inspectorHpFill");
    const hpText = byId("inspectorHpText");
    const statsWrap = byId("inspectorStats");
    const costText = byId("inspectorCostText");
    const upgradeBtn = byId("inspectorUpgradeBtn");
    if (nameEl) nameEl.textContent = def ? def.label.toUpperCase() : st.type.toUpperCase();
    if (st.type === "cannon" || st.type === "mortar" || st.type === "sniper" || st.type === "tesla" || st.type === "frost" || st.type === "toxic") {
      if (lvlEl) lvlEl.textContent = "LV. " + (st.level || 1);
    } else if (st.type === "wall" || st.type === "spike") {
      if (lvlEl) lvlEl.textContent = "TIER " + ((st.tier || 0) + 1);
    } else {
      if (lvlEl) lvlEl.textContent = "UTILITY";
    }
    const hpPct = Math.max(0, Math.min(100, st.hp / st.maxHp * 100));
    if (hpFill) hpFill.style.width = hpPct + "%";
    if (hpText) hpText.textContent = Math.round(Math.max(0, st.hp)) + "/" + st.maxHp + " HP";
    if (statsWrap) {
      statsWrap.innerHTML = "";
      let statsHtml = "";
      if (st.type === "cannon" || st.type === "mortar" || st.type === "sniper" || st.type === "tesla" || st.type === "frost" || st.type === "toxic") {
        const curLvl = st.level || 1;
        const spec = TOWER_LEVELS[st.type][curLvl - 1];
        if (spec) {
          if (spec.damage) statsHtml += `<div class="inspector-stat-row"><span>Damage</span><b>${spec.damage}</b></div>`;
          if (spec.fireRate) statsHtml += `<div class="inspector-stat-row"><span>Fire Rate</span><b>${spec.fireRate}/s</b></div>`;
          if (spec.range) statsHtml += `<div class="inspector-stat-row"><span>Range</span><b>${spec.range} px</b></div>`;
          if (spec.specialValue) statsHtml += `<div class="inspector-stat-row" style="color:var(--col-teal-light);"><span>Special</span><b>${spec.specialValue}</b></div>`;
        }
      } else if (st.type === "wall") {
        const tierInfo = STRUCTURE_TIERS.wall[st.tier || 0];
        statsHtml += `<div class="inspector-stat-row"><span>Wall HP</span><b>${st.maxHp}</b></div>`;
        if (tierInfo) statsHtml += `<div class="inspector-stat-row"><span>Grade</span><b>${tierInfo.name}</b></div>`;
      } else if (st.type === "spike") {
        const tierInfo = STRUCTURE_TIERS.spike[st.tier || 0];
        statsHtml += `<div class="inspector-stat-row"><span>Spike Dmg</span><b>${st.damage || 15}</b></div>`;
        if (tierInfo) statsHtml += `<div class="inspector-stat-row"><span>Grade</span><b>${tierInfo.name}</b></div>`;
      } else if (st.type === "campfire") {
        statsHtml += `<div class="inspector-stat-row"><span>Heal Rate</span><b>${st.healRate || 5} HP/s</b></div>`;
        statsHtml += `<div class="inspector-stat-row"><span>Heal Radius</span><b>${st.healRadius || 150} px</b></div>`;
      } else if (st.type === "factory") {
        statsHtml += `<div class="inspector-stat-row"><span>Function</span><b>Crafts Advanced Towers</b></div>`;
      }
      statsWrap.innerHTML = statsHtml;
    }
    if (st.type === "cannon" || st.type === "mortar" || st.type === "sniper" || st.type === "tesla" || st.type === "frost" || st.type === "toxic") {
      const curLvl = st.level || 1;
      if (curLvl < 5) {
        const nextSpec = TOWER_LEVELS[st.type][curLvl];
        const costInfo = nextSpec.cost;
        if (costInfo) {
          const canAfford = player[costInfo.resource] >= costInfo.amount;
          if (costText) costText.textContent = `UPGRADE TO LV.${curLvl + 1}: ${costInfo.amount} ${costInfo.resource.toUpperCase()}`;
          if (upgradeBtn) {
            upgradeBtn.disabled = !canAfford;
            upgradeBtn.textContent = canAfford ? `UPGRADE TO LV.${curLvl + 1}` : `NEED ${costInfo.amount} ${costInfo.resource.toUpperCase()}`;
          }
        }
      } else {
        if (costText) costText.textContent = "MAX LEVEL REACHED (LV.5)";
        if (upgradeBtn) {
          upgradeBtn.disabled = true;
          upgradeBtn.textContent = "MAX LEVEL";
        }
      }
    } else if (st.type === "wall" || st.type === "spike") {
      const curTier = st.tier || 0;
      const tiers = STRUCTURE_TIERS[st.type];
      const next = tiers[curTier + 1];
      if (next) {
        const canAfford = player.points >= next.pointsCost;
        if (costText) costText.textContent = `UPGRADE TO TIER ${curTier + 2}: ${next.pointsCost} POINTS`;
        if (upgradeBtn) {
          upgradeBtn.disabled = !canAfford;
          upgradeBtn.textContent = canAfford ? `UPGRADE TO TIER ${curTier + 2}` : `NEED ${next.pointsCost} POINTS`;
        }
      } else {
        if (costText) costText.textContent = "MAX TIER REACHED";
        if (upgradeBtn) {
          upgradeBtn.disabled = true;
          upgradeBtn.textContent = "MAX TIER";
        }
      }
    } else {
      if (costText) costText.textContent = "UTILITY STRUCTURE (NO UPGRADES)";
      if (upgradeBtn) {
        upgradeBtn.disabled = true;
        upgradeBtn.textContent = "MAX LEVEL";
      }
    }
  }
  function upgradeInspectedStructure() {
    if (!inspectedStructure) return;
    const st = inspectedStructure;
    if (st.type === "cannon" || st.type === "mortar" || st.type === "sniper" || st.type === "tesla" || st.type === "frost" || st.type === "toxic") {
      const curLvl = st.level || 1;
      if (curLvl >= 5) {
        spawnParticle(st.x, st.y - 30, "MAX LEVEL", "#8bd17c");
        return;
      }
      const levels = TOWER_LEVELS[st.type];
      const nextSpec = levels[curLvl];
      const costInfo = nextSpec.cost;
      if (costInfo) {
        const res = costInfo.resource;
        const amt = costInfo.amount;
        if (player[res] >= amt) {
          player[res] -= amt;
          st.level = curLvl + 1;
          const hpFactor = 1 + (st.level - 1) * 0.5;
          const baseHp = BUILD_DEFS[st.type].hp;
          st.maxHp = Math.round(baseHp * hpFactor);
          st.hp = st.maxHp;
          spawnParticle(st.x, st.y - 30, "Lv." + st.level + " " + st.type.toUpperCase() + "!", "#ffd76a");
          spawnBurst(st.x, st.y, "#ffd76a", 12);
          renderStructureInspector();
        } else {
          spawnParticle(player.x, player.y - 30, "need " + amt + " " + res, "#ff8080");
        }
      }
    } else if (st.type === "wall" || st.type === "spike") {
      const curTier = st.tier || 0;
      const tiers = STRUCTURE_TIERS[st.type];
      const next = tiers[curTier + 1];
      if (next) {
        if (player.points >= next.pointsCost) {
          player.points -= next.pointsCost;
          st.tier = curTier + 1;
          st.maxHp = next.hpMax;
          st.hp = next.hpMax;
          if (st.type === "spike") st.damage = next.damage;
          spawnParticle(st.x, st.y - 30, next.name.toUpperCase() + " " + st.type.toUpperCase(), "#c7cfd2");
          renderStructureInspector();
        } else {
          spawnParticle(player.x, player.y - 30, "need " + next.pointsCost + " points", "#ff8080");
        }
      } else {
        spawnParticle(st.x, st.y - 30, "MAX TIER", "#8bd17c");
      }
    }
  }

  // src/ui/settingsUI.ts
  function renderSettingsUI() {
    const shakeBtn = byId("settingShakeBtn");
    if (shakeBtn) {
      shakeBtn.textContent = settings.screenShake ? "ON" : "OFF";
      shakeBtn.classList.toggle("off", !settings.screenShake);
    }
    const dmgBtn = byId("settingDamageNumBtn");
    if (dmgBtn) {
      dmgBtn.textContent = settings.damageNumbers ? "ON" : "OFF";
      dmgBtn.classList.toggle("off", !settings.damageNumbers);
    }
    const sBtn = byId("scaleSmallBtn");
    if (sBtn) sBtn.classList.toggle("active", settings.uiScale === "small");
    const mBtn = byId("scaleMediumBtn");
    if (mBtn) mBtn.classList.toggle("active", settings.uiScale === "medium");
    const lBtn = byId("scaleLargeBtn");
    if (lBtn) lBtn.classList.toggle("active", settings.uiScale === "large");
  }
  function openSettings() {
    setSettingsOpenedMidRun(running);
    if (running) setPaused(true);
    renderSettingsUI();
    byId("settingsOverlay").classList.remove("hidden");
  }
  function closeSettings() {
    byId("settingsOverlay").classList.add("hidden");
    if (settingsOpenedMidRun) setPaused(false);
  }

  // src/ui/debugUI.ts
  function toggleDebugPanel() {
    const lobbyOpen = !byId("lobbyOverlay").classList.contains("hidden");
    if (!running && !lobbyOpen) return;
    setDebugOpen(!debugOpen);
    const panel = byId("debugPanel");
    if (debugOpen) {
      panel.classList.remove("hidden");
      byId("debugLockStep").classList.toggle("hidden", debugUnlocked);
      byId("debugControls").classList.toggle("hidden", !debugUnlocked);
      if (!debugUnlocked) {
        const input = byId("debugPassInput");
        input.value = "";
        byId("debugLockMsg").textContent = "";
        setTimeout(() => input.focus(), 0);
      }
    } else {
      panel.classList.add("hidden");
    }
  }
  function tryDebugUnlock() {
    const input = byId("debugPassInput");
    if (input.value === DEBUG_PASSWORD) {
      setDebugUnlocked(true);
      byId("debugLockStep").classList.add("hidden");
      byId("debugControls").classList.remove("hidden");
    } else {
      byId("debugLockMsg").textContent = "wrong password";
      input.value = "";
      input.focus();
    }
  }
  function cheatSetLevel(target) {
    target = clamp(Math.floor(target) || 1, 1, 999);
    player.level = target;
    player.statPoints = target - 1;
    player.maxHp = BASE_STATS.maxHp + (target - 1) * 8;
    player.hp = player.maxHp;
    let xpNeeded = 50;
    for (let l = 1; l < target; l++) {
      xpNeeded = Math.floor(xpNeeded * 1.32);
    }
    player.xpToNext = xpNeeded;
    player.xp = 0;
    if (player.level >= 15 && !player.weaponChosen) openWeaponChoice();
    if (player.level >= 25 && !player.mutationChosen) openMutationChoice();
    renderUpgradePanel();
  }
  function cheatSetWave(target) {
    target = clamp(Math.floor(target) || 1, 1, 999);
    setZombies([]);
    startWave(target);
  }
  function cheatKillAll() {
    const activeZombies = [...zombies];
    for (const z of activeZombies) {
      zombieDied(z);
    }
    setZombies([]);
  }
  function setupDebugUI() {
    const debugBox = byId("debugBox");
    if (!debugBox) return;
    debugBox.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter" && !debugUnlocked) tryDebugUnlock();
    });
    debugBox.addEventListener("keyup", (e) => e.stopPropagation());
    byId("debugUnlockBtn").onclick = tryDebugUnlock;
    byId("debugCloseBtn").onclick = () => toggleDebugPanel();
    byId("debugSetLevelBtn").onclick = () => {
      cheatSetLevel(Number(byId("debugLevelInput").value));
    };
    byId("debugAddPointsBtn").onclick = () => {
      const n = Math.floor(Number(byId("debugPointsInput").value)) || 0;
      player.points = Math.max(0, player.points + n);
    };
    byId("debugSetPointsBtn").onclick = () => {
      player.points = Math.max(0, Math.floor(Number(byId("debugPointsInput").value)) || 0);
    };
    byId("debugSetWaveBtn").onclick = () => {
      cheatSetWave(Number(byId("debugWaveInput").value));
    };
    byId("debugAddResBtn").onclick = () => {
      const n = Math.max(0, Math.floor(Number(byId("debugResInput").value)) || 0);
      player.wood += n;
      player.stone += n;
    };
    byId("debugFullHealBtn").onclick = () => {
      player.hp = player.maxHp;
    };
    byId("debugKillAllBtn").onclick = () => {
      cheatKillAll();
    };
    byId("debugSkipLevel10Btn").onclick = () => {
      cheatSetLevel(10);
    };
    const speedSelect = byId("debugSpeedSelect");
    if (speedSelect) {
      speedSelect.onchange = (e) => {
        const val = Number(e.target.value) || 1;
        setDebugSpeedMultiplier(val);
      };
    }
    byId("debugGodBtn").onclick = () => {
      setGodMode(!godMode);
      byId("debugGodBtn").textContent = "GOD MODE: " + (godMode ? "ON" : "OFF");
    };
    byId("debugBloodMoonBtn").onclick = () => {
      bloodMoon.active = true;
      bloodMoon.endsAt = performance.now() + BLOOD_MOON_DURATION_MS;
      showBanner("BLOOD MOON RISING", "Zombies spawn faster and hit harder...", "blood");
    };
  }

  // src/ui/codexUI.ts
  var SPECIMENS = [
    {
      id: "normal",
      name: "Normal Zombie",
      hp: "Medium (80)",
      speed: "Normal (100%)",
      danger: "Low",
      lore: "The most common manifestation of the pathogen. While individually slow and clumsy, they rely on swarm tactics to overwhelm survivors. Always maintain distance to prevent being surrounded.",
      draw: (ctx2, cx, cy, time) => {
        const bounce = Math.sin(time * 5e-3) * 2;
        const armAnim = Math.sin(time * 7e-3) * 0.15;
        drawDummyZombie(ctx2, cx, cy + bounce, 18, "#4c8a52", "#3a6b40", "#274d2b", armAnim, false, false, false, "normal");
      }
    },
    {
      id: "scout",
      name: "Scout Zombie",
      hp: "Low (44)",
      speed: "Fast (170%)",
      danger: "Medium",
      lore: "Distinguished by their sickly yellow skin and smaller frame. They possess heightened awareness and move with alarming speed. Prioritize shooting scouts before they sprint into your position.",
      draw: (ctx2, cx, cy, time) => {
        const bounce = Math.sin(time * 8e-3) * 3;
        const armAnim = Math.sin(time * 0.01) * 0.25;
        drawDummyZombie(ctx2, cx, cy + bounce, 14, "#c9c24e", "#a8a13c", "#7a742a", armAnim, false, false, false, "scout");
      }
    },
    {
      id: "brute",
      name: "Brute Zombie",
      hp: "High (192)",
      speed: "Slow (65%)",
      danger: "High",
      lore: "A massive mutated specimen with thick blood-red skin and protruding bone spurs on its shoulders. It moves slowly but can endure extreme firepower and deliver crushing melee blows to fortifications.",
      draw: (ctx2, cx, cy, time) => {
        const bounce = Math.sin(time * 3e-3) * 1.5;
        const armAnim = Math.sin(time * 4e-3) * 0.08;
        ctx2.save();
        ctx2.translate(cx, cy + bounce);
        ctx2.fillStyle = "#4d2020";
        ctx2.strokeStyle = "#141f18";
        ctx2.lineWidth = 2;
        [-0.7, 0.7].forEach((off) => {
          ctx2.beginPath();
          ctx2.arc(Math.cos(off + Math.PI / 2) * 22, Math.sin(off + Math.PI / 2) * 22, 6, 0, Math.PI * 2);
          ctx2.fill();
          ctx2.stroke();
        });
        ctx2.restore();
        drawDummyZombie(ctx2, cx, cy + bounce, 24, "#8a3d3d", "#6e2f2f", "#4d2020", armAnim, false, false, false, "brute");
      }
    },
    {
      id: "spitter",
      name: "Spitter Zombie",
      hp: "Low (56)",
      speed: "Slow (55%)",
      danger: "Medium",
      lore: "Carries a swollen, translucent acidic sac on its back. It spits high-velocity corrosive bile from long range. Keep moving to dodge its projectiles and protect your defensive walls.",
      draw: (ctx2, cx, cy, time) => {
        const bounce = Math.sin(time * 4e-3) * 1.8;
        ctx2.fillStyle = "#437040";
        ctx2.strokeStyle = "#141f18";
        ctx2.lineWidth = 2.5;
        ctx2.beginPath();
        ctx2.arc(cx, cy + bounce + 10, 10, 0, Math.PI * 2);
        ctx2.fill();
        ctx2.stroke();
        drawDummyZombie(ctx2, cx, cy + bounce, 15, "#5a9151", "#437040", "#2b4526", 0, true, false, false, "spitter");
      }
    },
    {
      id: "exploder",
      name: "Exploder Zombie",
      hp: "Medium (48)",
      speed: "Fast (150%)",
      danger: "High",
      lore: "Swollen with highly unstable volatile gases. When triggered or killed, they combust in a massive explosion. Extremely dangerous to defensive lines \u2014 destroy them before they breach your walls.",
      draw: (ctx2, cx, cy, time) => {
        const bounce = Math.sin(time * 6e-3) * 2.2;
        const pulse = 20 + Math.sin(time * 0.01) * 2;
        drawDummyZombie(ctx2, cx, cy + bounce, pulse, "#c07a2e", "#9c5c1e", "#5c2e0d", 0, false, true, false, "exploder");
      }
    },
    {
      id: "wolf",
      name: "Zombie Wolf",
      hp: "Low (40)",
      speed: "Very Fast (185%)",
      danger: "High",
      lore: "Plague-infected feral beast that retains its pack hunting instinct. Possesses relentless attack speed and can quickly slip past defenses. Keep your shotguns ready for close encounters.",
      draw: (ctx2, cx, cy, time) => {
        const bounce = Math.sin(time * 8e-3) * 3;
        const legOffset = Math.sin(time * 0.015) * 8;
        ctx2.save();
        ctx2.translate(cx, cy + bounce);
        ctx2.fillStyle = "rgba(0,0,0,0.18)";
        ctx2.beginPath();
        ctx2.ellipse(0, 15, 24, 7, 0, 0, Math.PI * 2);
        ctx2.fill();
        ctx2.strokeStyle = "#3a444c";
        ctx2.lineWidth = 6;
        ctx2.beginPath();
        ctx2.moveTo(-18, 0);
        ctx2.quadraticCurveTo(-28, -8 + bounce, -32, 2);
        ctx2.stroke();
        ctx2.strokeStyle = "#3a444c";
        ctx2.lineWidth = 4;
        ctx2.beginPath();
        ctx2.moveTo(-10, 5);
        ctx2.lineTo(-10 + legOffset, 15);
        ctx2.stroke();
        ctx2.beginPath();
        ctx2.moveTo(-6, 5);
        ctx2.lineTo(-6 - legOffset, 15);
        ctx2.stroke();
        ctx2.beginPath();
        ctx2.moveTo(10, 5);
        ctx2.lineTo(10 - legOffset, 15);
        ctx2.stroke();
        ctx2.beginPath();
        ctx2.moveTo(14, 5);
        ctx2.lineTo(14 + legOffset, 15);
        ctx2.stroke();
        ctx2.fillStyle = "#7a8a95";
        ctx2.strokeStyle = "#141f18";
        ctx2.lineWidth = 2.5;
        ctx2.beginPath();
        ctx2.ellipse(0, 0, 20, 11, 0, 0, Math.PI * 2);
        ctx2.fill();
        ctx2.stroke();
        ctx2.fillStyle = "#5c6b75";
        ctx2.beginPath();
        ctx2.arc(14, -8, 8, 0, Math.PI * 2);
        ctx2.fill();
        ctx2.stroke();
        ctx2.fillStyle = "#3a444c";
        ctx2.fillRect(18, -10, 8, 4);
        ctx2.strokeRect(18, -10, 8, 4);
        ctx2.fillStyle = "#7a8a95";
        ctx2.beginPath();
        ctx2.moveTo(10, -14);
        ctx2.lineTo(14, -20);
        ctx2.lineTo(16, -14);
        ctx2.closePath();
        ctx2.fill();
        ctx2.stroke();
        ctx2.fillStyle = "#ff3b3b";
        ctx2.beginPath();
        ctx2.arc(16, -10, 2, 0, Math.PI * 2);
        ctx2.fill();
        ctx2.restore();
      }
    },
    {
      id: "boss",
      name: "Megazombie Boss",
      hp: "Massive (Boss)",
      speed: "Normal (100%)",
      danger: "Extreme",
      lore: "A colossal, highly unstable mutated titan representing the apex of the infection. It commands other zombies and strikes with planet-shaking force. Aim for its glowing red eyes and keep structures repaired.",
      draw: (ctx2, cx, cy, time) => {
        const bounce = Math.sin(time * 3e-3) * 1;
        const armAnim = Math.sin(time * 4e-3) * 0.05;
        ctx2.save();
        ctx2.translate(cx, cy + bounce);
        for (let i = 0; i < 7; i++) {
          const a = i / 7 * Math.PI * 2 + time * 1e-3;
          ctx2.fillStyle = "#7c3aed";
          ctx2.strokeStyle = "#141f18";
          ctx2.lineWidth = 2;
          ctx2.beginPath();
          ctx2.moveTo(Math.cos(a) * 35, Math.sin(a) * 35);
          ctx2.lineTo(Math.cos(a + 0.1) * 48, Math.sin(a + 0.1) * 48);
          ctx2.lineTo(Math.cos(a - 0.1) * 48, Math.sin(a - 0.1) * 48);
          ctx2.closePath();
          ctx2.fill();
          ctx2.stroke();
        }
        ctx2.restore();
        drawDummyZombie(ctx2, cx, cy + bounce, 36, "#4b2a63", "#3a1f4d", "#241333", armAnim, false, false, true, "boss");
      }
    },
    {
      id: "spider",
      name: "Zombie Spider",
      hp: "Medium (64)",
      speed: "Fast (135%)",
      danger: "High",
      lore: "A mutated arachnid specimen carrying the pathogen. It can easily crawl through/over defensive barricades and structures, making wall blocking less effective. Its long-range web attack slows you down significantly.",
      draw: (ctx2, cx, cy, time) => {
        const bounce = Math.sin(time * 5e-3) * 1.5;
        ctx2.save();
        ctx2.translate(cx, cy + bounce);
        const r = 16;
        const OUTLINE = "#141f18";
        const bodyCol = "#2c3e50";
        const bodyCol2 = "#1a252f";
        const legCol = "#0e141a";
        const legAngles = [-1.3, -0.9, -0.5, -0.1, 0.1, 0.5, 0.9, 1.3];
        legAngles.forEach((legOffset, idx) => {
          const side = idx < 4 ? -1 : 1;
          const legSweep = Math.sin(time * 8e-3 + idx * 0.5) * 0.18;
          const a = legOffset + side * Math.PI / 4 + legSweep;
          const hipX = Math.cos(legOffset) * r * 0.45;
          const hipY = Math.sin(legOffset) * r * 0.45;
          const jointX = hipX + Math.cos(a) * r * 0.8;
          const jointY = hipY + Math.sin(a) * r * 0.8;
          const tipAngle = a + side * 0.6;
          const tipX = jointX + Math.cos(tipAngle) * r * 0.7;
          const tipY = jointY + Math.sin(tipAngle) * r * 0.7;
          ctx2.lineCap = "round";
          ctx2.strokeStyle = OUTLINE;
          ctx2.lineWidth = r * 0.22 + 4;
          ctx2.beginPath();
          ctx2.moveTo(hipX, hipY);
          ctx2.lineTo(jointX, jointY);
          ctx2.lineTo(tipX, tipY);
          ctx2.stroke();
          ctx2.strokeStyle = legCol;
          ctx2.lineWidth = r * 0.22;
          ctx2.beginPath();
          ctx2.moveTo(hipX, hipY);
          ctx2.lineTo(jointX, jointY);
          ctx2.lineTo(tipX, tipY);
          ctx2.stroke();
        });
        ctx2.fillStyle = bodyCol;
        ctx2.beginPath();
        ctx2.ellipse(-r * 0.4, 0, r * 1, r * 0.8, 0, 0, Math.PI * 2);
        ctx2.fill();
        ctx2.strokeStyle = OUTLINE;
        ctx2.lineWidth = 2.5;
        ctx2.stroke();
        ctx2.fillStyle = bodyCol2;
        ctx2.beginPath();
        ctx2.ellipse(r * 0.4, 0, r * 0.65, r * 0.55, 0, 0, Math.PI * 2);
        ctx2.fill();
        ctx2.strokeStyle = OUTLINE;
        ctx2.lineWidth = 2;
        ctx2.stroke();
        ctx2.fillStyle = "#ff1e1e";
        [-0.2, 0, 0.2].forEach((off) => {
          ctx2.beginPath();
          ctx2.arc(r * 0.65, r * off * 0.35, r * 0.08, 0, Math.PI * 2);
          ctx2.fill();
        });
        ctx2.restore();
      }
    },
    {
      id: "witch",
      name: "Zombie Witch",
      hp: "High (112)",
      speed: "Slow (80%)",
      danger: "Extreme",
      lore: "A dangerous sorceress of the plague. She throws high-damage magic orbs from a distance and summons lesser zombies to screen her. She casts a permanent speed-boosting aura for all nearby zombies.",
      draw: (ctx2, cx, cy, time) => {
        const bounce = Math.sin(time * 4e-3) * 2;
        ctx2.save();
        ctx2.translate(cx, cy + bounce);
        const r = 18;
        const OUTLINE = "#141f18";
        const bodyCol = "#8e44ad";
        const bodyCol2 = "#7d3c98";
        ctx2.fillStyle = "#4a235a";
        ctx2.strokeStyle = OUTLINE;
        ctx2.lineWidth = 2.5;
        ctx2.beginPath();
        ctx2.arc(0, r * 0.45, r * 0.8, 0, Math.PI);
        ctx2.closePath();
        ctx2.fill();
        ctx2.stroke();
        const armAnim = Math.sin(time * 7e-3) * 0.15;
        drawDummyZombie(ctx2, 0, 0, r, bodyCol, bodyCol2, "#4a235a", armAnim, true, false, false, "witch");
        const staffAngle = 0.7;
        const handDist = r * 0.85;
        const hx = Math.cos(staffAngle) * handDist;
        const hy = Math.sin(staffAngle) * handDist;
        ctx2.strokeStyle = "#5c4033";
        ctx2.lineWidth = 2.5;
        ctx2.beginPath();
        ctx2.moveTo(hx - 8, hy - 8);
        ctx2.lineTo(hx + 12, hy + 12);
        ctx2.stroke();
        ctx2.fillStyle = "#9b59b6";
        ctx2.strokeStyle = OUTLINE;
        ctx2.lineWidth = 1.2;
        ctx2.beginPath();
        ctx2.moveTo(hx + 8, hy + 8);
        ctx2.lineTo(hx + 16, hy + 16);
        ctx2.lineTo(hx + 12, hy + 12);
        ctx2.closePath();
        ctx2.fill();
        ctx2.stroke();
        ctx2.fillStyle = "#1a052e";
        ctx2.strokeStyle = OUTLINE;
        ctx2.lineWidth = 2.5;
        ctx2.beginPath();
        ctx2.ellipse(0, 0, r * 1.5, r * 0.95, 0, 0, Math.PI * 2);
        ctx2.fill();
        ctx2.stroke();
        ctx2.beginPath();
        ctx2.moveTo(-r * 0.4, -r * 0.1);
        ctx2.lineTo(r * 0.4, -r * 0.1);
        ctx2.lineTo(-r * 0.6, -r * 1.3);
        ctx2.closePath();
        ctx2.fill();
        ctx2.stroke();
        ctx2.restore();
      }
    }
  ];
  function drawDummyZombie(ctx2, cx, cy, r, bodyCol, bodyCol2, darkCol, armAngle, ranged, exploderGlow = false, isBoss = false, type) {
    ctx2.save();
    ctx2.fillStyle = "rgba(0,0,0,0.18)";
    ctx2.beginPath();
    ctx2.ellipse(cx, cy + r * 0.65, r * 0.85, r * 0.38, 0, 0, Math.PI * 2);
    ctx2.fill();
    const OUTLINE = "#141f18";
    const spread = ranged ? 0.62 : 0.48;
    const reach = ranged ? 0.8 : 0.88;
    [-1, 1].forEach((side) => {
      const angle = -Math.PI / 2 + side * spread + armAngle;
      const bx = cx + Math.cos(angle) * r * reach;
      const by = cy + Math.sin(angle) * r * reach;
      const blobR = r * 0.52;
      ctx2.strokeStyle = OUTLINE;
      ctx2.lineCap = "round";
      ctx2.lineWidth = r * 0.6 + 5;
      ctx2.beginPath();
      ctx2.moveTo(cx, cy);
      ctx2.lineTo(bx, by);
      ctx2.stroke();
      ctx2.strokeStyle = "rgba(20, 20, 20, 0.45)";
      ctx2.lineWidth = r * 0.6;
      ctx2.beginPath();
      ctx2.moveTo(cx, cy);
      ctx2.lineTo(bx, by);
      ctx2.stroke();
      ctx2.fillStyle = radialFillDummy(ctx2, bx, by, blobR, bodyCol, bodyCol2);
      ctx2.beginPath();
      ctx2.arc(bx, by, blobR, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.strokeStyle = OUTLINE;
      ctx2.lineWidth = 2.5;
      ctx2.stroke();
      if (type === "spitter") {
        ctx2.fillStyle = "rgba(46, 204, 113, 0.7)";
        ctx2.beginPath();
        ctx2.arc(bx + Math.sin(performance.now() * 8e-3) * 3, by + 4, 3, 0, Math.PI * 2);
        ctx2.fill();
      }
    });
    if (type === "brute") {
      ctx2.fillStyle = "#f0ead6";
      ctx2.strokeStyle = OUTLINE;
      ctx2.lineWidth = 2;
      [-1, 1].forEach((side) => {
        const sx = cx + r * 0.75 * side;
        const sy = cy + r * 0.3;
        ctx2.beginPath();
        ctx2.moveTo(sx, sy);
        ctx2.lineTo(sx + r * 0.3 * side, sy - r * 0.35);
        ctx2.lineTo(sx + r * 0.1 * side, sy);
        ctx2.closePath();
        ctx2.fill();
        ctx2.stroke();
      });
    }
    if (type === "spitter") {
      ctx2.fillStyle = "#2ecc71";
      ctx2.strokeStyle = OUTLINE;
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      ctx2.arc(cx - r * 0.4, cy - r * 0.4, r * 0.5, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.stroke();
    }
    ctx2.fillStyle = radialFillDummy(ctx2, cx, cy, r, bodyCol, bodyCol2);
    ctx2.beginPath();
    ctx2.ellipse(cx, cy, r, r * 0.98, 0, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.strokeStyle = OUTLINE;
    ctx2.lineWidth = 3.5;
    ctx2.stroke();
    if (type !== "wolf" && type !== "spider") {
      ctx2.fillStyle = "rgba(0,0,0,0.12)";
      for (let i = 0; i < 3; i++) {
        const offX = Math.sin(i * 1.5) * r * 0.35;
        const offY = Math.cos(i * 1.5) * r * 0.35;
        ctx2.beginPath();
        ctx2.arc(cx + offX, cy + offY, r * 0.11, 0, Math.PI * 2);
        ctx2.fill();
      }
    }
    if (type === "scout") {
      ctx2.fillStyle = "#e74c3c";
      ctx2.strokeStyle = OUTLINE;
      ctx2.lineWidth = 1.5;
      ctx2.beginPath();
      ctx2.ellipse(cx, cy - r * 0.25, r * 0.9, r * 0.16, 0, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.stroke();
    }
    if (type === "brute") {
      ctx2.fillStyle = "#7f8c8d";
      ctx2.strokeStyle = OUTLINE;
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      ctx2.ellipse(cx, cy + r * 0.4, r * 0.55, r * 0.22, 0, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.stroke();
    }
    if (type === "exploder") {
      ctx2.fillStyle = "#e74c3c";
      ctx2.strokeStyle = OUTLINE;
      ctx2.lineWidth = 2;
      ctx2.fillRect(cx - r * 0.32, cy - r * 0.08, r * 0.64, r * 0.4);
      ctx2.strokeRect(cx - r * 0.32, cy - r * 0.08, r * 0.64, r * 0.4);
      ctx2.strokeStyle = "#2c3e50";
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      ctx2.moveTo(cx - r * 0.7, cy + r * 0.12);
      ctx2.lineTo(cx + r * 0.7, cy + r * 0.12);
      ctx2.stroke();
    }
    if (type === "boss") {
      ctx2.strokeStyle = "#a855f7";
      ctx2.lineWidth = 3;
      ctx2.beginPath();
      ctx2.moveTo(cx - r * 0.4, cy - r * 0.4);
      ctx2.lineTo(cx + r * 0.1, cy + r * 0.1);
      ctx2.lineTo(cx - r * 0.4, cy + r * 0.4);
      ctx2.stroke();
    }
    const eyeSep = r * 0.3;
    const eyeFwd = -r * 0.22;
    [-1, 1].forEach((side) => {
      const ex = cx + eyeSep * side;
      const ey = cy + eyeFwd;
      ctx2.fillStyle = isBoss ? "#ff3b3b" : "#f4f4ec";
      ctx2.strokeStyle = OUTLINE;
      ctx2.lineWidth = 1.4;
      ctx2.beginPath();
      ctx2.arc(ex, ey, r * 0.16, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.stroke();
      ctx2.fillStyle = "#1c1c1c";
      ctx2.beginPath();
      ctx2.arc(ex, ey, r * 0.075, 0, Math.PI * 2);
      ctx2.fill();
    });
    const mx = cx;
    const my = cy + r * 0.3;
    ctx2.fillStyle = "#1c1c1c";
    ctx2.beginPath();
    ctx2.ellipse(mx, my, r * 0.22, r * 0.14, 0, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.fillStyle = "#e8e2d0";
    for (let i = -1; i <= 1; i += 2) {
      ctx2.fillRect(mx + i * r * 0.12 - 1.5, my - r * 0.08, 3, r * 0.1);
    }
    if (exploderGlow) {
      const pulse = 0.4 + 0.3 * Math.sin(performance.now() * 8e-3);
      ctx2.fillStyle = `rgba(255, 120, 60, ${pulse})`;
      ctx2.beginPath();
      ctx2.ellipse(cx, cy, r - 2, r - 2, 0, 0, Math.PI * 2);
      ctx2.fill();
    }
    ctx2.restore();
  }
  function radialFillDummy(ctx2, sx, sy, radius, cLight, cDark) {
    const g = ctx2.createRadialGradient(sx - radius * 0.3, sy - radius * 0.3, radius * 0.1, sx, sy, radius);
    g.addColorStop(0, cLight);
    g.addColorStop(1, cDark);
    return g;
  }
  var activeSpecimenId = null;
  var animationFrameId = null;
  function openCodex() {
    loadCodex();
    const modal = byId("codexModal");
    if (modal) {
      modal.classList.remove("hidden");
      renderCodexList();
      const firstEncountered = SPECIMENS.find((s) => codex.encountered[s.id]);
      if (firstEncountered) {
        selectSpecimen(firstEncountered.id);
      } else {
        selectSpecimen(null);
      }
      startAnimationLoop();
    }
  }
  function closeCodex() {
    const modal = byId("codexModal");
    if (modal) {
      modal.classList.add("hidden");
      stopAnimationLoop();
    }
  }
  function startAnimationLoop() {
    stopAnimationLoop();
    const canvas2 = byId("codexPreviewCanvas");
    const ctx2 = canvas2?.getContext("2d");
    if (!canvas2 || !ctx2) return;
    function loop2() {
      if (activeSpecimenId) {
        const specimen = SPECIMENS.find((s) => s.id === activeSpecimenId);
        const isEncountered = codex.encountered[activeSpecimenId];
        ctx2.clearRect(0, 0, canvas2.width, canvas2.height);
        if (specimen && isEncountered) {
          specimen.draw(ctx2, canvas2.width / 2, canvas2.height / 2 + 5, performance.now());
        } else {
          ctx2.save();
          ctx2.fillStyle = "#6d9080";
          ctx2.textAlign = "center";
          ctx2.textBaseline = "middle";
          ctx2.font = "700 32px Ubuntu";
          ctx2.fillText("LOCKED", canvas2.width / 2, canvas2.height / 2);
          ctx2.restore();
        }
      }
      animationFrameId = requestAnimationFrame(loop2);
    }
    animationFrameId = requestAnimationFrame(loop2);
  }
  function stopAnimationLoop() {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }
  function selectSpecimen(id) {
    activeSpecimenId = id;
    const detailEmpty = byId("codexDetailEmpty");
    const detailContent = byId("codexDetailContent");
    if (!id) {
      if (detailEmpty) detailEmpty.classList.remove("hidden");
      if (detailContent) detailContent.classList.add("hidden");
      return;
    }
    if (detailEmpty) detailEmpty.classList.add("hidden");
    if (detailContent) detailContent.classList.remove("hidden");
    const specimen = SPECIMENS.find((s) => s.id === id);
    const isEncountered = codex.encountered[id];
    const nameEl = byId("codexMonsterName");
    const historyEl = byId("codexHistory");
    const statsEl = byId("codexStats");
    const loreEl = byId("codexLore");
    if (!specimen || !nameEl || !historyEl || !statsEl || !loreEl) return;
    if (isEncountered) {
      nameEl.textContent = specimen.name;
      const firstKillDate = codex.firstKilled[id];
      historyEl.innerHTML = `First Encountered: <span class="codex-highlight">Yes</span><br>First Defeated: <span class="codex-highlight">${firstKillDate || "Not defeated yet"}</span>`;
      const dangerClass = specimen.danger.toLowerCase();
      statsEl.innerHTML = `
      <div class="codex-stat-row"><span>HEALTH</span><b>${specimen.hp}</b></div>
      <div class="codex-stat-row"><span>MOVEMENT SPEED</span><b>${specimen.speed}</b></div>
      <div class="codex-stat-row"><span>DANGER CLASS</span><b class="danger-tag ${dangerClass}">${specimen.danger}</b></div>
    `;
      loreEl.textContent = specimen.lore;
    } else {
      nameEl.textContent = "??? Locked Specimen";
      historyEl.innerHTML = `First Encountered: <span class="codex-locked">No</span>`;
      statsEl.innerHTML = `
      <div class="codex-stat-row"><span>HEALTH</span><b class="codex-locked">Unknown</b></div>
      <div class="codex-stat-row"><span>MOVEMENT SPEED</span><b class="codex-locked">Unknown</b></div>
      <div class="codex-stat-row"><span>DANGER CLASS</span><b class="codex-locked">Unknown</b></div>
    `;
      loreEl.textContent = "Tactical data locked. Encounter this mutation during survival waves to unlock bestiary records.";
    }
  }
  function renderCodexList() {
    const listEl = byId("codexList");
    if (!listEl) return;
    listEl.innerHTML = "";
    SPECIMENS.forEach((specimen) => {
      const isEncountered = codex.encountered[specimen.id];
      const row = document.createElement("div");
      row.className = "codex-row" + (activeSpecimenId === specimen.id ? " active" : "");
      const thumb = document.createElement("canvas");
      thumb.width = 30;
      thumb.height = 30;
      thumb.className = "codex-thumb";
      const tctx = thumb.getContext("2d");
      if (tctx) {
        if (isEncountered) {
          tctx.save();
          let scale = 0.5;
          if (specimen.id === "boss") scale = 0.28;
          else if (specimen.id === "brute") scale = 0.38;
          else if (specimen.id === "wolf" || specimen.id === "spider" || specimen.id === "witch") scale = 0.44;
          tctx.translate(15, 15);
          tctx.scale(scale, scale);
          specimen.draw(tctx, 0, 0, 0);
          tctx.restore();
        } else {
          tctx.fillStyle = "#6d9080";
          tctx.textAlign = "center";
          tctx.textBaseline = "middle";
          tctx.font = "700 14px Ubuntu";
          tctx.fillText("?", 15, 15);
        }
      }
      row.appendChild(thumb);
      const nameSpan = document.createElement("span");
      nameSpan.textContent = isEncountered ? specimen.name : "??? Unknown";
      row.appendChild(nameSpan);
      row.onclick = () => {
        const activeRows = listEl.querySelectorAll(".codex-row.active");
        activeRows.forEach((r) => r.classList.remove("active"));
        row.classList.add("active");
        selectSpecimen(specimen.id);
      };
      listEl.appendChild(row);
    });
  }
  function initCodexUI() {
    const codexBtn = byId("codexBtn");
    const closeBtn = byId("codexCloseBtn");
    if (codexBtn) {
      codexBtn.onclick = (e) => {
        e.stopPropagation();
        openCodex();
      };
    }
    if (closeBtn) {
      closeBtn.onclick = () => {
        closeCodex();
      };
    }
    const modal = byId("codexModal");
    if (modal) {
      modal.onclick = (e) => {
        if (e.target === modal) {
          closeCodex();
        }
      };
    }
  }

  // src/game.ts
  setXpCallbacks({
    onWeaponChoice: openWeaponChoice,
    onMutationChoice: openMutationChoice,
    onUpgradePanel: renderUpgradePanel
  });
  var canvas = byId("game");
  var ctx = canvas.getContext("2d");
  function resize() {
    const w = window.innerWidth || document.documentElement.clientWidth || 800;
    const h = window.innerHeight || document.documentElement.clientHeight || 600;
    canvas.width = w;
    canvas.height = h;
  }
  resize();
  window.addEventListener("resize", resize);
  setTimeout(resize, 50);
  setTimeout(resize, 300);
  function showFatalError(err) {
    setRunning(false);
    let box = document.getElementById("fatalError");
    if (!box) {
      box = document.createElement("div");
      box.id = "fatalError";
      box.style.cssText = "position:fixed;inset:0;z-index:999;background:rgba(10,10,10,0.95);color:#ff8080;font-family:monospace;font-size:13px;padding:24px;overflow:auto;white-space:pre-wrap;";
      document.body.appendChild(box);
    }
    const message = err instanceof Error ? err.message + "\n" + (err.stack || "") : String(err);
    box.textContent = "NIGHTFALL.IO hit an error and stopped so it wouldn't just go black silently.\nPlease screenshot this and share it:\n\n" + message;
  }
  function loop(t) {
    if (!running) return;
    if (paused) {
      setLastTime(t);
      requestAnimationFrame(loop);
      return;
    }
    try {
      let dt = (t - lastTime) * debugSpeedMultiplier;
      if (dt > 100 * debugSpeedMultiplier) dt = 100 * debugSpeedMultiplier;
      setLastTime(t);
      updatePlayer(dt, camera);
      updateBullets(dt);
      updateStructures(dt);
      updateZombies(dt, dayNight.factor);
      updateParticles(dt);
      updateBloodMoon();
      updateDayNight(dt);
      updateWaves(dt);
      updateHud();
      render(ctx, canvas);
    } catch (err) {
      showFatalError(err);
      return;
    }
    requestAnimationFrame(loop);
  }
  function resetGame() {
    const perm = meta.perm;
    const maxHp = BASE_STATS.maxHp + PERM_DEFS.hp.bonus(perm.hp);
    Object.assign(player, {
      x: WORLD_W / 2,
      y: WORLD_H / 2,
      vx: 0,
      vy: 0,
      angle: 0,
      radius: BASE_STATS.radius,
      hp: maxHp,
      maxHp,
      maxSpeed: BASE_STATS.maxSpeed + PERM_DEFS.speed.bonus(perm.speed),
      accel: BASE_STATS.accel,
      friction: BASE_STATS.friction,
      damage: BASE_STATS.damage + PERM_DEFS.damage.bonus(perm.damage),
      bulletSpeed: BASE_STATS.bulletSpeed,
      bulletRadius: BASE_STATS.bulletRadius,
      fireRate: BASE_STATS.fireRate + PERM_DEFS.rate.bonus(perm.rate),
      lastShot: 0,
      level: 1,
      xp: 0,
      xpToNext: 50,
      statPoints: 0,
      points: 0,
      wood: 0,
      stone: 0,
      iron: 0,
      gold: 0,
      kills: 0,
      regen: BASE_STATS.regen + PERM_DEFS.regen.bonus(perm.regen),
      alive: true,
      buildDiscount: 1,
      resourceMul: 1,
      fortuneMul: 1 + PERM_DEFS.fortune.bonus(perm.fortune),
      instaKillUntil: 0,
      doubleXpUntil: 0,
      speedBoostUntil: 0,
      damageBoostUntil: 0,
      fireRateBoostUntil: 0,
      regenBoostUntil: 0,
      secondChance: false,
      skinTint: meta.equippedSkin,
      weapon: "pistol",
      weaponChosen: false,
      mutation: null,
      mutationChosen: false,
      heat: 0,
      overheatedUntil: 0
    });
    CLASS_DEFS[selectedClass].apply(player);
    if (meta.startBonuses["headstart"]) {
      player.wood += 50;
      player.stone += 50;
    }
    if (meta.startBonuses["nestegg"]) {
      player.points += 30;
    }
    resetZombieId();
    setBullets([]);
    setZombies([]);
    setStructures([]);
    setCrates([]);
    setParticles([]);
    setBursts([]);
    setPowerups([]);
    setBloodDecals([]);
    setWave(0);
    setWaveState("idle");
    setIsBossWave(false);
    setActiveBoss(null);
    dayNight.time = 0;
    dayNight.factor = 0;
    dayNight.isNight = false;
    dayNight.nightSpawnTimer = 6e3;
    bloodMoon.active = false;
    bloodMoon.endsAt = 0;
    bloodMoon.nextAt = performance.now() + rand(BLOOD_MOON_MIN_GAP_MS, BLOOD_MOON_MAX_GAP_MS);
    const bossBar = byId("bossBar");
    if (bossBar) bossBar.classList.remove("show");
    setShopOpen(false);
    byId("shopPanel").classList.add("hidden");
    setWeaponChoiceOpen(false);
    byId("weaponChoicePanel").classList.add("hidden");
    setMutationChoiceOpen(false);
    byId("mutationChoicePanel").classList.add("hidden");
    setDebugOpen(false);
    byId("debugPanel").classList.add("hidden");
    byId("lobbyOverlay").classList.add("hidden");
    setSelectedBuild(null);
    setManualBuildAngle(null);
    generateWorld();
    renderUpgradePanel();
    renderBuildBar();
    byId("overlay").classList.add("hidden");
    setRunning(true);
    setLastTime(performance.now());
    requestAnimationFrame(loop);
  }
  byId("restartBtn").onclick = async () => {
    try {
      byId("overlay").classList.add("hidden");
      byId("startOverlay").style.display = "flex";
      renderMetaPanel();
      renderStartBonuses();
      renderMetaSkins();
      renderModeSelect();
      renderClassSelect();
      renderLeaderboard();
      updateStartBtnLabel();
    } catch (err) {
      showFatalError(err);
    }
  };
  byId("startBtn").onclick = () => {
    try {
      const nameVal = byId("nameInput").value.trim();
      setPlayerName(nameVal || "Survivor");
      const modal = byId("classSelectModal");
      if (modal) {
        renderClassSelect(() => {
          modal.classList.add("hidden");
          byId("startOverlay").style.display = "none";
          if (selectedMode === "team") {
            openLobby();
          } else {
            resetGame();
          }
        });
        modal.classList.remove("hidden");
      } else {
        if (selectedMode === "team") {
          byId("startOverlay").style.display = "none";
          openLobby();
        } else {
          byId("startOverlay").style.display = "none";
          resetGame();
        }
      }
    } catch (err) {
      showFatalError(err);
    }
  };
  byId("shopCloseBtn").onclick = () => {
    try {
      toggleShop();
    } catch (err) {
      showFatalError(err);
    }
  };
  byId("factoryCloseBtn").onclick = () => {
    try {
      toggleFactory();
    } catch (err) {
      showFatalError(err);
    }
  };
  byId("inspectorCloseBtn").onclick = () => {
    try {
      closeStructureInspector();
    } catch (err) {
      showFatalError(err);
    }
  };
  byId("inspectorUpgradeBtn").onclick = () => {
    try {
      upgradeInspectedStructure();
    } catch (err) {
      showFatalError(err);
    }
  };
  lobby.onPlayersChanged = renderLobby;
  lobby.onMatchStart = () => {
    setTimeout(() => {
      byId("lobbyOverlay").classList.add("hidden");
      resetGame();
    }, 600);
  };
  byId("lobbyReadyBtn").onclick = () => {
    try {
      const me = lobby.players.find((p) => p.isLocal);
      lobbySetReady(!me?.ready);
    } catch (err) {
      showFatalError(err);
    }
  };
  byId("lobbyLeaveBtn").onclick = () => {
    try {
      lobbyLeave();
      byId("lobbyOverlay").classList.add("hidden");
      byId("startOverlay").style.display = "flex";
    } catch (err) {
      showFatalError(err);
    }
  };
  byId("startSettingsBtn").onclick = () => {
    try {
      openSettings();
    } catch (err) {
      showFatalError(err);
    }
  };
  byId("hudSettingsBtn").onclick = () => {
    try {
      openSettings();
    } catch (err) {
      showFatalError(err);
    }
  };
  byId("settingsCloseBtn").onclick = () => {
    try {
      closeSettings();
    } catch (err) {
      showFatalError(err);
    }
  };
  byId("settingShakeBtn").onclick = () => {
    settings.screenShake = !settings.screenShake;
    saveSettings();
    renderSettingsUI();
  };
  byId("settingDamageNumBtn").onclick = () => {
    settings.damageNumbers = !settings.damageNumbers;
    saveSettings();
    renderSettingsUI();
  };
  byId("scaleSmallBtn").onclick = () => {
    settings.uiScale = "small";
    saveSettings();
    applyUiScale();
    renderSettingsUI();
  };
  byId("scaleMediumBtn").onclick = () => {
    settings.uiScale = "medium";
    saveSettings();
    applyUiScale();
    renderSettingsUI();
  };
  byId("scaleLargeBtn").onclick = () => {
    settings.uiScale = "large";
    saveSettings();
    applyUiScale();
    renderSettingsUI();
  };
  setupInputListeners(canvas, tryBuildOrUpgrade, selectBuild, renderBuildBar, toggleDebugPanel);
  setupTouchListeners(canvas, tryBuildOrUpgrade, selectBuild, renderBuildBar);
  setupDebugUI();
  initCodexUI();
  loadSettings();
  var helpBtn = byId("helpBtn");
  var hintBox = byId("hint");
  if (helpBtn && hintBox) {
    helpBtn.onclick = (e) => {
      e.stopPropagation();
      hintBox.classList.toggle("hidden");
    };
    window.addEventListener("click", () => {
      hintBox.classList.add("hidden");
    });
    hintBox.onclick = (e) => {
      e.stopPropagation();
    };
  }
  initMenu().catch((err) => showFatalError(err));
})();
