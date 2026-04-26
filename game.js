const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const errorBox = document.getElementById("errorBox");
const yearLabel = document.getElementById("yearLabel");
const tip = document.getElementById("tip");
const backBtn = document.getElementById("backBtn");
const nextBtn = document.getElementById("nextBtn");
const restartBtn = document.getElementById("restartBtn");
const barFill = document.getElementById("barFill");
const ending = document.getElementById("ending");
const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");
const jumpBtn = document.getElementById("jumpBtn");

const weddingPhoto = new Image();
weddingPhoto.src = "assets/wedding.jpg";

window.addEventListener("error", (event) => {
  showError(`${event.message}\n${event.filename}:${event.lineno}:${event.colno}`);
});

window.addEventListener("unhandledrejection", (event) => {
  showError(String(event.reason));
});

function showError(message) {
  if (!errorBox) return;
  errorBox.textContent = `Game error:\n${message}`;
  errorBox.classList.add("show");
}

const scenes = [
  { year: "2010", kind: "facebook", tip: "Collect 3 hearts, then reach Facebook" },
  { year: "2011/12", kind: "pause", tip: "Collect courage hearts through the pause" },
  { year: "2016", kind: "reconnect", tip: "Collect 3 hearts, then reconnect" },
  { year: "Feb 2017", kind: "lake", tip: "Collect hearts, then meet him at the lake" },
  { year: "Mall Bye", kind: "kiss", tip: "Collect hearts, then go close for goodbye" },
  { year: "6 Months", kind: "return", tip: "Collect travel hearts and meet again" },
  { year: "Mountains", kind: "trip", tip: "Collect trip hearts in the mountains" },
  { year: "Families", kind: "family", tip: "Collect love hearts and cross the bridge" },
  { year: "2025", kind: "wedding", tip: "Collect forever hearts and reach the mandap" }
];

let w = 0;
let h = 0;
let dpr = 1;
let time = 0;
let current = 0;
let target = { x: 0, y: 0, r: 58 };
let memories = [];
let particles = [];
let complete = scenes.map(() => false);
let autoNextTimer = null;

const input = { left: false, right: false, jump: false };

const girl = {
  x: 90,
  y: 280,
  vx: 0,
  vy: 0,
  facing: 1,
  walk: 0,
  onGround: true
};

const boy = {
  x: 520,
  y: 280,
  facing: -1,
  walk: 0,
  visible: false
};

function resize() {
  dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  w = window.innerWidth;
  h = window.innerHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  setScene(false);
}

function groundY() {
  return h * 0.76;
}

function setScene(resetPlayer) {
  clearAutoNext();
  const kind = scenes[current].kind;
  const gy = groundY();
  target = getTarget(kind);
  memories = makeMemories();

  boy.visible = ["lake", "kiss", "return", "trip", "family", "wedding"].includes(kind);
  boy.x = kind === "trip" ? w * 0.36 : kind === "wedding" ? w * 0.57 : w * 0.68;
  boy.y = gy - 55;
  boy.facing = -1;

  if (resetPlayer) {
    girl.x = Math.max(70, w * 0.12);
    girl.y = gy - 55;
    girl.vx = 0;
    girl.vy = 0;
  }

  yearLabel.textContent = scenes[current].year;
  backBtn.disabled = current === 0;
  nextBtn.textContent = current === scenes.length - 1 ? "Finish" : "Next";
  barFill.style.width = `${((current + 1) / scenes.length) * 100}%`;
  updateTip();
}

function getTarget(kind) {
  const gy = groundY();
  if (kind === "facebook") return { x: w * 0.78, y: gy - 118, r: 58 };
  if (kind === "pause") return { x: w * 0.76, y: gy - 118, r: 58 };
  if (kind === "reconnect") return { x: w * 0.78, y: gy - 118, r: 58 };
  if (kind === "trip") return { x: w * 0.8, y: gy - 95, r: 72 };
  if (kind === "family") return { x: w * 0.76, y: gy - 70, r: 70 };
  if (kind === "wedding") return { x: w * 0.62, y: gy - 55, r: 70 };
  return { x: w * 0.64, y: gy - 55, r: 68 };
}

