// Obtener el canvas y su contexto (solo se ejecuta en juego.html)
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Cargar imagen de la nave del jugador según la skin elegida en el lobby
const spaceshipImg = new Image();
const selectedSkin = localStorage.getItem("selectedSkin");
spaceshipImg.src = selectedSkin ? selectedSkin : "nave_buena.png";

// Cargar imágenes para la nave enemiga (usaremos la misma imagen para todos, pero se podría ampliar)
const alienImg = new Image();
alienImg.src = "nave_mala.webp";

// Cargar el gif de explosión para cuando se impacte
const explosionSprite = new Image();
explosionSprite.src = "explosion.gif";

// Cargar la imagen de corazón para mostrar vidas
const heartImg = new Image();
heartImg.src = "corazon.webp";

// Cargar sonidos
const gunSound = new Audio('gun.mp3');
const explosionSound = new Audio('explosion.mp3');

// Propiedades de la nave del jugador (se añade energía para el escudo)
const spaceship = {
  x: canvas.width / 2 - 15,
  y: canvas.height - 40,
  width: 30,
  height: 30,
  speed: 5,
  dx: 0,
  exploding: false,
  explosionTimer: 0,
  energy: 100  // Escudo/energía máximo 100
};

// Variable para upgrade desbloqueable (no se usa en este cambio, pero se conserva)
let unlockedUpgrade = false;

// Balas disparadas por el jugador
const bullets = [];
const bulletSpeed = 7;
const bulletWidth = 4;
const bulletHeight = 10;

// Variables de niveles, enemigos y score
let level = 1;
let score = 0;
const alienCols = 8;
const alienPadding = 10;
const alienOffsetTop = 30;
const alienOffsetLeft = 30;
let alienDirection = 1; // 1: derecha, -1: izquierda
const baseAlienSpeed = 1;
let alienSpeed = baseAlienSpeed + (level - 1) * 0.5;
const alienDrop = 20;
let aliens = [];

// Variables para el sistema de vidas
let lives = 3;

// Array para proyectiles de los enemigos
const enemyBullets = [];
const enemyBulletSpeed = 4;
const enemyBulletWidth = 4;
const enemyBulletHeight = 10;

// Temporizador para que los enemigos disparen
let enemyShootTimer = 0;
const enemyShootInterval = 100; // cada 100 frames (ajustable)

// Arreglo para pop-ups de puntuación
let scorePopups = [];

// Variables para control de estado del juego
let paused = false;
let gameOverFlag = false;
let victoryFlag = false;

/* Función para obtener las propiedades según el tipo de enemigo */
function getEnemyProperties(type) {
  switch (type) {
    case "normal":
      return { width: 30, height: 30, hitPoints: 1, speedMultiplier: 1.0 };
    case "fast":
      return { width: 30, height: 30, hitPoints: 1, speedMultiplier: 1.5 };
    case "resistant":
      return { width: 30, height: 30, hitPoints: 2, speedMultiplier: 1.0 };
    case "burst":
      return { width: 30, height: 30, hitPoints: 1, speedMultiplier: 1.0, burst: true };
    case "boss":
      return { width: 100, height: 100, hitPoints: 10, speedMultiplier: 0.5 };
    default:
      return { width: 30, height: 30, hitPoints: 1, speedMultiplier: 1.0 };
  }
}

/* Función para crear un enemigo con tipo dado */
function createEnemy(x, y, type) {
  const props = getEnemyProperties(type);
  return {
    x,
    y,
    width: props.width,
    height: props.height,
    type: type,
    hitPoints: props.hitPoints,
    maxHitPoints: props.hitPoints,  // Valor máximo de vida para el boss (y otros enemigos)
    speedMultiplier: props.speedMultiplier,
    burst: props.burst || false,
    exploding: false,
    explosionTimer: 0
  };
}

/* Función para crear enemigos en nivel normal o jefe */
function createAliens() {
  aliens = [];
  // Si el nivel es múltiplo de 5, se crea un jefe
  if (level % 5 === 0) {
    const bossProps = getEnemyProperties("boss");
    const boss = {
      x: canvas.width / 2 - bossProps.width / 2,
      y: alienOffsetTop,
      width: bossProps.width,
      height: bossProps.height,
      type: "boss",
      hitPoints: bossProps.hitPoints,
      maxHitPoints: bossProps.hitPoints,
      speedMultiplier: bossProps.speedMultiplier,
      exploding: false,
      explosionTimer: 0
    };
    aliens.push(boss);
  } else {
    const rows = Math.min(3 + level, 6);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < alienCols; col++) {
        const x = alienOffsetLeft + col * (30 + alienPadding);
        const y = alienOffsetTop + row * (30 + alienPadding);
        const rand = Math.random();
        let type = "normal";
        if (rand < 0.1) {
          type = "burst";
        } else if (rand < 0.3) {
          type = "resistant";
        } else if (rand < 0.5) {
          type = "fast";
        }
        aliens.push(createEnemy(x, y, type));
      }
    }
  }
}

