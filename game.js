const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

/* ================= CANVAS ================= */
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

/* ================= AUDIO ================= */
const sounds = {
    hit: new Audio("hit.wav"),
    goal: new Audio("goal.wav"),
};
let audioUnlocked = false;
window.addEventListener("click", () => {
    if (!audioUnlocked) {
        Object.values(sounds).forEach(s => {
            s.volume = 0.6;
            s.play().then(() => s.pause()).catch(() => {});
        });
        audioUnlocked = true;
    }
}, { once: true });

/* ================= STATE ================= */
let state = "LOGO"; // LOGO → MENU → AI_SELECT → GAME → SHOP
let gameMode = null;
let aiLevel = null;
let logoTimer = 0;
const LOGO_DURATION = 3;

/* ================= INPUT ================= */
const keys = {};
let mouseX = 0, mouseY = 0;
window.addEventListener("mousemove", e => { mouseX = e.clientX; mouseY = e.clientY; });
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

/* ================= OBJECTS ================= */
const paddleW = 18;
const paddleH = 120;
let paddleSpeed = 700;
let ballSpeedBase = 550;

const paddleA = { x: 40, y: 0, score: 0, color: "red", vy: 0 };
const paddleB = { x: 0, y: 0, score: 0, color: "green", vy: 0 };
const ball = { x: 0, y: 0, r: 10, dx: 1, dy: 0.5, speed: ballSpeedBase };

/* ================= CURVE / SPIN ================= */
let spin = 0;
const SPIN_POWER = 0.35;
const SPIN_DECAY = 0.92;

/* ================= ECONOMY ================= */
let coins = Number(localStorage.getItem("coins")) || 0;

/* ================= SHOP ================= */
const shopSkins = [
    { name: "Classic Red", color: "red", price: 0 },
    { name: "Neon Blue", color: "#00f6ff", price: 50 },
    { name: "Gold", color: "gold", price: 150 },
];
let ownedSkins = JSON.parse(localStorage.getItem("ownedSkins")) || ["red"];

/* ================= LEADERBOARD ================= */
let bestScore = Number(localStorage.getItem("bestScore")) || 0;

/* ================= WALL FLASH ================= */
let wallFlashColor = null;
let wallFlashTimer = 0;
const WALL_FLASH_DURATION = 3;
const WALL_DEFAULT_COLOR = "white";

/* ================= MATCH ================= */
const MAX_SCORE = 10;
let matchOver = false;

/* ================= DIFFICULTY ================= */
function applyDifficulty() {
    if (gameMode === "AI") {
        if (aiLevel === "EASY") { ballSpeedBase = 600; paddleSpeed = 700; }
        if (aiLevel === "NORMAL") { ballSpeedBase = 700; paddleSpeed = 800; }
        if (aiLevel === "HARD") { ballSpeedBase = 800; paddleSpeed = 900; }
    } else {
        ballSpeedBase = 650;
        paddleSpeed = 750;
    }
}

/* ================= RESET ================= */
function resetBall(dir) {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.speed = ballSpeedBase;
    ball.dx = dir;
    ball.dy = Math.random() * 1.2 - 0.6;
    spin = 0;
}

function resetGame() {
    paddleA.score = 0;
    paddleB.score = 0;
    paddleA.y = canvas.height / 2 - paddleH / 2;
    paddleB.x = canvas.width - paddleW - 40;
    paddleB.y = canvas.height / 2 - paddleH / 2;
    resetBall(Math.random() > 0.5 ? 1 : -1);
    matchOver = false;
}

/* ================= AI ================= */
function aiMove() {
    const target = ball.y - paddleH / 2;
    paddleB.vy = (target - paddleB.y) * 0.08;
    paddleB.y += paddleB.vy;
}

/* ================= MENU BUTTONS ================= */
const menuButtons = [
    { text: "SINGLE PLAYER", y: 360, color: "#ff3c3c", action: () => state = "AI_SELECT" },
    { text: "MULTIPLAYER", y: 430, color: "#3cff6f", action: () => {
        gameMode = "MULTI";
        applyDifficulty();
        resetGame();
        state = "GAME";
    }},
    { text: "SHOP", y: 500, color: "#3ca0ff", action: () => state = "SHOP" }
];

/* ================= ADS / MONETIZATION ================= */
// Rewarded ad
function showRewardedAd(onReward) {
    console.log("Showing rewarded ad...");
    setTimeout(() => {
        console.log("Ad finished");
        onReward();
    }, 2500); // simulate ad
}

// Interstitial ad
function showInterstitialAd() {
    console.log("Showing interstitial ad...");
    setTimeout(() => { console.log("Interstitial closed"); }, 2000);
}

// Grant coins from ad
function rewardCoins(amount = 50) {
    coins += amount;
    localStorage.setItem("coins", coins);
    console.log(`Coins rewarded: ${amount}. Total: ${coins}`);
}