function makeMemories() {
  const gy = groundY();
  return [
    { x: w * 0.28, y: gy - 110, got: false },
    { x: w * 0.48, y: gy - 170, got: false },
    { x: w * 0.66, y: gy - 112, got: false }
  ];
}

function updateTip() {
  const got = memories.filter((m) => m.got).length;
  if (complete[current]) {
    tip.textContent = "Moment complete";
  } else if (got < memories.length) {
    tip.textContent = `${scenes[current].tip} (${got}/${memories.length})`;
  } else {
    tip.textContent = "Now reach the glowing moment";
  }
}

function update() {
  time += 1 / 60;

  const accel = input.left || input.right ? 0.55 : 0;
  if (input.left) {
    girl.vx -= accel;
    girl.facing = -1;
  }
  if (input.right) {
    girl.vx += accel;
    girl.facing = 1;
  }
  if (input.jump && girl.onGround) {
    girl.vy = -11.4;
    girl.onGround = false;
  }
  input.jump = false;

  girl.vx *= 0.84;
  girl.vx = clamp(girl.vx, -5.4, 5.4);
  girl.vy += 0.58;
  girl.x += girl.vx;
  girl.y += girl.vy;

  const floor = groundY() - 55;
  if (girl.y >= floor) {
    girl.y = floor;
    girl.vy = 0;
    girl.onGround = true;
  }

  girl.x = clamp(girl.x, 48, w - 48);
  if (Math.abs(girl.vx) > 0.4 && girl.onGround) girl.walk += 0.22;

  collectMemories();
  updateBoy();
  checkMoment();
  updateParticles();
}

function collectMemories() {
  memories.forEach((memory) => {
    if (memory.got) return;
    if (Math.hypot(girl.x - memory.x, girl.y - memory.y) < 42) {
      memory.got = true;
      if (scenes[current].kind === "pause") {
        sadBreak(memory.x, memory.y, 14);
      } else {
        burst(memory.x, memory.y, 14);
      }
      updateTip();
    }
  });
}

function updateBoy() {
  if (!boy.visible) return;
  if (scenes[current].kind === "trip" && complete[current]) {
    const dx = girl.x - 76 - boy.x;
    boy.x += dx * 0.04;
    boy.walk += Math.abs(dx) > 2 ? 0.12 : 0;
  }
}

function checkMoment() {
  if (complete[current]) return;
  if (memories.some((memory) => !memory.got)) return;
  if (Math.hypot(girl.x - target.x, girl.y - target.y) > target.r) return;

  complete[current] = true;
  girl.facing = 1;
  boy.facing = -1;
  if (scenes[current].kind === "pause") {
    sadBreak(target.x, target.y, 34);
  } else {
    burst(target.x, target.y, 36);
  }
  updateTip();
  scheduleAutoNext();
}

function scheduleAutoNext() {
  clearAutoNext();
  autoNextTimer = window.setTimeout(() => {
    autoNextTimer = null;
    if (current === scenes.length - 1) {
      ending.classList.add("show");
      return;
    }
    current += 1;
    setScene(true);
  }, 1200);
}

function clearAutoNext() {
  if (autoNextTimer === null) return;
  window.clearTimeout(autoNextTimer);
  autoNextTimer = null;
}

function draw() {
  drawBackground();
  drawScene();
  drawMemories();
  if (boy.visible) drawPerson(boy, boyStyle());
  drawPerson(girl, girlStyle());
  drawMoment();
  drawParticles();
}