/* Función para pasar al siguiente nivel */
function nextLevel() {
  level++;
  alienSpeed = baseAlienSpeed + (level - 1) * 0.5;
  createAliens();
  enemyShootTimer = 0;
}

/* SISTEMA DE SCORE POPUPS */
function addScorePopup(x, y, text) {
  scorePopups.push({
    x: x,
    y: y,
    text: text,
    alpha: 1,
    dy: -1
  });
}

function updateScorePopups() {
  for (let i = scorePopups.length - 1; i >= 0; i--) {
    let sp = scorePopups[i];
    sp.y += sp.dy;
    sp.alpha -= 0.02;
    if (sp.alpha <= 0) {
      scorePopups.splice(i, 1);
    }
  }
}

function drawScorePopups() {
  scorePopups.forEach(sp => {
    ctx.save();
    ctx.globalAlpha = sp.alpha;
    ctx.fillStyle = "yellow";
    ctx.font = "18px Orbitron, sans-serif";
    ctx.fillText(sp.text, sp.x, sp.y);
    ctx.restore();
  });
}

/* Función para dibujar la barra de vida del boss */
function drawBossLifeBar() {
  // Buscar un enemigo de tipo "boss" que aún no esté explotando
  const boss = aliens.find(enemy => enemy.type === "boss" && !enemy.exploding);
  if (boss) {
    const barWidth = 300;
    const barHeight = 20;
    // Posicionar la barra en el centro, a 10px del borde inferior
    const x = (canvas.width - barWidth) / 2;
    const y = canvas.height - barHeight - 10;
    ctx.strokeStyle = "red";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, barWidth, barHeight);
    // Rellenar la barra en función de la vida restante
    const fillWidth = (boss.hitPoints / boss.maxHitPoints) * barWidth;
    ctx.fillStyle = "green";
    ctx.fillRect(x, y, fillWidth, barHeight);
    // Dibujar el texto de la vida del boss encima de la barra
    ctx.fillStyle = "white";
    ctx.font = "16px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Boss HP: " + boss.hitPoints + " / " + boss.maxHitPoints, canvas.width / 2, y + barHeight - 3);
  }
}


/* Dibuja la nave del jugador */
function drawSpaceship() {
  ctx.save();
  ctx.shadowBlur = 20;
  ctx.shadowColor = "cyan";
  if (spaceship.exploding) {
    ctx.drawImage(explosionSprite, spaceship.x, spaceship.y, spaceship.width, spaceship.height);
  } else {
    ctx.drawImage(spaceshipImg, spaceship.x, spaceship.y, spaceship.width, spaceship.height);
  }
  ctx.restore();
}

/* Dibuja las balas del jugador */
function drawBullets() {
  ctx.save();
  ctx.shadowBlur = 15;
  ctx.shadowColor = "red";
  ctx.fillStyle = "red";
  bullets.forEach(bullet => {
    ctx.fillRect(bullet.x, bullet.y, bulletWidth, bulletHeight);
  });
  ctx.restore();
}

/* Dibuja los enemigos */
function drawAliens() {
  ctx.save();
  ctx.shadowBlur = 20;
  ctx.shadowColor = "lime";
  aliens.forEach(enemy => {
    if (enemy.exploding) {
      ctx.drawImage(explosionSprite, enemy.x, enemy.y, enemy.width, enemy.height);
    } else {
      ctx.drawImage(alienImg, enemy.x, enemy.y, enemy.width, enemy.height);
    }
  });
  ctx.restore();
}

/* Dibuja los proyectiles de los enemigos */
function drawEnemyBullets() {
  ctx.save();
  ctx.fillStyle = "green";
  ctx.shadowColor = "lime";
  enemyBullets.forEach(bullet => {
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  });
  ctx.restore();
}

/* Mueve la nave del jugador */
function moveSpaceship() {
  spaceship.x += spaceship.dx;
  if (spaceship.x < 0) spaceship.x = 0;
  if (spaceship.x + spaceship.width > canvas.width)
    spaceship.x = canvas.width - spaceship.width;
}

/* Mueve las balas del jugador */
function moveBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].y -= bulletSpeed;
    if (bullets[i].y < 0) {
      bullets.splice(i, 1);
    }
  }
}

