(() => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const waveEl = document.getElementById("wave");
  const weaponEl = document.getElementById("weapon");
  const modsEl = document.getElementById("mods");
  const pickupEl = document.getElementById("pickup");
  const finalScoreEl = document.getElementById("finalScore");
  const resultTitleEl = document.getElementById("resultTitle");
  const scoreRankEl = document.getElementById("scoreRank");
  const healthMeterEl = document.querySelector(".life-meter");
  const healthFillEl = document.getElementById("healthFill");
  const healthTextEl = document.getElementById("healthText");

  const startScreen = document.getElementById("startScreen");
  const pauseScreen = document.getElementById("pauseScreen");
  const endScreen = document.getElementById("endScreen");
  const startBtn = document.getElementById("startBtn");
  const restartBtn = document.getElementById("restartBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const resumeBtn = document.getElementById("resumeBtn");

  const storageKey = "meteor-patrol-best";
  const scoreRankKey = "meteor-patrol-top-scores";
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const keys = new Set();
  const pointer = { active: false, x: 0, y: 0 };
  const maxHealth = 100;
  const lowHealthThreshold = 30;
  const lowHealthResetThreshold = 45;
  const playerDamageScale = 0.5;
  const ammoDuration = 8;
  let bgmShouldPlay = false;
  let bgmNoticeShown = false;
  const bgm = new Audio("resource/background-music.mp3");
  bgm.loop = true;
  bgm.preload = "auto";
  bgm.volume = 0.28;

  const weaponLevels = [
    { name: "1", score: 0, lanes: 2, fireDelay: 0.23, pierce: 0, homing: 0, blast: 0, damage: 1, label: "Twin" },
    { name: "2", score: 8000, lanes: 2, fireDelay: 0.215, pierce: 0, homing: 0, blast: 0, damage: 1.15, label: "Twin+" },
    { name: "3", score: 20000, lanes: 3, fireDelay: 0.2, pierce: 0, homing: 0, blast: 0, damage: 1.3, label: "Triple" },
    { name: "4", score: 40000, lanes: 3, fireDelay: 0.185, pierce: 1, homing: 0, blast: 0, damage: 1.45, label: "Pierce" },
    { name: "5", score: 70000, lanes: 4, fireDelay: 0.17, pierce: 1, homing: 0.45, blast: 0, damage: 1.6, label: "Vector" },
    { name: "6", score: 110000, lanes: 4, fireDelay: 0.155, pierce: 1, homing: 0.7, blast: 0, damage: 1.8, label: "Vector+" },
    { name: "7", score: 170000, lanes: 5, fireDelay: 0.14, pierce: 2, homing: 0.9, blast: 34, damage: 2, label: "Burst" },
    { name: "8", score: 250000, lanes: 5, fireDelay: 0.125, pierce: 2, homing: 1.05, blast: 48, damage: 2.25, label: "Burst+" },
    { name: "9", score: 360000, lanes: 6, fireDelay: 0.11, pierce: 3, homing: 1.2, blast: 62, damage: 2.55, label: "Nova" },
    { name: "10", score: 500000, lanes: 6, fireDelay: 0.098, pierce: 3, homing: 1.35, blast: 78, damage: 3, label: "Nova X" },
  ];
  const moduleTypes = [
    {
      type: "laser",
      name: "直线激光",
      icon: "L",
      color: "#ff5df0",
      description: "贯穿屏幕直线光束",
      apply: (mods) => {
        mods.laser += 1;
        mods.damage += 0.85;
      },
    },
    {
      type: "missile",
      name: "跟踪导弹",
      icon: "M",
      color: "#5df2a5",
      description: "自动锁敌追踪",
      apply: (mods) => {
        mods.missile += 1;
        mods.homing += 0.65;
        mods.blast += 18;
      },
    },
    {
      type: "amp",
      name: "火力增幅",
      icon: "A",
      color: "#ffd36a",
      description: "提升伤害与火力",
      apply: (mods) => {
        mods.damage += 0.8;
        mods.fireRate += 0.08;
      },
    },
    {
      type: "scatter",
      name: "多重散射",
      icon: "S",
      color: "#4be1ff",
      duration: ammoDuration * 0.8,
      description: "增加弹道数量",
      apply: (mods) => {
        mods.lanes += 1;
        mods.spread += 2.5;
      },
    },
  ];
  const healthPackTypes = [
    { name: "小型维修包", heal: 18, icon: "+", color: "#5df2a5", radius: 16, weight: 5 },
    { name: "中型维修包", heal: 30, icon: "+", color: "#ffd36a", radius: 18, weight: 3 },
    { name: "大型维修包", heal: 45, icon: "+", color: "#ff5f7e", radius: 20, weight: 1 },
  ];
  const shipStages = [
    { name: "一阶段", minScore: 0, ammoSlots: 1, image: loadImage("resource/ship-stage-1.png"), drawSize: 86 },
    { name: "二阶段", minScore: 50000, ammoSlots: 2, image: loadImage("resource/ship-stage-2.png"), drawSize: 94 },
    { name: "三阶段", minScore: 500000, ammoSlots: 3, image: loadImage("resource/ship-stage-3.png"), drawSize: 104 },
  ];
  const meteorKinds = {
    normal: { label: "", base: "#72685e", shade: "#b8aa96", glow: "rgba(255, 211, 106, 0.18)" },
    fragment: { label: "", base: "#5f5a55", shade: "#a69a8c", glow: "rgba(255, 211, 106, 0.12)" },
    split: { label: "裂", base: "#7b4b3c", shade: "#ffd36a", glow: "rgba(255, 211, 106, 0.26)" },
    dash: { label: "冲", base: "#7a2630", shade: "#ff6e57", glow: "rgba(255, 63, 95, 0.32)" },
    shield: { label: "盾", base: "#43586f", shade: "#9fb0ff", glow: "rgba(159, 176, 255, 0.26)" },
    jammer: { label: "扰", base: "#51436f", shade: "#ff5df0", glow: "rgba(255, 93, 240, 0.3)" },
  };
  const rhythmPhases = [
    { key: "steady", name: "平稳期", duration: 22, spawnRate: 1, speed: 1, special: 1, reward: 1, dropBonus: 0 },
    { key: "burst", name: "爆发期", duration: 9, spawnRate: 0.55, speed: 1.18, special: 1.55, reward: 1.28, dropBonus: 0.045 },
    { key: "recover", name: "恢复期", duration: 13, spawnRate: 1.28, speed: 0.9, special: 0.72, reward: 1, dropBonus: 0.015 },
  ];

  let width = 0;
  let height = 0;
  let dpr = 1;
  let lastTime = 0;
  let spawnTimer = 0;
  let shotTimer = 0;
  let shake = 0;
  let flash = 0;
  let best = readBestScore();

  const state = {
    mode: "ready",
    score: 0,
    wave: 1,
    health: maxHealth,
    time: 0,
    weaponLevel: 0,
    player: null,
    bullets: [],
    meteors: [],
    powerups: [],
    particles: [],
    stars: [],
    modules: {},
    dropProfile: null,
    dropCooldown: 0,
    healthDropCooldown: 0,
    rhythmIndex: 0,
    rhythmTimer: 0,
    lastPickup: "",
    notice: "",
    noticeColor: "#ffd36a",
    noticeTimer: 0,
    lowHealthWarned: false,
  };

  const audio = {
    ctx: null,
    master: null,
    engineGain: null,
    step: 0,
    unlocked: false,

    ensure() {
      if (!AudioContextClass) return false;
      if (!this.ctx) {
        this.ctx = new AudioContextClass();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.72;
        this.master.connect(this.ctx.destination);

        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.value = 0;
        this.engineGain.connect(this.master);
        this.startEngineDrone();
      }
      return true;
    },

    unlock() {
      if (!this.ensure()) return;
      this.unlocked = true;
      if (this.ctx.state === "suspended") this.ctx.resume();
    },

    setPlaying(playing) {
      if (!this.ensure()) return;
      const now = this.ctx.currentTime;
      this.engineGain.gain.cancelScheduledValues(now);
      this.engineGain.gain.linearRampToValueAtTime(playing ? 0.08 : 0.004, now + 0.32);
      if (playing) this.startMusic();
      else this.stopMusic();
    },

    tone(freq, duration, type = "sine", gain = 0.08, destination = this.master, start = null) {
      if (!this.ensure()) return null;
      const startTime = start ?? this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const amp = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      amp.gain.setValueAtTime(0.0001, startTime);
      amp.gain.exponentialRampToValueAtTime(gain, startTime + 0.012);
      amp.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      osc.connect(amp);
      amp.connect(destination);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.02);
      return osc;
    },

    noise(duration, gain, filterFreq, filterType = "lowpass", start = null) {
      if (!this.ensure()) return;
      const startTime = start ?? this.ctx.currentTime;
      const buffer = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * duration), this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;

      const source = this.ctx.createBufferSource();
      const filter = this.ctx.createBiquadFilter();
      const amp = this.ctx.createGain();
      source.buffer = buffer;
      filter.type = filterType;
      filter.frequency.setValueAtTime(filterFreq, startTime);
      amp.gain.setValueAtTime(gain, startTime);
      amp.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      source.connect(filter);
      filter.connect(amp);
      amp.connect(this.master);
      source.start(startTime);
      source.stop(startTime + duration);
    },

    startEngineDrone() {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const wobble = this.ctx.createOscillator();
      const wobbleGain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.value = 54;
      wobble.type = "sine";
      wobble.frequency.value = 5.4;
      wobbleGain.gain.value = 7;
      wobble.connect(wobbleGain);
      wobbleGain.connect(osc.frequency);
      osc.connect(this.engineGain);
      osc.start(now);
      wobble.start(now);
    },

    startMusic() {
      bgmShouldPlay = true;
      bgm.volume = 0.28;
      bgm
        .play()
        .then(() => {
          bgmNoticeShown = false;
        })
        .catch(() => {
          if (state.mode === "playing" && !bgmNoticeShown) {
            bgmNoticeShown = true;
            showNotice("点一下屏幕开启音乐", "#ffd36a");
          }
        });
    },

    stopMusic() {
      bgmShouldPlay = false;
      bgm.pause();
    },

    resumeMusic() {
      if (!bgmShouldPlay || !bgm.paused) return;
      this.startMusic();
    },

    shoot(level) {
      if (!this.unlocked || !this.ensure()) return;
      const now = this.ctx.currentTime;
      this.tone(520 + level * 34, 0.055, "square", 0.045, this.master, now);
      this.tone(900 + level * 45, 0.045, "triangle", 0.03, this.master, now + 0.018);
    },

    explosion(size = 1) {
      if (!this.unlocked || !this.ensure()) return;
      const now = this.ctx.currentTime;
      this.noise(0.35, 0.14 * size, 520, "lowpass", now);
      const drop = this.tone(170, 0.38, "sawtooth", 0.08 * size, this.master, now);
      if (drop) drop.frequency.exponentialRampToValueAtTime(38, now + 0.36);
    },

    hit() {
      if (!this.unlocked || !this.ensure()) return;
      const now = this.ctx.currentTime;
      this.noise(0.2, 0.11, 700, "bandpass", now);
      const tone = this.tone(160, 0.22, "square", 0.06, this.master, now);
      if (tone) tone.frequency.exponentialRampToValueAtTime(80, now + 0.2);
    },

    upgrade(level) {
      if (!this.unlocked || !this.ensure()) return;
      const now = this.ctx.currentTime;
      [440, 659.25, 880, 1174.66].forEach((freq, index) => {
        this.tone(freq + level * 18, 0.18, "triangle", 0.06, this.master, now + index * 0.08);
      });
      this.noise(0.16, 0.035, 2400, "highpass", now + 0.12);
    },

    pickup() {
      if (!this.unlocked || !this.ensure()) return;
      const now = this.ctx.currentTime;
      [523.25, 783.99, 1046.5].forEach((freq, index) => {
        this.tone(freq, 0.11, "triangle", 0.045, this.master, now + index * 0.045);
      });
    },

    deny() {
      if (!this.unlocked || !this.ensure()) return;
      const now = this.ctx.currentTime;
      this.tone(180, 0.11, "square", 0.04, this.master, now);
      this.tone(135, 0.16, "square", 0.035, this.master, now + 0.08);
    },

    alarm() {
      if (!this.unlocked || !this.ensure()) return;
      const now = this.ctx.currentTime;
      [0, 0.18, 0.36].forEach((offset) => {
        this.tone(880, 0.1, "square", 0.045, this.master, now + offset);
        this.tone(440, 0.12, "sawtooth", 0.032, this.master, now + offset + 0.08);
      });
      this.noise(0.12, 0.035, 1200, "bandpass", now + 0.02);
    },

    gameOver() {
      if (!this.unlocked || !this.ensure()) return;
      const now = this.ctx.currentTime;
      [220, 174.61, 130.81, 98].forEach((freq, index) => {
        this.tone(freq, 0.28, "sawtooth", 0.05, this.master, now + index * 0.12);
      });
    },
  };

  function readBestScore() {
    try {
      return Number(localStorage.getItem(storageKey) || 0);
    } catch {
      return 0;
    }
  }

  function saveBestScore(value) {
    try {
      localStorage.setItem(storageKey, String(value));
    } catch {
      // Some file:// or privacy-restricted contexts block storage.
    }
  }

  function readTopScores() {
    try {
      const parsed = JSON.parse(localStorage.getItem(scoreRankKey) || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed.map((score) => Number(score) || 0).filter((score) => score > 0).sort((a, b) => b - a).slice(0, 5);
    } catch {
      return [];
    }
  }

  function saveTopScores(scores) {
    try {
      localStorage.setItem(scoreRankKey, JSON.stringify(scores.slice(0, 5)));
    } catch {
      // Some file:// or privacy-restricted contexts block storage.
    }
  }

  function recordScore(score) {
    const scores = readTopScores();
    if (score > 0) scores.push(score);
    const ranked = scores.sort((a, b) => b - a).slice(0, 5);
    saveTopScores(ranked);
    return ranked;
  }

  function renderScoreRank(scores) {
    if (!scoreRankEl) return;
    scoreRankEl.innerHTML = "";
    const displayScores = scores.length ? scores : readTopScores();
    for (let i = 0; i < 5; i += 1) {
      const item = document.createElement("li");
      const rank = document.createElement("span");
      const value = document.createElement("strong");
      rank.textContent = `第${i + 1}名`;
      value.textContent = displayScores[i] ? displayScores[i].toString() : "--";
      item.classList.toggle("is-empty", !displayScores[i]);
      item.append(rank, value);
      scoreRankEl.append(item);
    }
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function formatSeconds(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }

  function loadImage(src) {
    const sources = Array.isArray(src) ? [...src] : [src];
    const image = new Image();
    let index = 0;
    image.addEventListener("error", () => {
      if (index >= sources.length - 1) return;
      index += 1;
      image.src = sources[index];
    });
    image.src = sources[index];
    return image;
  }

  function resize() {
    dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!state.player) resetPlayer();
    else {
      state.player.x = clamp(state.player.x, 36, width - 36);
      state.player.y = clamp(state.player.y, 90, height - 56);
    }

    createStars();
  }

  function createStars() {
    const total = Math.floor((width * height) / 7600);
    state.stars = Array.from({ length: total }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: rand(0.7, 2.1),
      speed: rand(16, 78),
      alpha: rand(0.35, 1),
    }));
  }

  function resetPlayer() {
    state.player = {
      x: width / 2,
      y: Math.max(220, height - 96),
      targetX: width / 2,
      targetY: Math.max(220, height - 96),
      radius: 22,
      invulnerable: 0,
    };
  }

  function resetGame() {
    audio.unlock();
    audio.setPlaying(true);
    state.mode = "playing";
    state.score = 0;
    state.wave = 1;
    state.health = maxHealth;
    state.time = 0;
    state.weaponLevel = 0;
    state.bullets = [];
    state.meteors = [];
    state.powerups = [];
    state.particles = [];
    state.modules = {};
    state.dropProfile = createDropProfile();
    state.dropCooldown = 0;
    state.healthDropCooldown = rand(24, 34);
    state.rhythmIndex = 0;
    state.rhythmTimer = 0;
    state.lastPickup = "";
    state.notice = "";
    state.noticeTimer = 0;
    state.lowHealthWarned = false;
    spawnTimer = 0;
    shotTimer = 0;
    shake = 0;
    flash = 0;
    resetPlayer();
    updateHud();
    hideAllOverlays();
    showNotice("警报：注意闪避陨石", "#ffd36a");
    audio.alarm();
  }

  function hideAllOverlays() {
    startScreen.classList.add("is-hidden");
    pauseScreen.classList.add("is-hidden");
    endScreen.classList.add("is-hidden");
  }

  function createDropProfile() {
    const shuffled = [...moduleTypes].sort(() => Math.random() - 0.5);
    const weights = {};
    for (const module of moduleTypes) weights[module.type] = rand(0.78, 1.16);
    shuffled.slice(0, 2).forEach((module, index) => {
      weights[module.type] += rand(0.72, 1.18) - index * 0.12;
    });
    shuffled.slice(2, 4).forEach((module) => {
      weights[module.type] += rand(0.24, 0.56);
    });
    return { weights };
  }

  function getWeaponMods(weapon) {
    const stats = getCurrentWeaponStats();
    const stage = getShipStage();
    const rhythm = getRhythmPhase();
    const mods = [rhythm.name, `${stage.name}`, `${stage.ammoSlots}槽`, `${weapon.label}`, `${stats.lanes} shots`, `${Math.round(1 / stats.fireDelay)}/秒`];
    if (stats.pierce > 0) mods.push(`穿透${stats.pierce}`);
    if (stats.homing > 0) mods.push("追踪");
    if (stats.blast > 0) mods.push("范围爆炸");
    if (stats.laser > 0) mods.push(`激光${stats.laser}`);
    if (stats.missile > 0) mods.push(`导弹${stats.missile}`);
    const interference = getInterference();
    if (interference.count > 0) mods.push(`干扰x${interference.count}`);
    return mods.join(" · ");
  }

  function createEmptyModuleStats() {
    return {
      lanes: 0,
      fireRate: 0,
      pierce: 0,
      homing: 0,
      blast: 0,
      damage: 0,
      spread: 0,
      laser: 0,
      missile: 0,
    };
  }

  function getModuleStats() {
    const mods = createEmptyModuleStats();
    for (const [type, moduleState] of Object.entries(state.modules)) {
      if (!moduleState || moduleState.timeLeft <= 0) continue;
      const module = moduleTypes.find((item) => item.type === type);
      if (!module) continue;
      module.apply(mods);
    }
    return mods;
  }

  function getShipStage() {
    let stage = shipStages[0];
    for (const item of shipStages) {
      if (state.score >= item.minScore) stage = item;
    }
    return stage;
  }

  function getCurrentWeaponStats() {
    const base = weaponLevels[state.weaponLevel];
    const mods = getModuleStats();
    return {
      name: base.name,
      label: base.label,
      lanes: clamp(base.lanes + mods.lanes, 1, 10),
      fireDelay: clamp(base.fireDelay * (1 - mods.fireRate), 0.045, 0.32),
      pierce: Math.max(0, base.pierce + mods.pierce),
      homing: base.homing + mods.homing,
      blast: base.blast + mods.blast,
      damage: (base.damage + mods.damage) * playerDamageScale,
      spread: 12 + base.lanes * 4 + mods.spread,
      laser: mods.laser,
      missile: mods.missile,
    };
  }

  function getModuleSummary() {
    const entries = Object.entries(state.modules)
      .filter(([, moduleState]) => moduleState?.timeLeft > 0)
      .map(([type, moduleState]) => {
        const module = moduleTypes.find((item) => item.type === type);
        return `${module?.icon || "?"}${Math.ceil(moduleState.timeLeft)}s`;
      });
    return entries.length ? entries.join(" ") : "";
  }

  function updateHud() {
    const weapon = weaponLevels[state.weaponLevel];
    const healthRatio = clamp(state.health / maxHealth, 0, 1);
    scoreEl.textContent = state.score.toString();
    bestEl.textContent = best.toString();
    waveEl.textContent = state.wave.toString();
    if (weaponEl) weaponEl.textContent = weapon.name;
    if (modsEl) {
      const summary = getModuleSummary();
      modsEl.textContent = `${getWeaponMods(weapon)}${summary ? ` · ${summary}` : ""}`;
    }
    if (pickupEl) pickupEl.textContent = state.lastPickup || "无";
    if (healthFillEl) healthFillEl.style.width = `${Math.round(healthRatio * 100)}%`;
    if (healthTextEl) healthTextEl.textContent = `${Math.ceil(state.health)}/${maxHealth}`;
    if (healthMeterEl) {
      healthMeterEl.classList.toggle("is-low", healthRatio <= 0.32);
      healthMeterEl.classList.toggle("is-critical", healthRatio <= 0.16);
    }
  }

  function getTargetForBullet(bullet) {
    let target = null;
    let bestDistance = Infinity;
    for (const meteor of state.meteors) {
      if (meteor.dead || meteor.y < -60) continue;
      const distance = Math.hypot(meteor.x - bullet.x, meteor.y - bullet.y);
      const priority = meteor.kind === "jammer" ? 0.55 : meteor.kind === "shield" ? 0.72 : meteor.kind === "dash" ? 0.84 : 1;
      const weightedDistance = distance * priority;
      if (weightedDistance < bestDistance) {
        bestDistance = weightedDistance;
        target = meteor;
      }
    }
    return target;
  }

  function checkWeaponUpgrade() {
    const previousLevel = state.weaponLevel;
    for (let i = 0; i < weaponLevels.length; i += 1) {
      if (state.score >= weaponLevels[i].score) state.weaponLevel = i;
    }
    const upgraded = state.weaponLevel > previousLevel;

    if (!upgraded) return;
    audio.upgrade(state.weaponLevel);
    addParticles(state.player.x, state.player.y, 34, "#5df2a5", 320);
    addParticles(state.player.x, state.player.y - 22, 22, "#4be1ff", 260);
    flash = Math.max(flash, 0.28);
    shake = Math.max(shake, 8);
  }

  function maybeDropPowerup(meteor) {
    if (meteor.fragment && Math.random() > 0.22) return;
    if (maybeDropHealthPack(meteor)) return;
    if (state.dropCooldown > 0 || state.powerups.length >= 2) return;
    const interference = getInterference();
    const rhythm = getRhythmPhase();
    const dropChance = clamp(0.12 + state.wave * 0.008 + Math.min(0.05, meteor.radius / 760) + rhythm.dropBonus - interference.dropPenalty, 0.055, 0.32);
    if (Math.random() > dropChance) return;
    const module = choosePowerupModule();
    state.powerups.push({
      ...module,
      kind: "ammo",
      duration: module.duration || ammoDuration,
      x: meteor.x,
      y: meteor.y,
      vx: rand(-28, 28),
      vy: rand(48, 86),
      radius: 17,
      spin: rand(-3, 3),
      angle: rand(0, Math.PI * 2),
      life: 9.5,
      pulse: rand(0, Math.PI * 2),
    });
    state.dropCooldown = rand(5.4, 7.8);
  }

  function maybeDropHealthPack(meteor) {
    if (state.health >= maxHealth || state.healthDropCooldown > 0 || state.powerups.length >= 2) return false;
    const dropChance = clamp(0.018 + state.wave * 0.002 + (meteor.radius > 34 ? 0.012 : 0), 0.018, 0.055);
    if (Math.random() > dropChance) return false;
    const pack = chooseHealthPack();
    state.powerups.push({
      ...pack,
      kind: "health",
      type: "health",
      description: `恢复${pack.heal}点血量`,
      x: meteor.x,
      y: meteor.y,
      vx: rand(-22, 22),
      vy: rand(38, 72),
      spin: rand(-2.2, 2.2),
      angle: rand(0, Math.PI * 2),
      life: 11,
      pulse: rand(0, Math.PI * 2),
    });
    state.healthDropCooldown = rand(30, 44);
    return true;
  }

  function chooseHealthPack() {
    const weighted = [];
    for (const pack of healthPackTypes) {
      for (let i = 0; i < pack.weight; i += 1) weighted.push(pack);
    }
    return weighted[Math.floor(Math.random() * weighted.length)] || healthPackTypes[0];
  }

  function choosePowerupModule() {
    const weighted = [];
    for (const module of moduleTypes) {
      let weight = state.dropProfile?.weights?.[module.type] ?? 1;
      const active = (state.modules[module.type]?.timeLeft || 0) > 0;
      if (!active) weight += 0.35;
      else weight *= 0.82;
      if (module.type === "laser" || module.type === "missile") weight += state.wave > 2 ? 0.28 : -0.18;
      if (module.type === "scatter" && state.wave <= 2) weight += 0.12;
      for (let i = 0; i < Math.max(1, Math.round(clamp(weight, 0.12, 3.2) * 10)); i += 1) weighted.push(module);
    }
    return weighted[Math.floor(Math.random() * weighted.length)] || moduleTypes[0];
  }

  function collectPowerup(powerup) {
    if (powerup.kind === "health") {
      if (state.health >= maxHealth) {
        showNotice("血量已满", "#ff5f7e");
        audio.deny();
        powerup.blockedTimer = 0.8;
        powerup.vy = Math.min(powerup.vy, -96);
        return;
      }
      powerup.dead = true;
      const heal = powerup.heal || 18;
      const actualHeal = Math.ceil(Math.min(heal, maxHealth - state.health));
      state.health = Math.min(maxHealth, state.health + heal);
      if (state.health >= lowHealthResetThreshold) state.lowHealthWarned = false;
      state.lastPickup = `${powerup.name} +${actualHeal}`;
      showNotice(`血量恢复 +${actualHeal}`, powerup.color);
      audio.pickup();
      addParticles(powerup.x, powerup.y, 18 + Math.floor(heal * 0.35), powerup.color, 240);
      addRing(powerup.x, powerup.y, 34 + heal * 0.42, `${powerup.color}88`);
      flash = Math.max(flash, 0.18);
      updateHud();
      return;
    }

    const ammoSlots = getShipStage().ammoSlots;
    const knownTypes = Object.keys(state.modules).filter((type) => state.modules[type]?.timeLeft > 0);
    if (!state.modules[powerup.type]?.timeLeft && knownTypes.length >= ammoSlots) {
      showNotice(`弹药槽已满，当前可携带${ammoSlots}种`, "#ffd36a");
      audio.deny();
      powerup.blockedTimer = 0.8;
      powerup.vy = Math.min(powerup.vy, -120);
      powerup.life = Math.max(powerup.life, 2.2);
      return;
    }

    powerup.dead = true;
    const duration = powerup.duration || ammoDuration;
    state.modules[powerup.type] = { timeLeft: Math.max(duration, state.modules[powerup.type]?.timeLeft || 0) };
    state.lastPickup = `${powerup.name} ${formatSeconds(duration)}s`;
    showNotice(state.lastPickup, powerup.color);
    audio.pickup();
    addParticles(powerup.x, powerup.y, 22, powerup.color, 260);
    addRing(powerup.x, powerup.y, 42, `${powerup.color}88`);
    flash = Math.max(flash, 0.18);
    updateHud();
  }

  function showNotice(text, color = "#ffd36a") {
    state.notice = text;
    state.noticeColor = color;
    state.noticeTimer = 1.8;
  }

  function updateAmmoTimers(dt) {
    for (const [type, moduleState] of Object.entries(state.modules)) {
      moduleState.timeLeft -= dt;
      if (moduleState.timeLeft <= 0) delete state.modules[type];
    }
  }

  function getRhythmPhase() {
    return rhythmPhases[state.rhythmIndex] || rhythmPhases[0];
  }

  function updateRhythm(dt) {
    state.rhythmTimer += dt;
    const phase = getRhythmPhase();
    if (state.rhythmTimer < phase.duration) return;
    state.rhythmTimer = 0;
    state.rhythmIndex = (state.rhythmIndex + 1) % rhythmPhases.length;
    const nextPhase = getRhythmPhase();
    if (nextPhase.key === "burst") showNotice("爆发期：压力与奖励提升", "#ff6e57");
    else if (nextPhase.key === "recover") showNotice("恢复期：喘息调整", "#5df2a5");
    else showNotice("平稳期：保持节奏", "#4be1ff");
    updateHud();
  }

  function getInterference() {
    const jammerCount = state.meteors.filter((meteor) => !meteor.dead && meteor.kind === "jammer").length;
    return {
      count: jammerCount,
      fireDelayPenalty: clamp(jammerCount * 0.14, 0, 0.38),
      meteorSpeedBonus: clamp(jammerCount * 0.1, 0, 0.28),
      dropPenalty: clamp(jammerCount * 0.055, 0, 0.18),
    };
  }

  function chooseMeteorKind() {
    const wave = state.wave;
    const rhythm = getRhythmPhase();
    const activeJammers = state.meteors.filter((meteor) => !meteor.dead && meteor.kind === "jammer").length;
    const choices = [{ kind: "normal", weight: 1.25 }];
    if (wave >= 2) choices.push({ kind: "split", weight: clamp(0.16 + wave * 0.012, 0.16, 0.34) * rhythm.special });
    if (wave >= 3) choices.push({ kind: "dash", weight: clamp(0.12 + wave * 0.01, 0.12, 0.28) * rhythm.special });
    if (wave >= 4) choices.push({ kind: "shield", weight: clamp(0.11 + wave * 0.009, 0.11, 0.24) * rhythm.special });
    if (wave >= 5 && activeJammers < 2) choices.push({ kind: "jammer", weight: clamp(0.08 + wave * 0.007, 0.08, 0.18) * rhythm.special });

    const totalWeight = choices.reduce((sum, choice) => sum + choice.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const choice of choices) {
      roll -= choice.weight;
      if (roll <= 0) return choice.kind;
    }
    return "normal";
  }

  function spawnMeteor() {
    const waveLift = state.wave * 0.7;
    const radius = rand(18, Math.min(48, 28 + state.wave * 3));
    const kind = chooseMeteorKind();
    state.meteors.push(createMeteor({ radius, kind, waveLift }));
  }

  function createMeteor({ x = null, y = null, radius, kind = "normal", waveLift = state.wave * 0.7, vx = null, vy = null, fragment = false }) {
    const sides = Math.floor(rand(8, 13));
    const scoreTier = Math.max(0, state.score / 50000);
    const hpMultiplier = 1 + Math.min(3.2, scoreTier * 0.18);
    const defense = fragment ? 0 : clamp(scoreTier * 0.035, 0, 0.42);
    const baseHp = Math.ceil((radius / 18) * hpMultiplier);
    const meteor = {
      kind,
      fragment,
      x: x ?? rand(radius, width - radius),
      y: y ?? -radius - 24,
      vx: vx ?? rand(-34 - waveLift * 3, 34 + waveLift * 3),
      vy: vy ?? rand(74 + waveLift * 10, 132 + waveLift * 16),
      radius,
      hp: baseHp,
      maxHp: baseHp,
      defense,
      angle: rand(0, Math.PI * 2),
      spin: rand(-2.8, 2.8),
      crags: Array.from({ length: sides }, () => rand(0.72, 1.22)),
      hot: kind === "dash" || Math.random() > 0.72,
      dashArmed: kind === "dash",
      dashTime: 0,
      shield: 0,
      maxShield: 0,
      shieldCooldown: 0,
      pulse: rand(0, Math.PI * 2),
    };

    if (kind === "split") {
      meteor.hp += 1;
      meteor.maxHp += 1;
      meteor.spin *= 1.25;
    }
    if (kind === "dash") {
      meteor.vy *= 0.9;
      meteor.spin *= 1.45;
    }
    if (kind === "shield") {
      meteor.hp += 1;
      meteor.maxHp += 1;
      meteor.maxShield = Math.max(2, Math.ceil(radius / 17));
      meteor.shield = meteor.maxShield;
    }
    if (kind === "jammer") {
      meteor.hp += 1;
      meteor.maxHp += 1;
      meteor.vy *= 0.86;
      meteor.radius *= 1.04;
    }

    return meteor;
  }

  function shoot() {
    if (state.mode !== "playing") return;
    const p = state.player;
    const weapon = getCurrentWeaponStats();
    const spread = Math.min(48, weapon.spread);
    const center = (weapon.lanes - 1) / 2;
    const hasLaser = (state.modules.laser?.timeLeft || 0) > 0;

    for (let i = 0; i < weapon.lanes; i += 1) {
      const offset = (i - center) * spread;
      const angle = (i - center) * 0.055;
      state.bullets.push({
        kind: "bullet",
        x: p.x + offset,
        y: p.y - 22 - Math.abs(i - center) * 2,
        vx: Math.sin(angle) * 120,
        vy: -690 - state.weaponLevel * 24,
        radius: 4 + Math.min(2, state.weaponLevel * 0.3),
        life: 1.18 + state.weaponLevel * 0.08,
        damage: weapon.damage,
        pierceLeft: weapon.pierce,
        homing: weapon.homing,
        blast: weapon.blast,
        trailColor: weapon.blast > 0 ? "#ffd36a" : weapon.homing > 0 ? "#5df2a5" : "#4be1ff",
      });
    }

    if (hasLaser) {
      state.bullets.push({
        kind: "laserBeam",
        x: p.x,
        y: p.y - 28,
        vx: 0,
        vy: -1600,
        radius: 8,
        life: 0.16,
        damage: weapon.damage + 0.8,
        pierceLeft: 999,
        homing: 0,
        blast: weapon.blast,
        trailColor: "#ff5df0",
        beamWidth: 11 + Math.min(8, weapon.damage * 1.2),
      });
    }

    for (let i = 0; i < weapon.missile; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      state.bullets.push({
        kind: "missile",
        x: p.x + side * (22 + (i % 3) * 8),
        y: p.y + 4,
        vx: side * rand(30, 95),
        vy: -440 - Math.min(260, weapon.missile * 28),
        radius: 7,
        life: 1.8,
        damage: weapon.damage + 0.35,
        pierceLeft: Math.max(0, Math.floor(weapon.pierce / 2)),
        homing: Math.max(1.35, weapon.homing + 0.9),
        blast: Math.max(42, weapon.blast + 22),
        trailColor: "#5df2a5",
      });
    }

    audio.shoot(state.weaponLevel);
    addParticles(p.x, p.y - 24, 4 + weapon.lanes + weapon.missile, weapon.homing > 0 ? "#5df2a5" : "#4be1ff", 110);
    updateHud();
  }

  function addParticles(x, y, count, color, speed = 150) {
    for (let i = 0; i < count; i += 1) {
      const angle = rand(0, Math.PI * 2);
      const velocity = rand(speed * 0.28, speed);
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        radius: rand(1.2, 4),
        life: rand(0.24, 0.72),
        maxLife: 0.72,
        color,
      });
    }
  }

  function addRing(x, y, radius, color) {
    state.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      radius,
      life: 0.26,
      maxLife: 0.26,
      color,
      ring: true,
    });
  }

  function explodeMeteor(meteor) {
    const color = meteor.hot ? "#ff6e57" : "#ffd36a";
    addParticles(meteor.x, meteor.y, Math.floor(meteor.radius * 1.2), color, 260);
    if (meteor.blastRing) addRing(meteor.x, meteor.y, meteor.blastRing, "rgba(255, 211, 106, 0.44)");
    audio.explosion(clamp(meteor.radius / 36, 0.7, 1.45));
    shake = Math.min(12, shake + meteor.radius * 0.08);
    flash = 0.16;
  }

  function destroyMeteor(meteor, scoreScale = 1) {
    if (meteor.dead) return;
    meteor.dead = true;
    const rhythm = getRhythmPhase();
    state.score += Math.round((80 + meteor.radius * 6) * scoreScale * rhythm.reward);
    maybeDropPowerup(meteor);
    explodeMeteor(meteor);
    if (meteor.kind === "split" && !meteor.fragment && meteor.radius > 24) spawnSplitChildren(meteor);
    state.wave = 1 + Math.floor(state.score / 1200);
    checkWeaponUpgrade();
    updateHud();
  }

  function damageMeteor(meteor, damage, impactX, impactY, color, blastRadius = 0, scoreScale = 1) {
    const effectiveDamage = Math.max(0.08, damage * (1 - (meteor.defense || 0)));
    if (meteor.shield > 0) {
      meteor.shield = Math.max(0, meteor.shield - effectiveDamage);
      meteor.shieldCooldown = 1.25;
      addParticles(impactX, impactY, 7, "#9fb0ff", 150);
      if (meteor.shield <= 0) {
        addRing(meteor.x, meteor.y, meteor.radius * 1.36, "rgba(159, 176, 255, 0.55)");
        shake = Math.max(shake, 5);
      }
      return false;
    }

    meteor.hp -= effectiveDamage;
    addParticles(impactX, impactY, 5, color || "#4be1ff", 140);
    if (meteor.hp <= 0) {
      meteor.blastRing = blastRadius;
      destroyMeteor(meteor, scoreScale);
      return true;
    }
    return false;
  }

  function spawnSplitChildren(meteor) {
    const count = Math.floor(rand(2, 5));
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2 + rand(-0.35, 0.35);
      const childRadius = clamp(meteor.radius * rand(0.38, 0.52), 12, 22);
      state.meteors.push(
        createMeteor({
          kind: "fragment",
          fragment: true,
          radius: childRadius,
          x: clamp(meteor.x + Math.cos(angle) * meteor.radius * 0.36, childRadius, width - childRadius),
          y: meteor.y + Math.sin(angle) * meteor.radius * 0.24,
          vx: Math.cos(angle) * rand(85, 155),
          vy: rand(120, 210),
          waveLift: state.wave * 0.5,
        }),
      );
    }
    addRing(meteor.x, meteor.y, meteor.radius * 1.2, "rgba(255, 211, 106, 0.38)");
  }

  function applyBlast(sourceMeteor, radius, baseDamage) {
    if (!radius) return;
    for (const meteor of state.meteors) {
      if (meteor.dead || meteor === sourceMeteor) continue;
      const distance = Math.hypot(meteor.x - sourceMeteor.x, meteor.y - sourceMeteor.y);
      if (distance <= radius + meteor.radius * 0.45) {
        damageMeteor(meteor, baseDamage, meteor.x, meteor.y, "#ffd36a", 0, 0.72);
      }
    }
  }

  function damagePlayer(amount, x, y) {
    state.health = Math.max(0, state.health - amount);
    audio.hit();
    addParticles(x, y, 10 + Math.floor(amount * 0.3), "#ff3f5f", 180);
    shake = Math.max(shake, amount >= 28 ? 16 : 8);
    flash = Math.max(flash, amount >= 28 ? 0.24 : 0.16);
    if (state.health > 0 && state.health <= lowHealthThreshold && !state.lowHealthWarned) {
      state.lowHealthWarned = true;
      showNotice("低血量警报：立即闪避", "#ff3f5f");
      audio.alarm();
      shake = Math.max(shake, 14);
      flash = Math.max(flash, 0.3);
    }
    updateHud();
    if (state.health <= 0) endGame();
  }

  function hitPlayer(meteor) {
    if (state.player.invulnerable > 0) return;
    const damage = Math.round(clamp(20 + meteor.radius * 0.42 + state.wave * 0.55, 20, 42));
    state.player.invulnerable = 1.25;
    explodeMeteor(meteor);
    state.meteors = state.meteors.filter((item) => item !== meteor);
    damagePlayer(damage, state.player.x, state.player.y);
  }

  function endGame() {
    state.mode = "ended";
    audio.gameOver();
    audio.setPlaying(false);
    best = Math.max(best, state.score);
    saveBestScore(best);
    const rankedScores = recordScore(state.score);
    finalScoreEl.textContent = state.score.toString();
    resultTitleEl.textContent = state.score >= best && state.score > 0 ? "新的最高分" : "任务结束";
    renderScoreRank(rankedScores);
    endScreen.classList.remove("is-hidden");
    updateHud();
  }

  function setPaused(paused) {
    if (paused && state.mode === "playing") {
      state.mode = "paused";
      audio.setPlaying(false);
      pauseScreen.classList.remove("is-hidden");
      pauseBtn.setAttribute("aria-label", "继续");
      pauseBtn.setAttribute("title", "继续");
      pauseBtn.querySelector("span").textContent = "▶";
      return;
    }

    if (!paused && state.mode === "paused") {
      state.mode = "playing";
      audio.unlock();
      audio.setPlaying(true);
      pauseScreen.classList.add("is-hidden");
      pauseBtn.setAttribute("aria-label", "暂停");
      pauseBtn.setAttribute("title", "暂停");
      pauseBtn.querySelector("span").textContent = "Ⅱ";
      lastTime = performance.now();
    }
  }

  function updatePlayer(dt) {
    const p = state.player;
    const speed = 420;
    let moveX = 0;
    let moveY = 0;

    if (keys.has("ArrowLeft") || keys.has("KeyA")) moveX -= 1;
    if (keys.has("ArrowRight") || keys.has("KeyD")) moveX += 1;
    if (keys.has("ArrowUp") || keys.has("KeyW")) moveY -= 1;
    if (keys.has("ArrowDown") || keys.has("KeyS")) moveY += 1;

    if (moveX || moveY) {
      const length = Math.hypot(moveX, moveY) || 1;
      p.x += (moveX / length) * speed * dt;
      p.y += (moveY / length) * speed * dt;
      p.targetX = p.x;
      p.targetY = p.y;
    } else if (pointer.active) {
      p.targetX = pointer.x;
      p.targetY = pointer.y;
      p.x += (p.targetX - p.x) * clamp(dt * 12, 0, 1);
      p.y += (p.targetY - p.y) * clamp(dt * 12, 0, 1);
    }

    p.x = clamp(p.x, 34, width - 34);
    p.y = clamp(p.y, 92, height - 42);
    p.invulnerable = Math.max(0, p.invulnerable - dt);
  }

  function updateBullets(dt) {
    for (const bullet of state.bullets) {
      if (bullet.homing > 0) {
        const target = getTargetForBullet(bullet);
        if (target) {
          const desiredX = clamp((target.x - bullet.x) * bullet.homing, -220, 220);
          bullet.vx += (desiredX - bullet.vx) * clamp(dt * 7, 0, 1);
        }
      }
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
    }
    state.bullets = state.bullets.filter((bullet) => bullet.life > 0 && bullet.y > -30 && bullet.x > -50 && bullet.x < width + 50);
  }

  function updateMeteors(dt) {
    const interference = getInterference();
    const rhythm = getRhythmPhase();
    const spawnRate = Math.max(0.24, (0.92 - state.wave * 0.055 - interference.meteorSpeedBonus * 0.12) * rhythm.spawnRate);
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnMeteor();
      if (state.wave > 3 && Math.random() > 0.62) spawnMeteor();
      if (rhythm.key === "burst" && Math.random() > 0.38) spawnMeteor();
      spawnTimer = spawnRate * rand(0.72, 1.16);
    }

    for (const meteor of state.meteors) {
      meteor.pulse += dt * 4;
      meteor.shieldCooldown = Math.max(0, (meteor.shieldCooldown || 0) - dt);
      if (meteor.kind === "shield" && meteor.shield > 0 && meteor.shield < meteor.maxShield && meteor.shieldCooldown <= 0) {
        meteor.shield = Math.min(meteor.maxShield, meteor.shield + dt * 0.9);
      }
      if (meteor.kind === "dash" && meteor.dashArmed && state.player && meteor.y > height * 0.42) {
        meteor.dashArmed = false;
        meteor.dashTime = 1.15;
        const targetX = state.player.x + rand(-18, 18);
        meteor.vx = clamp((targetX - meteor.x) * 2.2, -330, 330);
        meteor.vy = Math.max(meteor.vy * 2.7, 430 + state.wave * 18);
        meteor.spin *= 1.8;
        addRing(meteor.x, meteor.y, meteor.radius * 1.5, "rgba(255, 63, 95, 0.42)");
      }
      meteor.dashTime = Math.max(0, (meteor.dashTime || 0) - dt);
      const speedMultiplier = rhythm.speed + interference.meteorSpeedBonus + (meteor.dashTime > 0 ? 0.2 : 0);
      meteor.x += meteor.vx * dt * speedMultiplier;
      meteor.y += meteor.vy * dt * speedMultiplier;
      meteor.angle += meteor.spin * dt;
      if (meteor.x < meteor.radius || meteor.x > width - meteor.radius) {
        meteor.vx *= -1;
        meteor.x = clamp(meteor.x, meteor.radius, width - meteor.radius);
      }
      if (meteor.y - meteor.radius > height) {
        meteor.dead = true;
        const damage = Math.round(clamp(12 + meteor.radius * 0.24 + state.wave * 0.28, 12, 30));
        damagePlayer(damage, meteor.x, height - 18);
      }
    }

    state.meteors = state.meteors.filter((meteor) => !meteor.dead);
  }

  function updatePowerups(dt) {
    const p = state.player;
    for (const powerup of state.powerups) {
      powerup.x += powerup.vx * dt;
      powerup.y += powerup.vy * dt;
      powerup.vx *= 1 - dt * 0.35;
      powerup.vy += 18 * dt;
      powerup.angle += powerup.spin * dt;
      powerup.life -= dt;
      powerup.pulse += dt * 6;
      powerup.blockedTimer = Math.max(0, (powerup.blockedTimer || 0) - dt);

      if (powerup.x < powerup.radius || powerup.x > width - powerup.radius) {
        powerup.vx *= -0.8;
        powerup.x = clamp(powerup.x, powerup.radius, width - powerup.radius);
      }

      const pickupDistance = Math.hypot(powerup.x - p.x, powerup.y - p.y);
      if (pickupDistance < 138) {
        const pull = clamp((138 - pickupDistance) / 138, 0, 1);
        powerup.vx += (p.x - powerup.x) * (2.4 + pull * 5.6) * dt;
        powerup.vy += (p.y - powerup.y) * (2.2 + pull * 5.2) * dt;
      }
      if (pickupDistance < powerup.radius + p.radius + 8 && !powerup.blockedTimer) {
        collectPowerup(powerup);
      }

      if (powerup.y > height + 40 || powerup.life <= 0) powerup.dead = true;
    }

    state.powerups = state.powerups.filter((powerup) => !powerup.dead);
  }

  function updateParticles(dt) {
    for (const particle of state.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 1 - dt * 1.8;
      particle.vy *= 1 - dt * 1.8;
      particle.life -= dt;
    }
    state.particles = state.particles.filter((particle) => particle.life > 0);
  }

  function updateStars(dt) {
    for (const star of state.stars) {
      star.y += star.speed * dt * (state.mode === "playing" ? 1 : 0.18);
      if (star.y > height + 4) {
        star.x = Math.random() * width;
        star.y = -4;
      }
    }
  }

  function checkCollisions() {
    for (const bullet of state.bullets) {
      for (const meteor of state.meteors) {
        if (bullet.dead || meteor.dead) continue;
        if (bullet.kind === "laserBeam") {
          const beamWidth = bullet.beamWidth || bullet.radius || 8;
          const inBeam = Math.abs(meteor.x - bullet.x) < beamWidth + meteor.radius * 0.56 && meteor.y < bullet.y + meteor.radius;
          if (!inBeam) continue;
          const destroyed = damageMeteor(meteor, bullet.damage || 1, meteor.x, meteor.y, bullet.trailColor || "#ff5df0", bullet.blast);
          if (destroyed) applyBlast(meteor, bullet.blast, bullet.damage || 1);
          continue;
        }
        const distance = Math.hypot(bullet.x - meteor.x, bullet.y - meteor.y);
        if (distance < bullet.radius + meteor.radius * 0.86) {
          bullet.pierceLeft -= 1;
          if (bullet.pierceLeft < 0) bullet.dead = true;
          const destroyed = damageMeteor(meteor, bullet.damage || 1, bullet.x, bullet.y, bullet.trailColor || "#4be1ff", bullet.blast);
          if (destroyed) applyBlast(meteor, bullet.blast, bullet.damage || 1);
        }
      }
    }

    state.bullets = state.bullets.filter((bullet) => !bullet.dead);
    state.meteors = state.meteors.filter((meteor) => !meteor.dead);

    const p = state.player;
    for (const meteor of state.meteors) {
      const distance = Math.hypot(p.x - meteor.x, p.y - meteor.y);
      if (distance < p.radius + meteor.radius * 0.74) {
        hitPlayer(meteor);
        break;
      }
    }
  }

  function update(dt) {
    state.time += dt;
    updateStars(dt);
    if (state.mode !== "playing") return;

    state.dropCooldown = Math.max(0, state.dropCooldown - dt);
    state.healthDropCooldown = Math.max(0, state.healthDropCooldown - dt);
    state.noticeTimer = Math.max(0, state.noticeTimer - dt);
    updateRhythm(dt);
    updateAmmoTimers(dt);
    shotTimer -= dt;
    if (shotTimer <= 0) {
      const weapon = getCurrentWeaponStats();
      const interference = getInterference();
      shoot();
      shotTimer = Math.max(0.07, weapon.fireDelay - state.wave * 0.004) * (1 + interference.fireDelayPenalty);
    }

    updatePlayer(dt);
    updateBullets(dt);
    updateMeteors(dt);
    updatePowerups(dt);
    updateParticles(dt);
    checkCollisions();
    shake = Math.max(0, shake - dt * 24);
    flash = Math.max(0, flash - dt);
  }

  function drawStars() {
    ctx.save();
    for (const star of state.stars) {
      ctx.globalAlpha = star.alpha;
      ctx.fillStyle = "#f8fbff";
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPlayer() {
    const p = state.player;
    const blink = p.invulnerable > 0 && Math.floor(state.time * 18) % 2 === 0;
    if (blink) return;

    ctx.save();
    ctx.translate(p.x, p.y);
    const engine = 14 + Math.sin(state.time * 32) * 4;
    const wingTilt = clamp((p.targetX - p.x) / 90, -0.18, 0.18);
    const stage = getShipStage();
    const image = stage.image;

    ctx.fillStyle = "rgba(75, 225, 255, 0.22)";
    ctx.beginPath();
    ctx.ellipse(0, 12, 28, 34, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(wingTilt);
    if (image.complete && image.naturalWidth) {
      const drawSize = stage.drawSize;
      ctx.drawImage(image, -drawSize / 2, -drawSize * 0.62, drawSize, drawSize);
    } else {
      ctx.fillStyle = "#dff8ff";
      ctx.strokeStyle = "rgba(75, 225, 255, 0.95)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -34);
      ctx.lineTo(19, 20);
      ctx.lineTo(8, 14);
      ctx.lineTo(0, 30);
      ctx.lineTo(-8, 14);
      ctx.lineTo(-19, 20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#0e1b21";
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(7, 4);
      ctx.lineTo(0, 12);
      ctx.lineTo(-7, 4);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = "#ff6e57";
    ctx.beginPath();
    ctx.moveTo(-8, 22);
    ctx.lineTo(0, 22 + engine);
    ctx.lineTo(8, 22);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawBullets() {
    ctx.save();
    for (const bullet of state.bullets) {
      ctx.save();
      const tilt = Math.atan2(bullet.vx || 0, -bullet.vy || 1);
      ctx.translate(bullet.x, bullet.y);
      ctx.rotate(tilt);
      if (bullet.kind === "laserBeam") {
        ctx.rotate(-tilt);
        const alpha = clamp(bullet.life / 0.16, 0, 1);
        const beamWidth = bullet.beamWidth || 12;
        const gradient = ctx.createLinearGradient(-beamWidth, 0, beamWidth, 0);
        gradient.addColorStop(0, "rgba(255, 93, 240, 0)");
        gradient.addColorStop(0.35, `rgba(255, 93, 240, ${0.42 * alpha})`);
        gradient.addColorStop(0.5, `rgba(247, 251, 255, ${0.92 * alpha})`);
        gradient.addColorStop(0.65, `rgba(255, 93, 240, ${0.42 * alpha})`);
        gradient.addColorStop(1, "rgba(255, 93, 240, 0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(-beamWidth, -height, beamWidth * 2, height);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.72 * alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -height);
        ctx.stroke();
      } else if (bullet.kind === "missile") {
        ctx.fillStyle = "#dff8ff";
        ctx.strokeStyle = "rgba(93, 242, 165, 0.85)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(7, 8);
        ctx.lineTo(0, 14);
        ctx.lineTo(-7, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#5df2a5";
        ctx.beginPath();
        ctx.moveTo(-5, 12);
        ctx.lineTo(0, 22);
        ctx.lineTo(5, 12);
        ctx.closePath();
        ctx.fill();
      } else {
        const gradient = ctx.createLinearGradient(0, 24, 0, -24);
        gradient.addColorStop(0, "rgba(75, 225, 255, 0)");
        gradient.addColorStop(0.42, bullet.trailColor || "rgba(75, 225, 255, 0.78)");
        gradient.addColorStop(1, "#f7fbff");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        roundedRect(ctx, -3, -22, 6, 28, 3);
        ctx.fill();
      }
      if (bullet.homing > 0) {
        ctx.strokeStyle = "rgba(93, 242, 165, 0.58)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, -2, 8, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawNotice() {
    if (!state.notice || state.noticeTimer <= 0) return;
    const alpha = clamp(state.noticeTimer / 1.8, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = "900 15px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const textWidth = ctx.measureText(state.notice).width;
    const boxWidth = Math.min(width - 28, textWidth + 34);
    const x = width / 2;
    const y = Math.max(86, height * 0.18);
    ctx.fillStyle = "rgba(8, 14, 20, 0.82)";
    ctx.strokeStyle = state.noticeColor || "#ffd36a";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    roundedRect(ctx, x - boxWidth / 2, y - 20, boxWidth, 40, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = state.noticeColor || "#ffd36a";
    ctx.fillText(state.notice, x, y + 1, boxWidth - 18);
    ctx.restore();
  }

  function drawPowerups() {
    ctx.save();
    for (const powerup of state.powerups) {
      const bob = Math.sin(powerup.pulse) * 3;
      const glow = 0.26 + Math.sin(powerup.pulse) * 0.08;
      ctx.save();
      ctx.translate(powerup.x, powerup.y + bob);
      ctx.rotate(powerup.angle);
      ctx.fillStyle = `${powerup.color}33`;
      ctx.beginPath();
      ctx.arc(0, 0, powerup.radius * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = powerup.color;
      ctx.lineWidth = 2;
      ctx.fillStyle = "rgba(8, 14, 20, 0.92)";
      ctx.beginPath();
      roundedRect(ctx, -powerup.radius, -powerup.radius, powerup.radius * 2, powerup.radius * 2, 7);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 0.78 + glow;
      ctx.fillStyle = powerup.color;
      ctx.font = "900 15px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(powerup.icon, 0, 1);
      ctx.rotate(-powerup.angle);
      ctx.globalAlpha = 0.86;
      ctx.fillStyle = "#f7fbff";
      ctx.font = "800 9px Inter, system-ui, sans-serif";
      if (powerup.kind === "ammo") ctx.fillText(`${formatSeconds(powerup.duration || ammoDuration)}s`, 0, powerup.radius + 10);
      if (powerup.kind === "health") ctx.fillText(`+${powerup.heal || 18}`, 0, powerup.radius + 10);
      ctx.restore();
    }
    ctx.restore();
  }

  function roundedRect(context, x, y, rectWidth, rectHeight, radius) {
    if (typeof context.roundRect === "function") {
      context.roundRect(x, y, rectWidth, rectHeight, radius);
      return;
    }
    context.moveTo(x + radius, y);
    context.lineTo(x + rectWidth - radius, y);
    context.quadraticCurveTo(x + rectWidth, y, x + rectWidth, y + radius);
    context.lineTo(x + rectWidth, y + rectHeight - radius);
    context.quadraticCurveTo(x + rectWidth, y + rectHeight, x + rectWidth - radius, y + rectHeight);
    context.lineTo(x + radius, y + rectHeight);
    context.quadraticCurveTo(x, y + rectHeight, x, y + rectHeight - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
  }

  function drawMeteor(meteor) {
    ctx.save();
    ctx.translate(meteor.x, meteor.y);
    ctx.rotate(meteor.angle);

    const style = meteorKinds[meteor.kind] || meteorKinds.normal;
    const base = meteor.kind === "normal" && meteor.hot ? "#9d392e" : style.base;
    const shade = meteor.kind === "normal" && meteor.hot ? "#ff6e57" : style.shade;
    const glow = meteor.kind === "normal" && meteor.hot ? "rgba(255, 110, 87, 0.36)" : style.glow;

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, meteor.radius * 1.18, 0, Math.PI * 2);
    ctx.fill();

    if (meteor.kind === "jammer") {
      ctx.strokeStyle = `rgba(255, 93, 240, ${0.22 + Math.sin(meteor.pulse) * 0.08})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, meteor.radius * (1.45 + Math.sin(meteor.pulse) * 0.08), 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.beginPath();
    meteor.crags.forEach((crag, index) => {
      const angle = (index / meteor.crags.length) * Math.PI * 2;
      const r = meteor.radius * crag;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = base;
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
    ctx.lineWidth = 2;
    ctx.stroke();

    if (meteor.kind === "split") {
      ctx.strokeStyle = "rgba(255, 211, 106, 0.78)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-meteor.radius * 0.45, -meteor.radius * 0.25);
      ctx.lineTo(meteor.radius * 0.22, meteor.radius * 0.1);
      ctx.lineTo(-meteor.radius * 0.08, meteor.radius * 0.46);
      ctx.moveTo(meteor.radius * 0.36, -meteor.radius * 0.38);
      ctx.lineTo(meteor.radius * 0.06, -meteor.radius * 0.02);
      ctx.stroke();
    }

    if (meteor.kind === "dash") {
      ctx.fillStyle = "rgba(255, 63, 95, 0.72)";
      ctx.beginPath();
      ctx.moveTo(0, -meteor.radius * 0.72);
      ctx.lineTo(meteor.radius * 0.22, meteor.radius * 0.22);
      ctx.lineTo(0, meteor.radius * 0.55);
      ctx.lineTo(-meteor.radius * 0.22, meteor.radius * 0.22);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = shade;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.arc(-meteor.radius * 0.24, -meteor.radius * 0.16, meteor.radius * 0.18, 0, Math.PI * 2);
    ctx.arc(meteor.radius * 0.2, meteor.radius * 0.18, meteor.radius * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (meteor.hp < meteor.maxHp) {
      ctx.strokeStyle = meteor.defense > 0.24 ? "#ffd36a" : "#4be1ff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, meteor.radius * 1.06, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (meteor.hp / meteor.maxHp));
      ctx.stroke();
    }

    if (meteor.shield > 0) {
      const shieldRatio = meteor.shield / meteor.maxShield;
      ctx.strokeStyle = "rgba(159, 176, 255, 0.88)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, meteor.radius * 1.28, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * shieldRatio);
      ctx.stroke();
    }

    if (style.label) {
      ctx.save();
      ctx.rotate(-meteor.angle);
      ctx.fillStyle = "rgba(247, 251, 255, 0.92)";
      ctx.font = "900 12px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(style.label, 0, 1);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawParticles() {
    ctx.save();
    for (const particle of state.particles) {
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      if (particle.ring) {
        ctx.strokeStyle = particle.color;
        ctx.lineWidth = Math.max(2, 8 * alpha);
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius * (1 - alpha * 0.28), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawVignette() {
    const gradient = ctx.createRadialGradient(width / 2, height / 2, height * 0.12, width / 2, height / 2, height * 0.72);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.46)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function render() {
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#05070a";
    ctx.fillRect(0, 0, width, height);
    ctx.translate(shake ? rand(-shake, shake) : 0, shake ? rand(-shake, shake) : 0);
    drawStars();
    drawBullets();
    for (const meteor of state.meteors) drawMeteor(meteor);
    drawPowerups();
    drawParticles();
    drawPlayer();
    ctx.restore();

    drawVignette();
    drawNotice();
    if (flash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${flash * 1.8})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  function loop(time) {
    const dt = Math.min(0.033, (time - lastTime) / 1000 || 0);
    lastTime = time;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  function updatePointer(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.active = true;
  }

  window.addEventListener("resize", resize);
  window.addEventListener("keydown", (event) => {
    audio.resumeMusic();
    keys.add(event.code);
    if (event.code === "Space") {
      event.preventDefault();
      if (state.mode === "ready" || state.mode === "ended") resetGame();
      else setPaused(state.mode === "playing");
    }
    if (event.code === "Escape") setPaused(state.mode === "playing");
  });
  window.addEventListener("keyup", (event) => keys.delete(event.code));

  canvas.addEventListener("pointerdown", (event) => {
    updatePointer(event);
    audio.unlock();
    audio.resumeMusic();
    canvas.setPointerCapture(event.pointerId);
    if (state.mode === "ready" || state.mode === "ended") resetGame();
  });
  canvas.addEventListener("pointermove", updatePointer);
  canvas.addEventListener("pointerup", (event) => {
    pointer.active = false;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  });

  startBtn.addEventListener("click", () => {
    resetGame();
    audio.resumeMusic();
  });
  startScreen.addEventListener("pointerup", () => {
    resetGame();
    audio.resumeMusic();
  });
  startScreen.addEventListener("click", () => {
    resetGame();
    audio.resumeMusic();
  });
  restartBtn.addEventListener("click", () => {
    resetGame();
    audio.resumeMusic();
  });
  resumeBtn.addEventListener("click", () => {
    setPaused(false);
    audio.resumeMusic();
  });
  pauseBtn.addEventListener("click", () => {
    if (state.mode === "playing") setPaused(true);
    else if (state.mode === "paused") setPaused(false);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) setPaused(true);
  });

  bestEl.textContent = best.toString();
  resize();
  renderScoreRank(readTopScores());
  updateHud();
  requestAnimationFrame((time) => {
    lastTime = time;
    requestAnimationFrame(loop);
  });

  if (
    "serviceWorker" in navigator &&
    (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch((error) => {
        console.warn("service worker registration failed", error);
      });
    });
  }
})();