/* ================= CLICK HANDLER ================= */
canvas.addEventListener("click", () => {
    if (state === "MENU") {
        menuButtons.forEach(b => {
            if (mouseY > b.y - 30 && mouseY < b.y + 30) b.action();
        });
    } else if (state === "AI_SELECT") {
        if (mouseY > 320 && mouseY < 370) aiLevel = "EASY";
        if (mouseY > 390 && mouseY < 440) aiLevel = "NORMAL";
        if (mouseY > 460 && mouseY < 510) aiLevel = "HARD";
        if (aiLevel) {
            gameMode = "AI";
            applyDifficulty();
            resetGame();
            state = "GAME";
        }
    } else if (state === "SHOP") {
        shopSkins.forEach((s, i) => {
            const sy = 260 + i * 60;
            if (mouseY > sy - 25 && mouseY < sy + 25) {
                if (!ownedSkins.includes(s.color)) {
                    if (coins >= s.price) {
                        coins -= s.price;
                        ownedSkins.push(s.color);
                        console.log(`Purchased skin: ${s.name}`);
                    } else {
                        showRewardedAd(() => rewardCoins(50));
                    }
                }
                paddleA.color = s.color;
            }
        });
        if (mouseY > 560 && mouseY < 610) state = "MENU";
    }
    // Restart button
    if (matchOver) {
        const btnY = canvas.height / 2 + 20;
        if (mouseX > canvas.width / 2 - 100 && mouseX < canvas.width / 2 + 100 &&
            mouseY > btnY - 30 && mouseY < btnY + 30) {
            matchOver = false;
            resetGame();
        }
    }
});

/* ================= MOBILE TOUCH CONTROLS ================= */
const isMobile = /Mobi|Android/i.test(navigator.userAgent);
let touchPaddleA = null, touchPaddleB = null;
if (isMobile) {
    canvas.addEventListener("touchstart", e => {
        e.preventDefault();
        for (let t of e.touches) {
            if (t.clientX < canvas.width / 2) touchPaddleA = t.identifier;
            else touchPaddleB = t.identifier;
        }
    });
    canvas.addEventListener("touchmove", e => {
        e.preventDefault();
        for (let t of e.touches) {
            if (t.identifier === touchPaddleA) paddleA.y = Math.max(0, Math.min(canvas.height - paddleH, t.clientY - paddleH / 2));
            if (t.identifier === touchPaddleB && gameMode !== "AI") paddleB.y = Math.max(0, Math.min(canvas.height - paddleH, t.clientY - paddleH / 2));
        }
    });
    canvas.addEventListener("touchend", e => {
        for (let t of e.changedTouches) {
            if (t.identifier === touchPaddleA) touchPaddleA = null;
            if (t.identifier === touchPaddleB) touchPaddleB = null;
        }
    });
}

/* ================= CONTROLLER SUPPORT ================= */
function handleGamepad() {
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    if (!gps) return;
    for (let gp of gps) {
        if (!gp) continue;
        paddleA.y += gp.axes[1] * paddleSpeed / 60;
        paddleA.y = Math.max(0, Math.min(canvas.height - paddleH, paddleA.y));
        if (gameMode !== "AI") {
            paddleB.y += gp.axes[3] * paddleSpeed / 60;
            paddleB.y = Math.max(0, Math.min(canvas.height - paddleH, paddleB.y));
        }
    }
}

/* ================= UPDATE ================= */
let lastTime = performance.now();
let gradientShift = 0;

function update(dt) {
    gradientShift += dt * 40;

    if (state === "LOGO") {
        logoTimer += dt;
        if (logoTimer >= LOGO_DURATION) state = "MENU";
        return;
    }

    if (!isMobile) handleGamepad();
    if (state !== "GAME" || matchOver) return;

    // Paddle movement
    paddleA.vy = 0;
    if (keys["w"]) paddleA.vy = -paddleSpeed * dt;
    if (keys["s"]) paddleA.vy = paddleSpeed * dt;
    paddleA.y += paddleA.vy;
    paddleA.y = Math.max(0, Math.min(canvas.height - paddleH, paddleA.y));

    if (gameMode === "AI") aiMove();
    else {
        paddleB.vy = 0;
        if (keys["ArrowUp"]) paddleB.vy = -paddleSpeed * dt;
        if (keys["ArrowDown"]) paddleB.vy = paddleSpeed * dt;
        paddleB.y += paddleB.vy;
    }
    paddleB.y = Math.max(0, Math.min(canvas.height - paddleH, paddleB.y));

    // Ball + curve
    ball.dy += spin * dt * 60;
    ball.dy = Math.max(-2.5, Math.min(2.5, ball.dy));
    spin *= SPIN_DECAY;
    ball.x += ball.dx * ball.speed * dt;
    ball.y += ball.dy * ball.speed * dt;

    // Wall collisions
    if (ball.y < ball.r || ball.y > canvas.height - ball.r) {
        ball.dy *= -1; spin *= -0.5; sounds.hit.play();
    }

    // Paddle collisions
    if (ball.x - ball.r < paddleA.x + paddleW && ball.y > paddleA.y && ball.y < paddleA.y + paddleH) {
        ball.dx = 1;
        spin = Math.max(-1, Math.min(1, paddleA.vy * SPIN_POWER));
        ball.speed = Math.min(ball.speed + 15, ballSpeedBase + 200);
        sounds.hit.play();
    }
    if (ball.x + ball.r > paddleB.x && ball.y > paddleB.y && ball.y < paddleB.y + paddleH) {
        ball.dx = -1;
        spin = Math.max(-1, Math.min(1, paddleB.vy * SPIN_POWER));
        ball.speed = Math.min(ball.speed + 15, ballSpeedBase + 200);
        sounds.hit.play();
    }

    // Scoring
    if (ball.x < 0) { paddleB.score++; coins += 5; sounds.goal.play(); resetBall(1); wallFlashColor = paddleB.color; wallFlashTimer = WALL_FLASH_DURATION; if (paddleB.score >= MAX_SCORE) matchOver = true; }
    if (ball.x > canvas.width) { paddleA.score++; coins += 5; sounds.goal.play(); resetBall(-1); wallFlashColor = paddleA.color; wallFlashTimer = WALL_FLASH_DURATION; if (paddleA.score >= MAX_SCORE) matchOver = true; }

    if (wallFlashTimer > 0) { wallFlashTimer -= dt; if (wallFlashTimer <= 0) wallFlashColor = null; }

    localStorage.setItem("coins", coins);
    localStorage.setItem("ownedSkins", JSON.stringify(ownedSkins));
    localStorage.setItem("bestScore", bestScore);
}

