(function () {
  "use strict";

  const WIDTH = 600;
  const HEIGHT = 400;

  const enemyTypes = [
    { name: "Goblin", icon: "👺", hp: 30, attack: 7 },
    { name: "Skeleton Archer", icon: "🏹", hp: 34, attack: 8 },
    { name: "Cave Troll", icon: "🧌", hp: 48, attack: 10 },
    { name: "Shadow Wraith", icon: "👻", hp: 40, attack: 12 },
    { name: "Stone Golem", icon: "🗿", hp: 58, attack: 9 }
  ];

  const dom = {};
  let ctx;
  let sound;
  let music;
  let particles;
  let floaters;
  let background;
  let lastFrame = 0;
  let shakeFrames = 0;
  let flashFrames = 0;

  const state = {
    started: false,
    gameOver: false,
    inputLocked: true,
    phase: "start",
    floor: 1,
    roomIndex: 0,
    roomSequence: [],
    currentEnemy: null,
    player: {
      hp: 100,
      displayHp: 100,
      maxHp: 100,
      attack: 10,
      gold: 0,
      potions: 0,
      potionsFound: 0
    },
    enemiesKilled: 0,
    totalGoldCollected: 0,
    runHistory: [],
    log: [],
    narrationToken: 0
  };

  class MusicEngine {
    constructor() {
      this.context = null;
      this.nodes = [];
      this.playing = false;
      this.muted = false;
    }

    getContext() {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        if (!this.context) this.context = new AC();
        if (this.context.state === "suspended") this.context.resume().catch(() => {});
        return this.context;
      } catch(e) { return null; }
    }

    start(theme) {
      this.stop();
      const audio = this.getContext();
      if (!audio || this.muted) return;
      this.playing = true;

      const master = audio.createGain();
      master.gain.setValueAtTime(0.04, audio.currentTime);
      master.connect(audio.destination);
      this.nodes.push(master);

      const themes = {
        blue:   [110, 146.8, 164.8, 220],
        red:    [98,  130.8, 146.8, 196],
        purple: [82.4, 110,  123.5, 164.8]
      };

      const notes = themes[theme] || themes.blue;

      notes.forEach((freq, i) => {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = i % 2 === 0 ? "sine" : "triangle";
        osc.frequency.setValueAtTime(freq, audio.currentTime);

        const lfo = audio.createOscillator();
        const lfoGain = audio.createGain();
        lfo.frequency.setValueAtTime(0.08 + i * 0.03, audio.currentTime);
        lfoGain.gain.setValueAtTime(freq * 0.004, audio.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();

        gain.gain.setValueAtTime(0.18 + (i * 0.06), audio.currentTime);
        osc.connect(gain);
        gain.connect(master);
        osc.start();

        this.nodes.push(osc, gain, lfo, lfoGain);
      });

      const noise = audio.createOscillator();
      const noiseGain = audio.createGain();
      noise.type = "sawtooth";
      noise.frequency.setValueAtTime(30, audio.currentTime);
      noiseGain.gain.setValueAtTime(0.015, audio.currentTime);
      noise.connect(noiseGain);
      noiseGain.connect(master);
      noise.start();
      this.nodes.push(noise, noiseGain);
    }

    stop() {
      for (const node of this.nodes) {
        try { node.stop && node.stop(); } catch(e) {}
        try { node.disconnect && node.disconnect(); } catch(e) {}
      }
      this.nodes = [];
      this.playing = false;
    }

    setTheme(theme) {
      if (this.playing) this.start(theme);
    }

    setMuted(muted) {
      this.muted = muted;
      if (muted) this.stop();
      else if (state.started) this.start(currentTheme());
    }
  }

  class SoundEngine {
    constructor() {
      this.context = null;
      this.muted = false;
      this.blocked = false;
    }

    unlock() {
      this.getContext();
    }

    getContext() {
      if (this.blocked || this.muted) {
        return null;
      }
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
          this.blocked = true;
          return null;
        }
        if (!this.context) {
          this.context = new AudioContextClass();
        }
        if (this.context.state === "suspended") {
          this.context.resume().catch(() => {});
        }
        return this.context;
      } catch (error) {
        this.blocked = true;
        return null;
      }
    }

    tone(type, startFreq, endFreq, duration, volume) {
      const audio = this.getContext();
      if (!audio) {
        return;
      }
      const now = audio.currentTime;
      const osc = audio.createOscillator();
      const gain = audio.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(startFreq, now);
      if (endFreq && endFreq !== startFreq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
      }

      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(now);
      osc.stop(now + duration + 0.03);
    }

    playerAttack() {
      this.tone("sine", 520, 520, 0.08, 0.08);
    }

    enemyAttack() {
      this.tone("sawtooth", 180, 130, 0.15, 0.06);
    }

    playerDeath() {
      this.tone("sine", 400, 80, 0.8, 0.08);
    }

    levelUp() {
      this.tone("triangle", 400, 800, 0.4, 0.07);
    }

    goldPickup() {
      this.tone("sine", 880, 880, 0.12, 0.07);
    }

    bossAppear() {
      this.tone("sawtooth", 60, 45, 1.2, 0.08);
    }

    flee() {
      this.tone("square", 600, 200, 0.3, 0.05);
    }

    oracleSpeak() {
      this.tone("triangle", 300, 430, 0.6, 0.045);
    }
  }

  class ParticleSystem {
    constructor() {
      this.items = [];
    }

    add(x, y, options) {
      this.items.push({
        x,
        y,
        vx: options.vx || 0,
        vy: options.vy || 0,
        radius: options.radius || 3,
        color: options.color || "#ffffff",
        life: options.life || 0.6,
        maxLife: options.life || 0.6,
        gravity: options.gravity || 0
      });
    }

    enemyDeath(x, y) {
      for (let i = 0; i < 12; i += 1) {
        const angle = (Math.PI * 2 * i) / 12;
        const speed = random(55, 130);
        this.add(x, y, {
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: random(2, 4),
          color: Math.random() < 0.5 ? "#ffd65c" : "#ff8b2e",
          life: 0.6
        });
      }
    }

    heal(x, y) {
      for (let i = 0; i < 8; i += 1) {
        this.add(x + random(-14, 14), y + random(-4, 16), {
          vx: random(-10, 10),
          vy: random(-65, -30),
          radius: random(2, 3.5),
          color: "#47e38a",
          life: 0.8
        });
      }
    }

    bossDeath(x, y) {
      const colors = ["#ffd65c", "#ff5b5b", "#b765ff", "#57c7ff"];
      for (let i = 0; i < 30; i += 1) {
        const angle = random(0, Math.PI * 2);
        const speed = random(75, 185);
        this.add(x, y, {
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: random(2, 4.5),
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 0.85
        });
      }
      flashFrames = 3;
    }

    gold(x, y) {
      for (let i = 0; i < 5; i += 1) {
        this.add(x + random(-8, 8), y, {
          vx: random(-22, 22),
          vy: random(-105, -72),
          radius: random(2, 3),
          color: "#ffd65c",
          gravity: 170,
          life: 0.75
        });
      }
    }

    update(dt) {
      this.items = this.items.filter((item) => {
        item.life -= dt;
        item.vy += item.gravity * dt;
        item.x += item.vx * dt;
        item.y += item.vy * dt;
        return item.life > 0;
      });
    }

    draw(context) {
      for (const item of this.items) {
        const alpha = Math.max(0, item.life / item.maxLife);
        context.save();
        context.globalAlpha = alpha;
        context.fillStyle = item.color;
        context.beginPath();
        context.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }
    }
  }

  class FloatingTextSystem {
    constructor() {
      this.items = [];
    }

    add(text, x, y, color, size, isCrit) {
      this.items.push({
        text,
        x,
        y,
        startY: y,
        color,
        size,
        life: 1,
        maxLife: 1,
        isCrit: Boolean(isCrit)
      });
      if (isCrit) {
        this.items.push({
          text: "CRIT!",
          x,
          y: y - 24,
          startY: y - 24,
          color: "#ff8b2e",
          size: size + 4,
          life: 1,
          maxLife: 1,
          isCrit: true
        });
      }
    }

    update(dt) {
      this.items = this.items.filter((item) => {
        item.life -= dt;
        const progress = 1 - item.life / item.maxLife;
        item.y = item.startY - progress * 40;
        return item.life > 0;
      });
    }

    draw(context) {
      context.save();
      context.textAlign = "center";
      context.textBaseline = "middle";
      for (const item of this.items) {
        context.globalAlpha = Math.max(0, item.life / item.maxLife);
        context.font = `${item.size}px "Press Start 2P", monospace`;
        context.fillStyle = item.color;
        context.fillText(item.text, item.x, item.y);
      }
      context.restore();
    }
  }

  class BackgroundRenderer {
    constructor() {
      this.theme = "";
      this.items = [];
    }

    setTheme(theme) {
      if (this.theme === theme) {
        return;
      }
      this.theme = theme;
      this.items = [];
      if (theme === "blue") {
        for (let i = 0; i < 20; i += 1) {
          this.items.push({
            x: random(0, WIDTH),
            y: random(0, HEIGHT),
            radius: random(12, 34),
            vx: random(4, 14),
            vy: random(-6, 4),
            alpha: random(0.07, 0.3)
          });
        }
      } else if (theme === "red") {
        for (let i = 0; i < 24; i += 1) {
          this.items.push({
            x: random(0, WIDTH),
            y: random(0, HEIGHT),
            radius: random(1.5, 3.5),
            vy: random(-18, -45),
            alpha: random(0.1, 0.28)
          });
        }
      } else {
        for (let i = 0; i < 36; i += 1) {
          this.items.push({
            angle: random(0, Math.PI * 2),
            distance: random(40, 300),
            speed: random(0.03, 0.12),
            radius: random(1, 2.2),
            alpha: random(0.1, 0.32)
          });
        }
      }
    }

    update(dt) {
      if (this.theme === "blue") {
        for (const item of this.items) {
          item.x += item.vx * dt;
          item.y += item.vy * dt;
          if (item.x - item.radius > WIDTH) {
            item.x = -item.radius;
            item.y = random(0, HEIGHT);
          }
        }
      } else if (this.theme === "red") {
        for (const item of this.items) {
          item.y += item.vy * dt;
          if (item.y < -8) {
            item.y = HEIGHT + 8;
            item.x = random(0, WIDTH);
          }
        }
      } else {
        for (const item of this.items) {
          item.angle += item.speed * dt;
        }
      }
    }

    draw(context) {
      const gradient = context.createLinearGradient(0, 0, 0, HEIGHT);
      if (this.theme === "blue") {
        gradient.addColorStop(0, "#071426");
        gradient.addColorStop(1, "#050510");
      } else if (this.theme === "red") {
        gradient.addColorStop(0, "#1a0909");
        gradient.addColorStop(1, "#070507");
      } else {
        gradient.addColorStop(0, "#13091f");
        gradient.addColorStop(1, "#04040b");
      }
      context.fillStyle = gradient;
      context.fillRect(0, 0, WIDTH, HEIGHT);

      if (this.theme === "blue") {
        for (const item of this.items) {
          context.save();
          context.globalAlpha = item.alpha;
          context.fillStyle = "#57c7ff";
          context.beginPath();
          context.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
          context.fill();
          context.restore();
        }
      } else if (this.theme === "red") {
        for (const item of this.items) {
          context.save();
          context.globalAlpha = item.alpha;
          context.fillStyle = "#ff7a2f";
          context.beginPath();
          context.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
          context.fill();
          context.restore();
        }
      } else {
        for (const item of this.items) {
          const x = WIDTH / 2 + Math.cos(item.angle) * item.distance;
          const y = HEIGHT / 2 + Math.sin(item.angle) * item.distance * 0.55;
          context.save();
          context.globalAlpha = item.alpha;
          context.fillStyle = "#cfa3ff";
          context.beginPath();
          context.arc(x, y, item.radius, 0, Math.PI * 2);
          context.fill();
          context.restore();
        }
      }
    }
  }

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    dom.startScreen = document.getElementById("startScreen");
    dom.gameScreen = document.getElementById("gameScreen");
    dom.gameOverScreen = document.getElementById("gameOverScreen");
    dom.apiKeyInput = document.getElementById("apiKeyInput");
    dom.beginRunButton = document.getElementById("beginRunButton");
    dom.playAgainButton = document.getElementById("playAgainButton");
    dom.canvas = document.getElementById("gameCanvas");
    dom.canvasFrame = document.getElementById("canvasFrame");
    dom.muteToggle = document.getElementById("muteToggle");
    dom.floorTransition = document.getElementById("floorTransition");
    dom.floorTransitionText = document.getElementById("floorTransitionText");
    dom.hudFloor = document.getElementById("hudFloor");
    dom.hudHp = document.getElementById("hudHp");
    dom.hudAttack = document.getElementById("hudAttack");
    dom.hudGold = document.getElementById("hudGold");
    dom.hudPotions = document.getElementById("hudPotions");
    dom.narrationSpeaker = document.getElementById("narrationSpeaker");
    dom.narrationText = document.getElementById("narrationText");
    dom.combatLog = document.getElementById("combatLog");
    dom.choicePanel = document.getElementById("choicePanel");
    dom.finalStats = document.getElementById("finalStats");
    dom.runChronicle = document.getElementById("runChronicle");
    dom.actionButtons = Array.from(document.querySelectorAll("[data-action]"));

    ctx = dom.canvas.getContext("2d");
    sound = new SoundEngine();
    music = new MusicEngine();
    particles = new ParticleSystem();
    floaters = new FloatingTextSystem();
    background = new BackgroundRenderer();
    background.setTheme("blue");

    wireButton(dom.beginRunButton, beginRun);
    wireButton(dom.playAgainButton, restartRun);
    wireButton(dom.muteToggle, toggleMute);
    for (const button of dom.actionButtons) {
      wireButton(button, () => handleAction(button.dataset.action));
    }
    document.addEventListener("keydown", (e) => {
      const map = { a: "attack", d: "defend", i: "item", f: "flee" };
      const action = map[e.key.toLowerCase()];
      if (action) handleAction(action);
    });

    setNarration("THE ORACLE", "The key opens the gate. The courage opens the wound.");
    addLog("Enter the dungeon when ready.");
    setControlsEnabled(false);
    updateHud();
    requestAnimationFrame(gameLoop);
  }

  function wireButton(button, handler) {
    button.addEventListener("click", handler);
    button.addEventListener("touchend", (event) => {
      event.preventDefault();
      button.click();
    }, { passive: false });
  }

  function beginRun() {
    sound.unlock();
    music.start("blue");
    window.OracleAI.setApiKey(dom.apiKeyInput.value);
    dom.apiKeyInput.value = "";
    showOnly(dom.gameScreen);
    resetRun();
    startFloor(1);
  }

  function restartRun() {
    sound.unlock();
    music.start("blue");
    showOnly(dom.gameScreen);
    resetRun();
    startFloor(1);
  }

  function resetRun() {
    state.started = true;
    state.gameOver = false;
    state.inputLocked = true;
    state.phase = "transition";
    state.floor = 1;
    state.roomIndex = 0;
    state.roomSequence = [];
    state.currentEnemy = null;
    state.player.hp = 100;
    state.player.displayHp = 100;
    state.player.maxHp = 100;
    state.player.attack = 10;
    state.player.gold = 0;
    state.player.potions = 0;
    state.player.potionsFound = 0;
    state.enemiesKilled = 0;
    state.totalGoldCollected = 0;
    state.runHistory = [];
    state.log = [];
    state.narrationToken += 1;
    particles.items = [];
    floaters.items = [];
    addLog("The Oracle opens the first door.");
    updateHud();
  }

  function showOnly(screen) {
    dom.startScreen.hidden = true;
    dom.gameScreen.hidden = true;
    dom.gameOverScreen.hidden = true;
    screen.hidden = false;
  }

  function startFloor(floor) {
    state.floor = floor;
    state.roomIndex = 0;
    state.roomSequence = floor % 5 === 0
      ? ["enemy", "choice", "enemy", "boss"]
      : ["enemy", "choice", "enemy"];
    state.phase = "transition";
    state.inputLocked = true;
    setControlsEnabled(false);
    updateTheme();
    updateHud();
    showFloorTransition(floor, () => enterCurrentRoom());
  }

  function showFloorTransition(floor, onDone) {
    dom.floorTransitionText.textContent = `FLOOR ${floor}`;
    dom.floorTransition.hidden = false;
    requestAnimationFrame(() => {
      dom.floorTransition.classList.add("is-visible");
    });
    sound.levelUp();
    setTimeout(() => {
      dom.floorTransition.classList.remove("is-visible");
      setTimeout(() => {
        dom.floorTransition.hidden = true;
        onDone();
      }, 240);
    }, 1200);
  }

  function enterCurrentRoom() {
    if (state.gameOver) {
      return;
    }
    if (state.roomIndex >= state.roomSequence.length) {
      startFloor(state.floor + 1);
      return;
    }

    const roomType = state.roomSequence[state.roomIndex];
    dom.choicePanel.hidden = true;
    dom.choicePanel.innerHTML = "";
    state.phase = roomType;
    state.inputLocked = true;
    setControlsEnabled(false);
    updateHud();

    if (roomType === "enemy") {
      startEnemyRoom();
    } else if (roomType === "boss") {
      startBossRoom();
    } else {
      startChoiceRoom();
    }
  }

  function startEnemyRoom() {
    state.currentEnemy = createEnemy(state.floor);
    state.phase = "combat";
    state.inputLocked = false;
    setControlsEnabled(true);
    addLog(`${state.currentEnemy.name} blocks the way.`);
    narrateEnemyIntro(state.currentEnemy, "enemy");
  }

  function startBossRoom() {
    state.currentEnemy = createBoss(state.floor);
    state.phase = "combat";
    state.inputLocked = true;
    sound.bossAppear();
    setControlsEnabled(false);
    addLog(`${state.currentEnemy.name} descends into the chamber.`);
    narrateBossIntro();
  }

  function createEnemy(floor) {
    const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
    const maxHp = Math.round(type.hp + floor * random(7, 11));
    return {
      name: type.name,
      icon: type.icon,
      maxHp,
      hp: maxHp,
      displayHp: maxHp,
      attack: Math.round(type.attack + floor * random(1.8, 3.2)),
      isBoss: false
    };
  }

  function createBoss(floor) {
    const maxHp = 200 + floor * 20;
    return {
      name: "The Remembering Oracle",
      icon: "🔮",
      maxHp,
      hp: maxHp,
      displayHp: maxHp,
      attack: 18 + floor * 3,
      isBoss: true
    };
  }

  async function narrateEnemyIntro(enemy, roomType) {
    const token = ++state.narrationToken;
    setNarration("THE DUNGEON", "", true);
    const roomText = await window.OracleAI.describeRoom(state.floor, roomType);
    if (!isCurrentNarration(token)) {
      return;
    }
    setNarration("THE DUNGEON", roomText);
    await wait(350);
    if (!isCurrentNarration(token)) {
      return;
    }
    setNarration(enemy.name.toUpperCase(), "", true);
    const taunt = await window.OracleAI.enemyTaunt(enemy.name, state.player.hp, state.player.attack);
    if (isCurrentNarration(token)) {
      setNarration(enemy.name.toUpperCase(), taunt);
    }
  }

  async function narrateBossIntro() {
    const token = ++state.narrationToken;
    setNarration("THE REMEMBERING ORACLE", "", true);
    const monologue = await window.OracleAI.bossMonologue(state.runHistory);
    if (!isCurrentNarration(token)) {
      state.inputLocked = false;
      setControlsEnabled(true);
      return;
    }
    setNarration("THE REMEMBERING ORACLE", monologue);
    state.inputLocked = false;
    setControlsEnabled(true);
  }

  function isCurrentNarration(token) {
    return token === state.narrationToken && !state.gameOver;
  }

  function startChoiceRoom() {
    state.currentEnemy = null;
    state.phase = "choice";
    state.inputLocked = true;
    setControlsEnabled(false);
    const choices = ["potion", "shrine", "oracle", "gold"];
    renderChoice(choices[Math.floor(Math.random() * choices.length)]);
  }

  function renderChoice(type) {
    dom.choicePanel.hidden = false;
    if (type === "potion") {
      const canFindPotion = state.player.potionsFound < 2;
      dom.choicePanel.innerHTML = choiceHtml(
        "A cracked satchel lies beside a cold campfire.",
        canFindPotion ? "A health potion rolls out, still warm to the touch." : "Only a few coins remain where a potion should have been.",
        canFindPotion ? ["TAKE POTION"] : ["TAKE COINS"]
      );
      bindChoiceButtons([() => {
        if (canFindPotion) {
          state.player.potions += 1;
          state.player.potionsFound += 1;
          state.runHistory.push(`Found a health potion on floor ${state.floor}`);
          addLog("You found a health potion.");
        } else {
          gainGold(10, 320, 185);
          state.runHistory.push(`Found backup gold on floor ${state.floor}`);
          addLog("You found 10 gold instead.");
        }
        completeRoom();
      }]);
    } else if (type === "shrine") {
      dom.choicePanel.innerHTML = choiceHtml(
        "A mysterious shrine offers a bargain.",
        "One hand promises endurance. The other promises violence.",
        ["+15 MAX HP", "+3 ATTACK"]
      );
      bindChoiceButtons([
        () => {
          state.player.maxHp += 15;
          state.player.hp = Math.min(state.player.maxHp, state.player.hp + 15);
          state.runHistory.push(`Chose max HP at a shrine on floor ${state.floor}`);
          addLog("The shrine hardens your heart. Max HP +15.");
          particles.heal(150, 230);
          floaters.add("+15", 150, 205, "#47e38a", 16, false);
          updateHud();
          completeRoom();
        },
        () => {
          state.player.attack += 3;
          state.runHistory.push(`Chose attack at a shrine on floor ${state.floor}`);
          addLog("The shrine sharpens your blade. Attack +3.");
          sound.levelUp();
          updateHud();
          completeRoom();
        }
      ]);
    } else if (type === "oracle") {
      dom.choicePanel.innerHTML = choiceHtml(
        "Oracle speaks...",
        "The room goes still enough to hear your future crack.",
        ["LISTEN"]
      );
      bindChoiceButtons([async () => {
        sound.oracleSpeak();
        setChoiceLoading("The Oracle gathers a sentence from the dark...");
        setNarration("THE ORACLE", "", true);
        const hint = await window.OracleAI.oracleHint(state.player.gold, state.player.hp, state.floor);
        setNarration("THE ORACLE", hint);
        state.runHistory.push(`Heard the Oracle on floor ${state.floor}: ${hint}`);
        addLog("The Oracle leaves you with a crooked hint.");
        dom.choicePanel.innerHTML = choiceHtml("Oracle speaks...", hint, ["CONTINUE"]);
        bindChoiceButtons([completeRoom]);
      }]);
    } else {
      dom.choicePanel.innerHTML = choiceHtml(
        "A gold chest waits in the center of the room.",
        "Its lock opens before your hand touches it.",
        ["OPEN CHEST"]
      );
      bindChoiceButtons([() => {
        gainGold(20, 320, 185);
        state.runHistory.push(`Opened a gold chest on floor ${state.floor}`);
        addLog("You collected 20 gold.");
        completeRoom();
      }]);
    }
  }

  function choiceHtml(title, text, buttons) {
    return `
      <h3 class="choice-title">${escapeHtml(title)}</h3>
      <p class="choice-text">${escapeHtml(text)}</p>
      <div class="choice-buttons">
        ${buttons.map((label) => `<button type="button">${escapeHtml(label)}</button>`).join("")}
      </div>
    `;
  }

  function bindChoiceButtons(handlers) {
    const buttons = Array.from(dom.choicePanel.querySelectorAll("button"));
    buttons.forEach((button, index) => {
      wireButton(button, () => {
        if (state.gameOver) {
          return;
        }
        handlers[index]();
      });
    });
  }

  function setChoiceLoading(text) {
    dom.choicePanel.innerHTML = `
      <h3 class="choice-title">Oracle speaks...</h3>
      <p class="choice-text">${escapeHtml(text)}</p>
    `;
  }

  function handleAction(action) {
    if (state.inputLocked || state.gameOver || state.phase !== "combat" || !state.currentEnemy) {
      return;
    }
    sound.unlock();

    if (action === "attack") {
      playerAttack();
    } else if (action === "defend") {
      playerDefend();
    } else if (action === "item") {
      playerUseItem();
    } else if (action === "flee") {
      playerFlee();
    }
  }

  function playerAttack() {
    state.inputLocked = true;
    setControlsEnabled(false);
    sound.playerAttack();
    const crit = Math.random() < 0.15;
    const baseDamage = state.player.attack + randomInt(1, 5);
    const damage = Math.round(baseDamage * (crit ? 1.5 : 1));
    state.currentEnemy.hp = Math.max(0, state.currentEnemy.hp - damage);
    floaters.add(String(damage), 450, 178, "#ffd65c", crit ? 22 : 16, crit);
    addLog(`You strike ${state.currentEnemy.name} for ${damage}${crit ? " critical" : ""} damage.`);

    if (state.currentEnemy.hp <= 0) {
      defeatEnemy();
      return;
    }

    setTimeout(() => enemyTurn(false), 150);
  }

  function playerDefend() {
    state.inputLocked = true;
    setControlsEnabled(false);
    addLog("You raise your guard.");
    setTimeout(() => enemyTurn(true), 150);
  }

  function playerUseItem() {
    if (state.player.potions <= 0) {
      addLog("No health potion remains.");
      return;
    }
    state.inputLocked = true;
    setControlsEnabled(false);
    state.player.potions -= 1;
    const oldHp = state.player.hp;
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + 30);
    const healed = state.player.hp - oldHp;
    particles.heal(150, 230);
    floaters.add(`+${healed}`, 150, 190, "#47e38a", 16, false);
    addLog(`You drink a potion and restore ${healed} HP.`);
    state.runHistory.push(`Used a health potion on floor ${state.floor}, restored ${healed} HP`);
    updateHud();
    setTimeout(() => enemyTurn(false), 150);
  }

  function playerFlee() {
    state.inputLocked = true;
    setControlsEnabled(false);
    sound.flee();
    if (Math.random() < 0.4) {
      const enemyName = state.currentEnemy.name;
      state.runHistory.push(`Fled from ${enemyName} on floor ${state.floor}`);
      addLog(`You fled from ${enemyName}.`);
      state.currentEnemy = null;
      completeRoom();
      return;
    }
    addLog("You fail to flee.");
    setTimeout(() => enemyTurn(false), 150);
  }

  function enemyTurn(defended) {
    if (state.gameOver || !state.currentEnemy) {
      return;
    }
    sound.enemyAttack();
    const rawDamage = state.currentEnemy.attack + randomInt(0, 4);
    const damage = Math.max(1, Math.round(rawDamage * (defended ? 0.5 : 1)));
    state.player.hp = Math.max(0, state.player.hp - damage);
    floaters.add(`-${damage}`, 150, 178, "#ff5b5b", 16, false);
    addLog(`${state.currentEnemy.name} hits you for ${damage} damage.`);
    shakeCanvas();
    flashDamageBorder();
    updateHud();

    if (state.player.hp <= 0) {
      endRun();
      return;
    }

    state.inputLocked = false;
    setControlsEnabled(true);
  }

  function defeatEnemy() {
    const enemy = state.currentEnemy;
    state.inputLocked = true;
    setControlsEnabled(false);

    if (enemy.isBoss) {
      particles.bossDeath(450, 200);
      state.player.gold += 100;
      state.totalGoldCollected += 100;
      state.player.hp = state.player.maxHp;
      state.runHistory.push(`Defeated ${enemy.name} on floor ${state.floor}`);
      addLog("The boss shatters. +100 gold. HP restored.");
      sound.goldPickup();
      updateHud();
      state.currentEnemy = null;
      setTimeout(completeRoom, 1050);
      return;
    }

    particles.enemyDeath(450, 200);
    state.enemiesKilled += 1;
    state.runHistory.push(`Killed ${enemy.name} on floor ${state.floor}`);
    const gold = randomInt(9 + state.floor * 2, 17 + state.floor * 4);
    gainGold(gold, 450, 195);
    const upgrade = grantRandomUpgrade();
    addLog(`${enemy.name} falls. +${gold} gold. ${upgrade}`);

    if (state.player.potionsFound < 2 && Math.random() < 0.18) {
      state.player.potions += 1;
      state.player.potionsFound += 1;
      addLog("A hidden health potion clinks onto the floor.");
      state.runHistory.push(`Found a dropped potion on floor ${state.floor}`);
    }

    updateHud();
    state.currentEnemy = null;
    setTimeout(completeRoom, 850);
  }

  function grantRandomUpgrade() {
    if (Math.random() < 0.5) {
      const amount = randomInt(1, 3);
      state.player.attack += amount;
      sound.levelUp();
      state.runHistory.push(`Gained +${amount} attack on floor ${state.floor}`);
      return `Attack +${amount}.`;
    }
    const amount = randomInt(8, 15);
    state.player.maxHp += amount;
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + Math.ceil(amount / 2));
    particles.heal(150, 230);
    floaters.add(`+${amount}`, 150, 190, "#47e38a", 16, false);
    state.runHistory.push(`Gained +${amount} max HP on floor ${state.floor}`);
    return `Max HP +${amount}.`;
  }

  function gainGold(amount, x, y) {
    state.player.gold += amount;
    state.totalGoldCollected += amount;
    particles.gold(x, y);
    sound.goldPickup();
    updateHud();
  }

  function completeRoom() {
    if (state.gameOver) {
      return;
    }
    state.roomIndex += 1;
    dom.choicePanel.hidden = true;
    dom.choicePanel.innerHTML = "";
    state.inputLocked = true;
    setControlsEnabled(false);
    enterCurrentRoom();
  }

  function endRun() {
    state.gameOver = true;
    state.phase = "gameover";
    state.inputLocked = true;
    setControlsEnabled(false);
    sound.playerDeath();
    state.runHistory.push(`Died on floor ${state.floor}`);
    addLog("The dungeon writes your ending.");
    renderGameOver();
    setTimeout(() => showOnly(dom.gameOverScreen), 450);
  }

  function renderGameOver() {
    dom.finalStats.innerHTML = `
      <div>Floors reached: ${state.floor}</div>
      <div>Enemies killed: ${state.enemiesKilled}</div>
      <div>Gold collected: ${state.totalGoldCollected}</div>
    `;
    dom.runChronicle.innerHTML = "";
    const history = state.runHistory.length ? state.runHistory : ["The dungeon swallowed an empty chronicle."];
    for (const entry of history) {
      const li = document.createElement("li");
      li.textContent = entry;
      dom.runChronicle.appendChild(li);
    }

    const best = state.runHistory.length
      ? state.runHistory[Math.floor(state.runHistory.length / 2)]
      : "Entered the dungeon and met the dark.";

    const shareText =
      `ECHOES OF THE ORACLE\n` +
      `${"─".repeat(28)}\n` +
      `Floors: ${state.floor}  |  Kills: ${state.enemiesKilled}  |  Gold: ${state.totalGoldCollected}\n` +
      `${"─".repeat(28)}\n` +
      `"${best}"\n` +
      `${"─".repeat(28)}\n` +
      `Play: https://echoes-of-the-oracle.vercel.app`;

    const oldShareBtn = document.getElementById("shareRunButton");
    if (oldShareBtn) {
      oldShareBtn.remove();
    }

    const shareBtn = document.createElement("button");
    shareBtn.id = "shareRunButton";
    shareBtn.textContent = "COPY RUN CARD";
    shareBtn.className = "primary-button share-run-button";
    shareBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(shareText).then(() => {
        shareBtn.textContent = "COPIED!";
        setTimeout(() => { shareBtn.textContent = "COPY RUN CARD"; }, 1800);
      }).catch(() => {
        shareBtn.textContent = "COPY FAILED";
      });
    });

    const chronicle = document.getElementById("runChronicle");
    chronicle.parentNode.insertBefore(shareBtn, chronicle);
  }

  function setControlsEnabled(enabled) {
    for (const button of dom.actionButtons) {
      button.disabled = !enabled;
    }
  }

  function setNarration(speaker, text, typing) {
    dom.narrationSpeaker.textContent = speaker;
    dom.narrationText.textContent = text || "";
    dom.narrationText.classList.toggle("typing", Boolean(typing));
  }

  function addLog(line) {
    state.log.push(line);
    if (state.log.length > 28) {
      state.log.shift();
    }
    dom.combatLog.innerHTML = "";
    for (const item of state.log.slice(-4)) {
      const div = document.createElement("div");
      div.className = "log-line";
      div.textContent = item;
      dom.combatLog.appendChild(div);
    }
  }

  function updateHud() {
    dom.hudFloor.textContent = `FLOOR ${state.floor}`;
    dom.hudHp.textContent = `HP ${state.player.hp}/${state.player.maxHp}`;
    dom.hudAttack.textContent = `ATK ${state.player.attack}`;
    dom.hudGold.textContent = `GOLD ${state.player.gold}`;
    dom.hudPotions.textContent = `POTIONS ${state.player.potions}`;
  }

  function updateTheme() {
    const theme = currentTheme();
    dom.canvasFrame.classList.remove("theme-blue", "theme-red", "theme-purple");
    dom.canvasFrame.classList.add(`theme-${theme}`);
    background.setTheme(theme);
    music.setTheme(theme);
  }

  function currentTheme() {
    if (state.floor >= 10) {
      return "purple";
    }
    if (state.floor >= 5) {
      return "red";
    }
    return "blue";
  }

  function toggleMute() {
    sound.muted = !sound.muted;
    music.setMuted(sound.muted);
    dom.muteToggle.textContent = sound.muted ? "×" : "♪";
    dom.muteToggle.setAttribute("aria-label", sound.muted ? "Unmute sound" : "Mute sound");
  }

  function shakeCanvas() {
    shakeFrames = 6;
  }

  function flashDamageBorder() {
    dom.canvas.classList.add("damage-flash");
    setTimeout(() => dom.canvas.classList.remove("damage-flash"), 180);
  }

  function gameLoop(timestamp) {
    const dt = Math.min(0.033, (timestamp - lastFrame) / 1000 || 0);
    lastFrame = timestamp;

    background.update(dt);
    particles.update(dt);
    floaters.update(dt);
    tweenHp(dt);
    applyShake();
    draw();
    requestAnimationFrame(gameLoop);
  }

  function tweenHp(dt) {
    state.player.displayHp = tween(state.player.displayHp, state.player.hp, dt, 0.3);
    if (state.currentEnemy) {
      state.currentEnemy.displayHp = tween(state.currentEnemy.displayHp, state.currentEnemy.hp, dt, 0.3);
    }
  }

  function applyShake() {
    if (shakeFrames > 0) {
      const x = randomInt(-6, 6);
      const y = randomInt(-6, 6);
      dom.canvas.style.transform = `translate(${x}px, ${y}px)`;
      shakeFrames -= 1;
    } else {
      dom.canvas.style.transform = "";
    }
  }

  function draw() {
    background.draw(ctx);
    drawRoomPanel();
    drawCharacters();
    particles.draw(ctx);
    floaters.draw(ctx);
    if (flashFrames > 0) {
      ctx.save();
      ctx.globalAlpha = 0.42;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.restore();
      flashFrames -= 1;
    }
  }

  function drawRoomPanel() {
    const theme = currentTheme();
    const border = theme === "blue" ? "#57c7ff" : theme === "red" ? "#ff5b5b" : "#b765ff";
    ctx.save();
    ctx.fillStyle = "rgba(5, 5, 16, 0.62)";
    ctx.strokeStyle = border;
    ctx.lineWidth = 3;
    ctx.fillRect(42, 54, 516, 260);
    ctx.strokeRect(42, 54, 516, 260);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    for (let x = 72; x < 548; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 54);
      ctx.lineTo(x, 314);
      ctx.stroke();
    }
    for (let y = 84; y < 306; y += 48) {
      ctx.beginPath();
      ctx.moveTo(42, y);
      ctx.lineTo(558, y);
      ctx.stroke();
    }

    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillStyle = "#f3f0ff";
    ctx.textAlign = "left";
    ctx.fillText(`ROOM ${state.roomIndex + 1}/${state.roomSequence.length || 1}`, 58, 82);
    ctx.textAlign = "right";
    ctx.fillText(state.phase.toUpperCase(), 542, 82);
    ctx.restore();
  }

  function drawCharacters() {
    drawPlayer();
    if (state.currentEnemy) {
      drawEnemy();
    } else if (state.phase === "choice") {
      drawChoiceIcon();
    }
  }

  function drawPlayer() {
    const waiting = state.phase === "combat" && !state.inputLocked && !state.gameOver;
    const bob = waiting ? Math.sin(performance.now() / 1500 * Math.PI * 2) * 3 : 0;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#57c7ff";
    ctx.shadowBlur = 18;
    ctx.font = "50px serif";
    ctx.fillText("⚔️", 150, 216 + bob);
    ctx.shadowBlur = 0;
    drawHpBar(92, 272, 116, 12, state.player.displayHp, state.player.maxHp, "YOU");
    ctx.restore();
  }

  function drawEnemy() {
    const enemy = state.currentEnemy;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = enemy.isBoss ? "#b765ff" : "#ff5b5b";
    ctx.shadowBlur = enemy.isBoss ? 24 : 15;
    ctx.font = enemy.isBoss ? "58px serif" : "52px serif";
    ctx.fillText(enemy.icon, 450, 210);
    ctx.shadowBlur = 0;
    drawHpBar(374, 272, 152, 12, enemy.displayHp, enemy.maxHp, enemy.name.toUpperCase());
    ctx.restore();
  }

  function drawChoiceIcon() {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#ffd65c";
    ctx.shadowBlur = 18;
    ctx.font = "52px serif";
    ctx.fillText("✨", 450, 210);
    ctx.restore();
  }

  function drawHpBar(x, y, width, height, hp, maxHp, label) {
    const pct = Math.max(0, Math.min(1, hp / maxHp));
    ctx.fillStyle = "#4b0d1a";
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = pct < 0.35 ? "#ff5b5b" : "#47e38a";
    ctx.fillRect(x, y, width * pct, height);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
    ctx.fillStyle = "#f3f0ff";
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = "center";
    ctx.fillText(label, x + width / 2, y - 10);
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function tween(current, target, dt, duration) {
    if (Math.abs(target - current) < 0.1) {
      return target;
    }
    const amount = Math.min(1, dt / duration);
    return current + (target - current) * amount;
  }

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  function randomInt(min, max) {
    return Math.floor(random(min, max + 1));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
