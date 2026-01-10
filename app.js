function startGame(mode) {
    localStorage.setItem("mode", mode);
    window.location.href = "game.html";
}

const startBtn = document.getElementById("startBtn");

startBtn.addEventListener("click", () => {
    alert("Game will start soon!");
    
    // Later you can redirect to your game page:
    //window.location.href = "game.html";
});