/* Mueve los enemigos aplicando su multiplicador de velocidad */
function moveAliens() {
  let hitEdge = false;
  aliens.forEach(enemy => {
    if (!enemy.exploding) {
      enemy.x += alienSpeed * enemy.speedMultiplier * alienDirection;
      if (enemy.x + enemy.width > canvas.width || enemy.x < 0) {
        hitEdge = true;
      }
    }
  });
  if (hitEdge) {
    alienDirection *= -1;
    aliens.forEach(enemy => {
      enemy.y += alienDrop;
    });
  }
}

/* Mueve los proyectiles de los enemigos */
function moveEnemyBullets() {
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    enemyBullets[i].y += enemyBulletSpeed;
    if (enemyBullets[i].y > canvas.height) {
      enemyBullets.splice(i, 1);
    }
  }
}

/* Comprueba colisiones entre las balas del jugador y los enemigos */
function collisionDetection() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    for (let j = aliens.length - 1; j >= 0; j--) {
      const enemy = aliens[j];
      if (!enemy.exploding &&
          bullets[i].x < enemy.x + enemy.width &&
          bullets[i].x + bulletWidth > enemy.x &&
          bullets[i].y < enemy.y + enemy.height &&
          bullets[i].y + bulletHeight > enemy.y) {
        enemy.hitPoints--;
        if (enemy.hitPoints <= 0) {
          enemy.exploding = true;
          enemy.explosionTimer = 15;
          addScorePopup(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, "+10");
          score += 10;
          explosionSound.currentTime = 0;
          explosionSound.play();
        }
        bullets.splice(i, 1);
        break;
      }
    }
  }
}

/* Comprueba colisiones entre proyectiles enemigos y la nave del jugador */
function checkEnemyBulletCollision() {
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    if (
      enemyBullets[i].x < spaceship.x + spaceship.width &&
      enemyBullets[i].x + enemyBullets[i].width > spaceship.x &&
      enemyBullets[i].y < spaceship.y + spaceship.height &&
      enemyBullets[i].y + enemyBullets[i].height > spaceship.y
    ) {
      enemyBullets.splice(i, 1);
      spaceship.energy -= 20;
      explosionSound.currentTime = 0;
      explosionSound.play();
      spaceship.exploding = true;
      spaceship.explosionTimer = 15;
      if (spaceship.energy <= 0) {
        lives--;
        spaceship.energy = 100;
      }
    }
  }
}

/* Comprueba condición de fin de juego */
function checkGameOver() {
  if (lives <= 0) return true;
  for (let enemy of aliens) {
    if (enemy.y + enemy.height >= spaceship.y) {
      return true;
    }
  }
  return false;
}

/* Dibuja el HUD: nivel, score, vidas y medidor de energía */
function drawHUD() {
  ctx.save();
  ctx.fillStyle = "cyan";
  ctx.font = "20px Orbitron, sans-serif";
  ctx.fillText("Lv: " + level, 50, 30);
  ctx.fillText("Sc: " + score, 50, 60);
  const heartWidth = 20;
  const heartHeight = 20;
  const spacing = 5;
  for (let i = 0; i < lives; i++) {
    ctx.drawImage(heartImg, canvas.width - (heartWidth + spacing) * (i + 1), 10, heartWidth, heartHeight);
  }
  const barX = 10, barY = 80, barWidth = 150, barHeight = 15;
  ctx.strokeStyle = "cyan";
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, barWidth, barHeight);
  ctx.fillStyle = "cyan";
  const energyWidth = (spaceship.energy / 100) * barWidth;
  ctx.fillRect(barX, barY, energyWidth, barHeight);
  ctx.restore();
}

/* Dibuja la barra de vida del boss */
function drawBossLifeBar() {
  const boss = aliens.find(enemy => enemy.type === "boss" && !enemy.exploding);
  if (boss) {
    const barWidth = 300;
    const barHeight = 20; 
    const x = (canvas.width - barWidth) / 2;
    const y = 10;
    ctx.strokeStyle = "red";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, barWidth, barHeight);
    const fillWidth = (boss.hitPoints / boss.maxHitPoints) * barWidth;
    ctx.fillStyle = "green";
    ctx.fillRect(x, y, fillWidth, barHeight);
    ctx.fillStyle = "white";
    ctx.font = "16px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Boss HP: " + boss.hitPoints + " / " + boss.maxHitPoints, canvas.width / 2, y + barHeight - 3);
  }
}

/* Dibuja overlay de pausa */
function drawPauseOverlay() {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.font = "40px Orbitron, sans-serif";
  ctx.fillText("PAUSA", canvas.width / 2 - 70, canvas.height / 2);
  ctx.restore();
}

