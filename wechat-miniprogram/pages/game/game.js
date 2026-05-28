const storageKey = "meteor-patrol-best";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

Page({
  data: {
    mode: "ready",
    score: 0,
    best: 0,
    wave: 1,
    lives: 3,
    resultTitle: "任务结束",
  },

  onLoad() {
    this.ctx = null;
    this.canvas = null;
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this.lastTime = 0;
    this.spawnTimer = 0;
    this.shotTimer = 0;
    this.shake = 0;
    this.flash = 0;
    this.pointer = { active: false, x: 0, y: 0 };
    this.state = {
      mode: "ready",
      score: 0,
      best: Number(wx.getStorageSync(storageKey) || 0),
      wave: 1,
      lives: 3,
      time: 0,
      player: null,
      bullets: [],
      meteors: [],
      particles: [],
      stars: [],
    };
    this.setData({ best: this.state.best });
  },

  onReady() {
    this.initCanvas();
  },

  onUnload() {
    if (this.canvas && this.rafId) {
      this.canvas.cancelAnimationFrame(this.rafId);
    }
  },

  onHide() {
    if (this.state && this.state.mode === "playing") {
      this.setPaused(true);
    }
  },

  initCanvas() {
    wx.createSelectorQuery()
      .in(this)
      .select("#gameCanvas")
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvasInfo = res && res[0];
        if (!canvasInfo || !canvasInfo.node) return;

        const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
        this.canvas = canvasInfo.node;
        this.ctx = this.canvas.getContext("2d");
        this.dpr = Math.max(1, Math.min(info.pixelRatio || 1, 2));
        this.width = canvasInfo.width;
        this.height = canvasInfo.height;
        this.canvas.width = Math.floor(this.width * this.dpr);
        this.canvas.height = Math.floor(this.height * this.dpr);
        this.ctx.scale(this.dpr, this.dpr);
        this.resetPlayer();
        this.createStars();
        this.lastTime = Date.now();
        this.loop();
      });
  },

  createStars() {
    const total = Math.floor((this.width * this.height) / 7200);
    this.state.stars = Array.from({ length: total }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      r: rand(0.7, 2),
      speed: rand(18, 82),
      alpha: rand(0.35, 1),
    }));
  },

  resetPlayer() {
    this.state.player = {
      x: this.width / 2,
      y: Math.max(220, this.height - 96),
      targetX: this.width / 2,
      targetY: Math.max(220, this.height - 96),
      radius: 22,
      invulnerable: 0,
    };
  },

  syncHud(extra = {}) {
    this.setData({
      mode: this.state.mode,
      score: this.state.score,
      best: this.state.best,
      wave: this.state.wave,
      lives: this.state.lives,
      ...extra,
    });
  },

  startGame() {
    if (!this.ctx) return;
    this.state.mode = "playing";
    this.state.score = 0;
    this.state.wave = 1;
    this.state.lives = 3;
    this.state.time = 0;
    this.state.bullets = [];
    this.state.meteors = [];
    this.state.particles = [];
    this.spawnTimer = 0;
    this.shotTimer = 0;
    this.shake = 0;
    this.flash = 0;
    this.resetPlayer();
    this.syncHud({ resultTitle: "任务结束" });
  },

  resumeGame() {
    this.setPaused(false);
  },

  togglePause() {
    if (this.state.mode === "playing") {
      this.setPaused(true);
    } else if (this.state.mode === "paused") {
      this.setPaused(false);
    }
  },

  setPaused(paused) {
    if (paused && this.state.mode === "playing") {
      this.state.mode = "paused";
      this.syncHud();
    } else if (!paused && this.state.mode === "paused") {
      this.state.mode = "playing";
      this.lastTime = Date.now();
      this.syncHud();
    }
  },

  endGame() {
    this.state.mode = "ended";
    this.state.best = Math.max(this.state.best, this.state.score);
    wx.setStorageSync(storageKey, String(this.state.best));
    this.syncHud({
      resultTitle: this.state.score >= this.state.best && this.state.score > 0 ? "新的最高分" : "任务结束",
    });
  },

  onTouchStart(event) {
    const touch = event.touches && event.touches[0];
    if (!touch) return;
    this.updatePointer(touch);
    if (this.state.mode === "ready" || this.state.mode === "ended") {
      this.startGame();
    }
  },

  onTouchMove(event) {
    const touch = event.touches && event.touches[0];
    if (touch) this.updatePointer(touch);
  },

  onTouchEnd() {
    this.pointer.active = false;
  },

  updatePointer(touch) {
    this.pointer.active = true;
    this.pointer.x = touch.x;
    this.pointer.y = touch.y;
  },

  spawnMeteor() {
    const waveLift = this.state.wave * 0.7;
    const radius = rand(18, Math.min(48, 28 + this.state.wave * 3));
    const sides = Math.floor(rand(8, 13));
    this.state.meteors.push({
      x: rand(radius, this.width - radius),
      y: -radius - 24,
      vx: rand(-34 - waveLift * 3, 34 + waveLift * 3),
      vy: rand(74 + waveLift * 10, 132 + waveLift * 16),
      radius,
      hp: Math.ceil(radius / 18),
      maxHp: Math.ceil(radius / 18),
      angle: rand(0, Math.PI * 2),
      spin: rand(-2.8, 2.8),
      crags: Array.from({ length: sides }, () => rand(0.72, 1.22)),
      hot: Math.random() > 0.72,
    });
  },

  shoot() {
    if (this.state.mode !== "playing") return;
    const p = this.state.player;
    this.state.bullets.push(
      { x: p.x - 9, y: p.y - 18, vy: -650, radius: 4, life: 1.2 },
      { x: p.x + 9, y: p.y - 18, vy: -650, radius: 4, life: 1.2 },
    );
    this.addParticles(p.x, p.y - 24, 6, "#4be1ff", 90);
  },

  addParticles(x, y, count, color, speed = 150) {
    for (let i = 0; i < count; i += 1) {
      const angle = rand(0, Math.PI * 2);
      const velocity = rand(speed * 0.28, speed);
      this.state.particles.push({
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
  },

  explodeMeteor(meteor) {
    this.addParticles(meteor.x, meteor.y, Math.floor(meteor.radius * 1.2), meteor.hot ? "#ff6e57" : "#ffd36a", 260);
    this.shake = Math.min(12, this.shake + meteor.radius * 0.08);
    this.flash = 0.16;
  },

  hitPlayer(meteor) {
    const p = this.state.player;
    if (p.invulnerable > 0) return;
    this.state.lives -= 1;
    p.invulnerable = 1.25;
    this.explodeMeteor(meteor);
    meteor.dead = true;
    this.shake = 16;
    this.flash = 0.24;
    this.syncHud();
    if (this.state.lives <= 0) this.endGame();
  },

  update(dt) {
    this.state.time += dt;
    this.updateStars(dt);

    if (this.state.mode !== "playing") return;

    this.shotTimer -= dt;
    if (this.shotTimer <= 0) {
      this.shoot();
      this.shotTimer = Math.max(0.12, 0.22 - this.state.wave * 0.006);
    }

    this.updatePlayer(dt);
    this.updateBullets(dt);
    this.updateMeteors(dt);
    this.updateParticles(dt);
    this.checkCollisions();
    this.shake = Math.max(0, this.shake - dt * 24);
    this.flash = Math.max(0, this.flash - dt);
  },

  updatePlayer(dt) {
    const p = this.state.player;
    if (!this.pointer.active) return;
    p.targetX = this.pointer.x;
    p.targetY = this.pointer.y;
    p.x += (p.targetX - p.x) * clamp(dt * 12, 0, 1);
    p.y += (p.targetY - p.y) * clamp(dt * 12, 0, 1);
    p.x = clamp(p.x, 34, this.width - 34);
    p.y = clamp(p.y, 92, this.height - 42);
    p.invulnerable = Math.max(0, p.invulnerable - dt);
  },

  updateBullets(dt) {
    for (const bullet of this.state.bullets) {
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
    }
    this.state.bullets = this.state.bullets.filter((bullet) => bullet.life > 0 && bullet.y > -20 && !bullet.dead);
  },

  updateMeteors(dt) {
    const spawnRate = Math.max(0.36, 0.92 - this.state.wave * 0.055);
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnMeteor();
      if (this.state.wave > 3 && Math.random() > 0.62) this.spawnMeteor();
      this.spawnTimer = spawnRate * rand(0.72, 1.16);
    }

    for (const meteor of this.state.meteors) {
      meteor.x += meteor.vx * dt;
      meteor.y += meteor.vy * dt;
      meteor.angle += meteor.spin * dt;
      if (meteor.x < meteor.radius || meteor.x > this.width - meteor.radius) {
        meteor.vx *= -1;
        meteor.x = clamp(meteor.x, meteor.radius, this.width - meteor.radius);
      }
      if (meteor.y - meteor.radius > this.height) {
        meteor.dead = true;
        this.state.lives -= 1;
        this.addParticles(meteor.x, this.height - 18, 10, "#ff3f5f", 180);
        this.syncHud();
        if (this.state.lives <= 0) this.endGame();
      }
    }

    this.state.meteors = this.state.meteors.filter((meteor) => !meteor.dead);
  },

  updateParticles(dt) {
    for (const particle of this.state.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 1 - dt * 1.8;
      particle.vy *= 1 - dt * 1.8;
      particle.life -= dt;
    }
    this.state.particles = this.state.particles.filter((particle) => particle.life > 0);
  },

  updateStars(dt) {
    for (const star of this.state.stars) {
      star.y += star.speed * dt * (this.state.mode === "playing" ? 1 : 0.18);
      if (star.y > this.height + 4) {
        star.x = Math.random() * this.width;
        star.y = -4;
      }
    }
  },

  checkCollisions() {
    for (const bullet of this.state.bullets) {
      for (const meteor of this.state.meteors) {
        if (bullet.dead || meteor.dead) continue;
        const distance = Math.hypot(bullet.x - meteor.x, bullet.y - meteor.y);
        if (distance < bullet.radius + meteor.radius * 0.86) {
          bullet.dead = true;
          meteor.hp -= 1;
          this.addParticles(bullet.x, bullet.y, 5, "#4be1ff", 140);
          if (meteor.hp <= 0) {
            meteor.dead = true;
            this.state.score += Math.round(80 + meteor.radius * 6);
            this.state.wave = 1 + Math.floor(this.state.score / 1200);
            this.explodeMeteor(meteor);
            this.syncHud();
          }
        }
      }
    }

    const p = this.state.player;
    for (const meteor of this.state.meteors) {
      const distance = Math.hypot(p.x - meteor.x, p.y - meteor.y);
      if (distance < p.radius + meteor.radius * 0.74) {
        this.hitPlayer(meteor);
        break;
      }
    }

    this.state.bullets = this.state.bullets.filter((bullet) => !bullet.dead);
    this.state.meteors = this.state.meteors.filter((meteor) => !meteor.dead);
  },

  loop() {
    if (!this.canvas || !this.ctx) return;
    const now = Date.now();
    const dt = Math.min(0.033, (now - this.lastTime) / 1000 || 0);
    this.lastTime = now;
    this.update(dt);
    this.render();
    this.rafId = this.canvas.requestAnimationFrame(() => this.loop());
  },

  render() {
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = "#05070a";
    ctx.fillRect(0, 0, this.width, this.height);

    const shakeX = this.shake ? rand(-this.shake, this.shake) : 0;
    const shakeY = this.shake ? rand(-this.shake, this.shake) : 0;
    ctx.translate(shakeX, shakeY);

    this.drawStars();
    this.drawBullets();
    for (const meteor of this.state.meteors) this.drawMeteor(meteor);
    this.drawParticles();
    this.drawPlayer();
    ctx.restore();

    this.drawVignette();
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.flash * 1.8})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }
  },

  drawStars() {
    const ctx = this.ctx;
    ctx.save();
    for (const star of this.state.stars) {
      ctx.globalAlpha = star.alpha;
      ctx.fillStyle = "#f8fbff";
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  drawPlayer() {
    const ctx = this.ctx;
    const p = this.state.player;
    const blink = p.invulnerable > 0 && Math.floor(this.state.time * 18) % 2 === 0;
    if (blink) return;

    ctx.save();
    ctx.translate(p.x, p.y);
    const engine = 14 + Math.sin(this.state.time * 32) * 4;
    const wingTilt = clamp((p.targetX - p.x) / 90, -0.18, 0.18);

    ctx.fillStyle = "rgba(75, 225, 255, 0.22)";
    ctx.beginPath();
    ctx.ellipse(0, 12, 28, 34, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(wingTilt);
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

    ctx.fillStyle = "#ff6e57";
    ctx.beginPath();
    ctx.moveTo(-8, 22);
    ctx.lineTo(0, 22 + engine);
    ctx.lineTo(8, 22);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },

  drawBullets() {
    const ctx = this.ctx;
    ctx.save();
    for (const bullet of this.state.bullets) {
      const gradient = ctx.createLinearGradient(bullet.x, bullet.y + 18, bullet.x, bullet.y - 18);
      gradient.addColorStop(0, "rgba(75, 225, 255, 0)");
      gradient.addColorStop(0.42, "rgba(75, 225, 255, 0.78)");
      gradient.addColorStop(1, "#f7fbff");
      ctx.fillStyle = gradient;
      this.roundRect(ctx, bullet.x - 3, bullet.y - 18, 6, 28, 3);
      ctx.fill();
    }
    ctx.restore();
  },

  drawMeteor(meteor) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(meteor.x, meteor.y);
    ctx.rotate(meteor.angle);

    const base = meteor.hot ? "#9d392e" : "#72685e";
    const shade = meteor.hot ? "#ff6e57" : "#b8aa96";
    const glow = meteor.hot ? "rgba(255, 110, 87, 0.36)" : "rgba(255, 211, 106, 0.18)";

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, meteor.radius * 1.18, 0, Math.PI * 2);
    ctx.fill();

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

    ctx.fillStyle = shade;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.arc(-meteor.radius * 0.24, -meteor.radius * 0.16, meteor.radius * 0.18, 0, Math.PI * 2);
    ctx.arc(meteor.radius * 0.2, meteor.radius * 0.18, meteor.radius * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (meteor.hp < meteor.maxHp) {
      ctx.strokeStyle = "#4be1ff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, meteor.radius * 1.06, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (meteor.hp / meteor.maxHp));
      ctx.stroke();
    }

    ctx.restore();
  },

  drawParticles() {
    const ctx = this.ctx;
    ctx.save();
    for (const particle of this.state.particles) {
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  drawVignette() {
    const ctx = this.ctx;
    const gradient = ctx.createRadialGradient(this.width / 2, this.height / 2, this.height * 0.12, this.width / 2, this.height / 2, this.height * 0.72);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.46)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  },

  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  },
});