/* ================= DRAW ================= */
function drawBackground() {
    const g = ctx.createLinearGradient(0, gradientShift, canvas.width, canvas.height);
    g.addColorStop(0, "#0f2027"); g.addColorStop(0.5, "#203a43"); g.addColorStop(1, "#2c5364");
    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function draw() {
    if (state !== "GAME") drawBackground(); else ctx.fillStyle = "black", ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = "center";

    if (state === "LOGO") {
        ctx.font = "bold 110px Arial";
        ctx.shadowColor = "#00f6ff";
        ctx.shadowBlur = 30;
        ctx.fillStyle = "white";
        ctx.fillText("POMS", canvas.width / 2, canvas.height / 2);
        ctx.shadowBlur = 0;
        return;
    }

    if (state === "MENU") {
        ctx.font = "52px Arial"; ctx.fillStyle = "white"; ctx.fillText("AIR HOCKEY", canvas.width / 2, 220);
        menuButtons.forEach(b => {
            const hover = mouseY > b.y - 30 && mouseY < b.y + 30;
            ctx.fillStyle = b.color;
            ctx.shadowColor = hover ? b.color : "transparent";
            ctx.shadowBlur = hover ? 20 : 0;
            ctx.fillText(b.text, canvas.width / 2, b.y);
            ctx.shadowBlur = 0;
        });
        return;
    }

    if (state === "AI_SELECT") {
        ctx.font = "42px Arial"; ctx.fillStyle = "white";
        ctx.fillText("SELECT DIFFICULTY", canvas.width / 2, 240);
        ctx.fillText("EASY", canvas.width / 2, 350);
        ctx.fillText("NORMAL", canvas.width / 2, 420);
        ctx.fillText("HARD", canvas.width / 2, 490);
        return;
    }

    if (state === "SHOP") {
        ctx.font = "36px Arial"; ctx.fillText(`SHOP (Coins: ${coins})`, canvas.width / 2, 180);
        shopSkins.forEach((s, i) => { ctx.fillStyle = s.color; ctx.fillText(`${s.name} - ${s.price}`, canvas.width / 2, 260 + i * 60); });
        ctx.fillStyle = "white"; ctx.fillText("BACK", canvas.width / 2, 590);
        return;
    }

    // Walls
    ctx.fillStyle = wallFlashColor || WALL_DEFAULT_COLOR;
    ctx.fillRect(0, 0, 18, canvas.height);
    ctx.fillRect(canvas.width - 18, 0, 18, canvas.height);

    // Paddles
    ctx.fillStyle = paddleA.color; ctx.fillRect(paddleA.x, paddleA.y, paddleW, paddleH);
    ctx.fillStyle = paddleB.color; ctx.fillRect(paddleB.x, paddleB.y, paddleW, paddleH);

    // Ball
    ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fillStyle = "white"; ctx.fill();

    // Scores
    ctx.font = "30px Arial"; ctx.fillStyle = "white";
    ctx.fillText(paddleA.score, canvas.width / 4, 40);
    ctx.fillText(paddleB.score, canvas.width * 3 / 4, 40);

    // Restart button
    if (matchOver) {
        ctx.font = "48px Arial"; ctx.fillStyle = "yellow"; ctx.fillText("MATCH OVER!", canvas.width / 2, canvas.height / 2 - 50);
        const btnY = canvas.height / 2 + 20;
        ctx.fillStyle = "#ff3c3c"; ctx.fillRect(canvas.width / 2 - 100, btnY - 30, 200, 60);
        ctx.fillStyle = "white"; ctx.font = "32px Arial"; ctx.fillText("RESTART", canvas.width / 2, btnY + 10);
    }
}

/* ================= LOOP ================= */
function loop(t) {
    const dt = Math.min((t - lastTime) / 1000, 0.02);
    lastTime = t;
    update(dt);
    draw();
    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

