function drawBackground() {
  const palette = [
    ["#fff7fb", "#e4f7ff", "#fff1c7"],
    ["#fff0f6", "#f0ecff", "#eafaff"],
    ["#effaff", "#fff4fb", "#fff6d8"],
    ["#ddf8ff", "#fff8e8", "#ffddec"],
    ["#fff3f8", "#e9f8ff", "#fff0c9"],
    ["#eef5ff", "#fff6fb", "#fff3d7"],
    ["#f2f7ff", "#fff4e4", "#e6ffe9"],
    ["#fff5e7", "#f0f7ff", "#ffe4f0"],
    ["#fff6fb", "#eaf9ff", "#fff1c8"]
  ][current];

  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, palette[0]);
  gradient.addColorStop(0.55, palette[1]);
  gradient.addColorStop(1, palette[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  drawCloud(w * 0.16, h * 0.18, 1.05);
  drawCloud(w * 0.74, h * 0.16, 0.82);
  drawFloatingHearts();
  if (["trip", "family", "wedding"].includes(scenes[current].kind)) drawMountains();
  drawGround();
}

function drawFloatingHearts() {
  for (let i = 0; i < 8; i += 1) {
    const x = (i * 163 + time * 12) % (w + 120) - 60;
    const y = h * (0.18 + (i % 3) * 0.12) + Math.sin(time + i) * 9;
    drawHeart(x, y, 12 + (i % 3) * 4, "rgba(255, 125, 169, 0.25)");
  }
}

function drawScene() {
  const kind = scenes[current].kind;
  if (kind === "facebook") drawProfilePhone(target.x, target.y, "#95d8ff", "f");
  if (kind === "pause") drawUnfollowPhone(target.x, target.y);
  if (kind === "reconnect") drawProfilePhone(target.x, target.y, "#ffc1dc", "♥");
  if (kind === "lake" || kind === "return") drawLake();
  if (kind === "kiss") drawMall();
  if (kind === "trip") drawTrail();
  if (kind === "family") drawFamilyBridge();
  if (kind === "wedding") {
    drawMandap();
    drawPhotoSticker();
  }
  if (memories.every((m) => m.got)) drawGlow(target.x, target.y, target.r);
}

function drawMemories() {
  memories.forEach((memory, index) => {
    if (memory.got) return;
    const bob = Math.sin(time * 4 + index) * 6;
    drawHeart(memory.x, memory.y + bob, 24, "#ff7fab");
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(memory.x, memory.y + bob, 24, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function drawMoment() {
  if (!complete[current]) return;
  const kind = scenes[current].kind;
  if (["lake", "return", "wedding"].includes(kind)) {
    drawHeart((girl.x + boy.x) / 2, girl.y - 122 + Math.sin(time * 3) * 5, 24);
  }
  if (kind === "kiss") {
    drawHeart(boy.x - 25, boy.y - 76, 16 + Math.sin(time * 5) * 2);
  }
}

function girlStyle() {
  return {
    name: "Appu",
    dress: scenes[current].kind === "wedding" ? "#d83f72" : "#ff8db7",
    pants: "#805c92",
    hair: "#3b2734",
    skin: "#ffd0b6",
    curly: true,
    sad: scenes[current].kind === "pause",
    veil: scenes[current].kind === "wedding"
  };
}

function boyStyle() {
  return {
    name: "Shami",
    dress: scenes[current].kind === "wedding" ? "#f9f1dd" : "#86b6ff",
    pants: scenes[current].kind === "wedding" ? "#f0d996" : "#5f6fa8",
    hair: "#34283d",
    skin: "#ffc9a9",
    curly: false,
    pahariCap: scenes[current].kind === "wedding",
    safa: false
  };
}

function drawPerson(actor, style) {
  const bob = Math.sin(actor.walk * 2) * 2;
  const leg = Math.sin(actor.walk) * 11;
  const scale = w <= 520 ? 0.62 : w <= 760 ? 0.74 : 1;
  ctx.save();
  ctx.translate(actor.x, actor.y + bob);
  ctx.scale(actor.facing * scale, scale);

  ctx.fillStyle = "rgba(105, 73, 97, 0.16)";
  ctx.beginPath();
  ctx.ellipse(0, 76, 46, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  if (style.veil) {
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.beginPath();
    ctx.ellipse(-7, -54, 47, 68, -0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = style.hair;
  if (style.curly) {
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 29, -87 + Math.sin(a) * 18, 18, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.beginPath();
    ctx.ellipse(0, -86, 31, 22, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = style.skin;
  ctx.beginPath();
  ctx.ellipse(0, -62, 33, 38, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#56384f";
  ctx.beginPath();
  ctx.arc(-12, -66, 3.5, 0, Math.PI * 2);
  ctx.arc(12, -66, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#e77b8f";
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (style.sad) {
    ctx.arc(0, -49, 11, Math.PI + 0.1, Math.PI * 2 - 0.1);
  } else {
    ctx.arc(0, -55, 11, 0.1, Math.PI - 0.1);
  }
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 123, 152, 0.35)";
  ctx.beginPath();
  ctx.ellipse(-21, -56, 8, 4, 0, 0, Math.PI * 2);
  ctx.ellipse(21, -56, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  if (style.pahariCap) {
    ctx.fillStyle = style.hair;
    ctx.beginPath();
    ctx.arc(-23, -78, 12, 0, Math.PI * 2);
    ctx.arc(23, -78, 12, 0, Math.PI * 2);
    ctx.arc(-10, -84, 11, 0, Math.PI * 2);
    ctx.arc(8, -84, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-28, -84, 56, 13);

    ctx.fillStyle = "#8b2d48";
    ctx.beginPath();
    ctx.ellipse(0, -96, 34, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4f9b73";
    ctx.fillRect(-28, -101, 56, 7);
    ctx.fillStyle = "#d84d65";
    ctx.fillRect(-28, -94, 56, 5);
    ctx.fillStyle = "#fff2d7";
    ctx.beginPath();
    ctx.ellipse(0, -106, 27, 7, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = style.dress;
  ctx.beginPath();
  roundedRectPath(-28, -22, 56, 78, 24);
  ctx.fill();

  ctx.strokeStyle = style.skin;
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-26, -4);
  ctx.lineTo(-43, 30);
  ctx.moveTo(26, -4);
  ctx.lineTo(43, 30);
  ctx.stroke();

  ctx.strokeStyle = style.pants;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(-14, 54);
  ctx.lineTo(-18 + leg, 80);
  ctx.moveTo(14, 54);
  ctx.lineTo(18 - leg, 80);
  ctx.stroke();
  ctx.restore();

  drawNameTag(actor.x, actor.y - (122 * scale) + bob, style.name, scale);
}

function drawNameTag(x, y, name, scale) {
  if (!name) return;
  ctx.save();
  ctx.font = `900 ${Math.max(11, 15 * scale)}px Trebuchet MS, Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const width = ctx.measureText(name).width + 18;
  const height = Math.max(20, 28 * scale);
  roundRect(x - width / 2, y - height / 2, width, height, height / 2, "rgba(255,255,255,0.78)");
  ctx.fillStyle = "#f66f9e";
  ctx.fillText(name, x, y);
  ctx.restore();
}

function drawGround() {
  const gy = groundY();
  ctx.fillStyle = "#9fe0b9";
  ctx.beginPath();
  ctx.ellipse(w * 0.5, gy + h * 0.18, w * 0.74, h * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.26)";
  ctx.beginPath();
  ctx.ellipse(w * 0.5, gy + 16, w * 0.52, h * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawMountains() {
  const gy = groundY();
  ctx.fillStyle = "#b7d7ed";
  triangle(w * 0.18, gy, w * 0.38, h * 0.28, w * 0.58, gy);
  ctx.fillStyle = "#91c2e1";
  triangle(w * 0.42, gy, w * 0.65, h * 0.24, w * 0.92, gy);
  ctx.fillStyle = "#fffafc";
  triangle(w * 0.34, h * 0.34, w * 0.38, h * 0.28, w * 0.43, h * 0.36);
  triangle(w * 0.6, h * 0.33, w * 0.65, h * 0.24, w * 0.72, h * 0.35);
}

function drawLake() {
  const gy = groundY();
  ctx.fillStyle = "#75cce9";
  ctx.beginPath();
  ctx.ellipse(w * 0.56, gy + 18, Math.min(180, w * 0.25), 42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillRect(w * 0.45, gy + 10, w * 0.22, 4);
  ctx.fillRect(w * 0.5, gy + 28, w * 0.16, 3);
}

function drawMall() {
  const gy = groundY();
  const baseX = w * 0.5;
  const width = Math.min(w * 0.62, 430);
  const height = Math.min(h * 0.28, 190);
  const x = baseX - width / 2;
  const y = gy - height - 8;

  roundRect(x, y, width, height, 18, "rgba(255,255,255,0.64)");
  ctx.fillStyle = "#ffd7e7";
  ctx.fillRect(x + 16, y + 44, width - 32, 12);

  ctx.fillStyle = "#c8ecff";
  for (let i = 0; i < 4; i += 1) {
    roundRect(x + 28 + i * ((width - 76) / 3), y + 68, 42, 50, 8, "#eaf8ff");
  }

  ctx.fillStyle = "#f66f9e";
  ctx.font = "900 24px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("MALL", baseX, y + 25);

  roundRect(baseX - 32, gy - 76, 64, 68, 10, "#f8e2b8");
  ctx.fillStyle = "#b084cc";
  ctx.fillRect(baseX - 24, gy - 68, 48, 16);
  drawHeart(baseX + 54, gy - 106, 16, "#ff7fab");
}

function drawTrail() {
  ctx.strokeStyle = "rgba(255,255,255,0.72)";
  ctx.lineWidth = 16;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(w * 0.2, groundY() - 40);
  ctx.bezierCurveTo(w * 0.42, groundY() - 120, w * 0.58, groundY() - 24, w * 0.78, groundY() - 96);
  ctx.stroke();
}

function drawFamilyBridge() {
  const gy = groundY();
  ctx.strokeStyle = "#b084cc";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(w * 0.58, gy - 18, Math.min(150, w * 0.22), Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = "#ffd55c";
  ctx.fillRect(w * 0.36, gy - 24, w * 0.44, 12);
  drawTinyFamily(w * 0.36, gy - 58, "#ff8db7");
  drawTinyFamily(w * 0.8, gy - 58, "#86b6ff");
}

function drawMandap() {
  const gy = groundY();
  ctx.strokeStyle = "#ff8db7";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(w * 0.62, gy - 35, 92, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = "#fff8fb";
  ctx.fillRect(w * 0.62 - 105, gy - 38, 18, 110);
  ctx.fillRect(w * 0.62 + 87, gy - 38, 18, 110);
  drawHeart(w * 0.62, gy - 18, 34, "#ffd55c");
}

function drawPhotoSticker() {
  if (!weddingPhoto.complete || weddingPhoto.naturalWidth === 0) return;
  const photoW = Math.min(w < 620 ? 106 : 148, w * 0.28);
  const photoH = photoW * 1.45;
  const x = w < 620 ? w * 0.23 : w * 0.22;
  const y = w < 620 ? h * 0.25 : groundY() - photoH - 54;
  ctx.save();
  ctx.translate(x + photoW / 2, y + photoH / 2 + Math.sin(time * 2) * 4);
  ctx.rotate(-0.08);
  ctx.translate(-photoW / 2, -photoH / 2);
  roundRect(-8, -8, photoW + 16, photoH + 16, 18, "rgba(255,255,255,0.78)");
  roundRect(photoW / 2 - 34, -20, 68, 24, 7, "rgba(255, 214, 104, 0.72)");
  ctx.save();
  ctx.beginPath();
  roundedRectPath(0, 0, photoW, photoH, 14);
  ctx.clip();
  drawImageCover(weddingPhoto, 0, 0, photoW, photoH);
  ctx.fillStyle = "rgba(255, 218, 232, 0.18)";
  ctx.fillRect(0, 0, photoW, photoH);
  ctx.restore();
  ctx.restore();
}

function drawGlow(x, y, r) {
  if (complete[current]) return;
  ctx.save();
  ctx.globalAlpha = 0.32 + Math.sin(time * 4) * 0.12;
  ctx.fillStyle = "#ff8db7";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.arc(x, y, r + 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawPhone(x, y, symbol, color) {
  ctx.save();
  ctx.translate(x, y);
  roundRect(-34, -56, 68, 112, 14, color);
  roundRect(-25, -42, 50, 78, 8, "#fff9fd");
  ctx.fillStyle = "#6b5b95";
  ctx.font = "900 42px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(symbol, 0, -2);
  drawHeart(38, -48, 14);
  ctx.restore();
}

function drawProfilePhone(x, y, color, badge) {
  ctx.save();
  ctx.translate(x, y);
  roundRect(-34, -56, 68, 112, 14, color);
  roundRect(-25, -42, 50, 78, 8, "#fff9fd");
  drawBoyProfile(0, -6, 1);
  drawSmallBadge(23, -39, badge, color === "#95d8ff" ? "#5da9ff" : "#ff7fab");
  ctx.restore();
}

function drawUnfollowPhone(x, y) {
  ctx.save();
  ctx.translate(x, y);
  roundRect(-34, -56, 68, 112, 14, "#d9c9df");
  roundRect(-25, -42, 50, 78, 8, "#fff9fd");
  drawBoyProfile(0, -6, 1);

  ctx.strokeStyle = "#8f6e85";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-23, 32);
  ctx.lineTo(23, -34);
  ctx.stroke();

  ctx.fillStyle = "#f1dce7";
  ctx.strokeStyle = "#8f6e85";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 36, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#8f6e85";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-8, 36);
  ctx.lineTo(8, 36);
  ctx.stroke();
  ctx.restore();
}

function drawBoyProfile(x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#eaf4ff";
  ctx.beginPath();
  ctx.arc(0, 0, 23, 0, Math.PI * 2);
  ctx.fill();
  ctx.clip();

  ctx.fillStyle = "#34283d";
  ctx.beginPath();
  ctx.ellipse(0, -11, 17, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffc9a9";
  ctx.beginPath();
  ctx.ellipse(0, -2, 14, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#56384f";
  ctx.beginPath();
  ctx.arc(-5, -5, 2, 0, Math.PI * 2);
  ctx.arc(5, -5, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#7a4650";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 1, 5, 0.1, Math.PI - 0.1);
  ctx.stroke();

  ctx.fillStyle = "#86b6ff";
  ctx.beginPath();
  roundedRectPath(-18, 16, 36, 24, 12);
  ctx.fill();
  ctx.restore();
}

function drawSmallBadge(x, y, text, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 15px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y + 1);
}

function drawBrokenHeart(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(2.15, 2.15);
  drawHeart(0, 0, 24);
  ctx.strokeStyle = "#fff8fb";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(-7, -3);
  ctx.lineTo(4, 6);
  ctx.lineTo(-2, 22);
  ctx.stroke();
  ctx.restore();
}

function drawTinyFamily(x, y, color) {
  for (let i = 0; i < 3; i += 1) {
    const px = x + i * 18;
    ctx.fillStyle = "#ffd0b6";
    ctx.beginPath();
    ctx.arc(px, y, 8, 0, Math.PI * 2);
    ctx.fill();
    roundRect(px - 7, y + 8, 14, 25, 7, color);
  }
}

function drawCloud(x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.arc(-34, 8, 24, 0, Math.PI * 2);
  ctx.arc(-8, -8, 32, 0, Math.PI * 2);
  ctx.arc(26, 6, 26, 0, Math.PI * 2);
  ctx.rect(-52, 8, 98, 28);
  ctx.fill();
  ctx.restore();
}

function drawHeart(x, y, size, color = "#ff7fab") {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 32, size / 32);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 12);
  ctx.bezierCurveTo(-32, -8, -17, -31, 0, -16);
  ctx.bezierCurveTo(17, -31, 32, -8, 0, 12);
  ctx.fill();
  ctx.restore();
}

function burst(x, y, count) {
  for (let i = 0; i < count; i += 1) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 5,
      vy: -Math.random() * 4.5 - 1,
      life: 1,
      size: Math.random() * 10 + 7,
      color: Math.random() > 0.45 ? "#ff7fab" : "#ffd55c"
    });
  }
}

function sadBreak(x, y, count) {
  for (let i = 0; i < count; i += 1) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 3.2,
      vy: Math.random() * 1.5 + 0.6,
      life: 1,
      size: Math.random() * 8 + 5,
      color: Math.random() > 0.5 ? "#9a7d92" : "#b9aac1",
      broken: true
    });
  }
}

function updateParticles() {
  particles = particles.filter((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.07;
    p.life -= 0.016;
    return p.life > 0;
  });
}

function drawParticles() {
  particles.forEach((p) => {
    ctx.globalAlpha = Math.max(0, p.life);
    if (p.broken) {
      drawShard(p.x, p.y, p.size, p.color);
    } else {
      drawHeart(p.x, p.y, p.size, p.color);
    }
    ctx.globalAlpha = 1;
  });
}

function drawShard(x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((x + y + time) * 0.05);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.75, size * 0.4);
  ctx.lineTo(-size * 0.55, size * 0.8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawImageCover(img, x, y, targetW, targetH) {
  const ratio = Math.max(targetW / img.naturalWidth, targetH / img.naturalHeight);
  const sourceW = targetW / ratio;
  const sourceH = targetH / ratio;
  const sourceX = (img.naturalWidth - sourceW) / 2;
  const sourceY = (img.naturalHeight - sourceH) / 2;
  ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, x, y, targetW, targetH);
}

function triangle(x1, y1, x2, y2, x3, y3) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
  ctx.fill();
}

function roundRect(x, y, width, height, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  roundedRectPath(x, y, width, height, radius);
  ctx.fill();
}

function roundedRectPath(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pressButton(button, key) {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    input[key] = true;
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener("pointerup", () => {
    input[key] = false;
  });
  button.addEventListener("pointercancel", () => {
    input[key] = false;
  });
  button.addEventListener("pointerleave", () => {
    if (key !== "jump") input[key] = false;
  });
}

pressButton(leftBtn, "left");
pressButton(rightBtn, "right");
pressButton(jumpBtn, "jump");

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") input.left = true;
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") input.right = true;
  if (event.key === "ArrowUp" || event.key === " " || event.key.toLowerCase() === "w") input.jump = true;
});

window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") input.left = false;
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") input.right = false;
});

backBtn.addEventListener("click", () => {
  if (current <= 0) return;
  clearAutoNext();
  current -= 1;
  setScene(true);
});

nextBtn.addEventListener("click", () => {
  clearAutoNext();
  if (current === scenes.length - 1) {
    ending.classList.add("show");
    return;
  }
  current += 1;
  setScene(true);
});

restartBtn.addEventListener("click", () => {
  clearAutoNext();
  current = 0;
  complete = scenes.map(() => false);
  particles = [];
  ending.classList.remove("show");
  setScene(true);
});

window.addEventListener("resize", resize);

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

resize();
setScene(true);
loop();
