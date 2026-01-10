const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

/* ======================
   GAME CONSTANTS
====================== */
const WIDTH = 1;
const HEIGHT = 1;
const PADDLE_HEIGHT = 0.2;
const BALL_RADIUS = 0.02;
const BASE_SPEED = 0.5;
const SPEED_INCREMENT = 0.05;

/* ======================
   GAME STATE
====================== */
let players = [];

let gameState = {
    ball: {
        x: 0.5,
        y: 0.5,
        vx: BASE_SPEED,
        vy: BASE_SPEED * 0.6,
        speed: 1
    },
    paddles: [0.5, 0.5],
    scores: [0, 0]
};

/* ======================
   RESET BALL
====================== */
function resetBall(scoredBy) {
    gameState.ball.x = 0.5;
    gameState.ball.y = 0.5;

    const dir = scoredBy === 0 ? 1 : -1;
    gameState.ball.vx = BASE_SPEED * dir;
    gameState.ball.vy = (Math.random() - 0.5) * BASE_SPEED;

    gameState.ball.speed += SPEED_INCREMENT;
}

/* ======================
   COLLISION CHECK
====================== */
function paddleCollision(px, py) {
    return (
        Math.abs(gameState.ball.x - px) < BALL_RADIUS &&
        Math.abs(gameState.ball.y - py) < PADDLE_HEIGHT / 2
    );
}

/* ======================
   CONNECTION HANDLER
====================== */
wss.on("connection", ws => {
    if (players.length >= 2) {
        ws.close();
        return;
    }

    const id = players.length;
    players.push(ws);

    ws.send(JSON.stringify({
        type: "init",
        id
    }));

    ws.on("message", msg => {
        const data = JSON.parse(msg);
        if (data.type === "move") {
            gameState.paddles[id] = Math.max(
                PADDLE_HEIGHT / 2,
                Math.min(HEIGHT - PADDLE_HEIGHT / 2, data.y)
            );
        }
    });

    ws.on("close", () => {
        players = [];
        gameState.scores = [0, 0];
        gameState.ball.speed = 1;
        resetBall(0);
    });
});

/* ======================
   MAIN GAME LOOP (60 FPS)
====================== */
setInterval(() => {
    const ball = gameState.ball;

    ball.x += ball.vx * ball.speed * 0.016;
    ball.y += ball.vy * ball.speed * 0.016;

    /* WALL COLLISION */
    if (ball.y < BALL_RADIUS || ball.y > HEIGHT - BALL_RADIUS) {
        ball.vy *= -1;
    }

    /* PADDLE COLLISION */
    if (ball.x < 0.05 && paddleCollision(0.03, gameState.paddles[0])) {
        ball.vx = Math.abs(ball.vx);
    }

    if (ball.x > 0.95 && paddleCollision(0.97, gameState.paddles[1])) {
        ball.vx = -Math.abs(ball.vx);
    }

    /* GOALS */
    if (ball.x < 0) {
        gameState.scores[1]++;
        resetBall(1);
    }

    if (ball.x > WIDTH) {
        gameState.scores[0]++;
        resetBall(0);
    }

    /* SEND STATE */
    players.forEach(p => {
        if (p.readyState === WebSocket.OPEN) {
            p.send(JSON.stringify({
                type: "state",
                gameState
            }));
        }
    });

}, 1000 / 60);

console.log("✅ Air Hockey Server running at ws://localhost:8080");