/* Bucle principal del juego */
function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  if (score >= 1000 && !unlockedUpgrade) {
    spaceshipImg.src = "nave_upgraded.png";
    unlockedUpgrade = true;
    addScorePopup(spaceship.x, spaceship.y, "¡Upgrade!");
  }
  
  if (spaceship.exploding) {
    spaceship.explosionTimer--;
    if (spaceship.explosionTimer <= 0) {
      spaceship.exploding = false;
    }
  }
  
  if (!paused && !gameOverFlag && !victoryFlag) {
    moveSpaceship();
    moveBullets();
    moveAliens();
    collisionDetection();
    if (level >= 2 && aliens.length > 0) {
      enemyShootTimer++;
      if (enemyShootTimer >= enemyShootInterval) {
        enemyShootTimer = 0;
        const potenciales = aliens.filter(enemy => !enemy.exploding);
        if (potenciales.length > 0) {
          const shooter = potenciales[Math.floor(Math.random() * potenciales.length)];
          if (shooter.type === "burst") {
            for (let i = -1; i <= 1; i++) {
              enemyBullets.push({
                x: shooter.x + shooter.width / 2 - enemyBulletWidth / 2 + i * 5,
                y: shooter.y + shooter.height,
                width: enemyBulletWidth,
                height: enemyBulletHeight
              });
            }
          } else {
            enemyBullets.push({
              x: shooter.x + shooter.width / 2 - enemyBulletWidth / 2,
              y: shooter.y + shooter.height,
              width: enemyBulletWidth,
              height: enemyBulletHeight
            });
          }
        }
      }
    }
    
    moveEnemyBullets();
    checkEnemyBulletCollision();
  }
  
  for (let i = aliens.length - 1; i >= 0; i--) {
    if (aliens[i].exploding) {
      aliens[i].explosionTimer--;
      if (aliens[i].explosionTimer <= 0) {
        aliens.splice(i, 1);
      }
    }
  }
  
  drawSpaceship();
  drawBullets();
  drawEnemyBullets();
  drawAliens();
  drawHUD();
  drawBossLifeBar(); // Dibujar la barra de vida del boss, si existe
  updateScorePopups();
  drawScorePopups();
  
  if (paused) {
    drawPauseOverlay();
  }
  
  if (checkGameOver()) {
    gameOverFlag = true;
    showEndScreen("GAME OVER");
    return;
  }
  
  if (aliens.length === 0) {
    if (level % 5 === 0) {
      victoryFlag = true;
      showEndScreen("¡VICTORIA!");
      return;
    } else {
      nextLevel();
    }
  }
  
  requestAnimationFrame(update);
}

// Mostrar overlay final de partida
function showEndScreen(message) {
  const endScreen = document.getElementById("endScreen");
  const endMessage = document.getElementById("endMessage");
  endMessage.innerText = message;
  endScreen.classList.remove("hidden");
}

// Manejo de eventos del teclado para controlar la nave
function keyDown(e) {
  if (e.key === "ArrowRight" || e.key === "d") {
    spaceship.dx = spaceship.speed;
  } else if (e.key === "ArrowLeft" || e.key === "a") {
    spaceship.dx = -spaceship.speed;
  } else if (e.key === " ") {
    gunSound.currentTime = 0;
    gunSound.play();
    bullets.push({
      x: spaceship.x + spaceship.width / 2 - bulletWidth / 2,
      y: spaceship.y
    });
  } else if (e.key === "p" || e.key === "P") {
    togglePause();
  }
}

function keyUp(e) {
  if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "a" || e.key === "d") {
    spaceship.dx = 0;
  }
}

document.addEventListener("keydown", keyDown);
document.addEventListener("keyup", keyUp);

function setupTouchControls() {
  const touchLeft = document.getElementById("touchLeft");
  const touchRight = document.getElementById("touchRight");
  const touchFire = document.getElementById("touchFire");

  touchLeft.addEventListener("touchstart", function(e) {
    e.preventDefault();
    spaceship.dx = -spaceship.speed;
  });
  touchLeft.addEventListener("touchend", function(e) {
    e.preventDefault();
    spaceship.dx = 0;
  });

  touchRight.addEventListener("touchstart", function(e) {
    e.preventDefault();
    spaceship.dx = spaceship.speed;
  });
  touchRight.addEventListener("touchend", function(e) {
    e.preventDefault();
    spaceship.dx = 0;
  });

  touchFire.addEventListener("touchstart", function(e) {
    e.preventDefault();
    gunSound.currentTime = 0;
    gunSound.play();
    bullets.push({
      x: spaceship.x + spaceship.width / 2 - bulletWidth / 2,
      y: spaceship.y
    });
  });
}

function togglePause() {
  paused = !paused;
  const pauseScreen = document.getElementById("pauseScreen");
  if (paused) {
    pauseScreen.classList.remove("hidden");
  } else {
    pauseScreen.classList.add("hidden");
  }
}

createAliens();
setupTouchControls();
update();
