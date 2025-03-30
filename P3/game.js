// Obtener el canvas y su contexto (solo se ejecuta en juego.html)
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Cargar imagen de la nave del jugador según la skin elegida en el lobby
const spaceshipImg = new Image();
const selectedSkin = localStorage.getItem("selectedSkin");
spaceshipImg.src = selectedSkin ? selectedSkin : "nave_buena.png";


// Cargar imágenes para la nave enemiga
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

// Propiedades de la nave del jugador
const spaceship = {
  x: canvas.width / 2 - 15,
  y: canvas.height - 40,
  width: 30,
  height: 30,
  speed: 5,
  dx: 0,
  exploding: false,
  explosionTimer: 0
};




// Balas disparadas por el jugador
const bullets = [];
const bulletSpeed = 7;
const bulletWidth = 4;
const bulletHeight = 10;

// Variables de niveles, enemigos y score
let level = 1;
let score = 0;
const alienCols = 8;
const alienWidth = 30;
const alienHeight = 30;
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

// Función para crear la cuadrícula de enemigos
function createAliens() {
  aliens = [];
  const rows = Math.min(3 + level, 6);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < alienCols; col++) {
      const x = alienOffsetLeft + col * (alienWidth + alienPadding);
      const y = alienOffsetTop + row * (alienHeight + alienPadding);
      // Cada enemigo tiene propiedades para explosion
      aliens.push({ 
        x, 
        y, 
        width: alienWidth, 
        height: alienHeight, 
        exploding: false, 
        explosionTimer: 0 
      });
    }
  }
}

// Función para pasar al siguiente nivel
function nextLevel() {
  level++;
  alienSpeed = baseAlienSpeed + (level - 1) * 0.5;
  createAliens();
  enemyShootTimer = 0; // reiniciamos el temporizador
}

// SISTEMA DE SCORE POPUPS
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

// Dibuja la nave del jugador. Si está en modo "exploding", dibuja el gif de explosión.
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

// Dibuja las balas disparadas por el jugador
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

// Dibuja los enemigos. Si están explotando, se dibuja el gif de explosión.
function drawAliens() {
  ctx.save();
  ctx.shadowBlur = 20;
  ctx.shadowColor = "lime";
  aliens.forEach(alien => {
    if (alien.exploding) {
      ctx.drawImage(explosionSprite, alien.x, alien.y, alien.width, alien.height);
    } else {
      ctx.drawImage(alienImg, alien.x, alien.y, alien.width, alien.height);
    }
  });
  ctx.restore();
}

// Dibuja los proyectiles disparados por los enemigos
function drawEnemyBullets() {
  ctx.save();
  ctx.fillStyle = "green";
  ctx.shadowColor = "lime";
  enemyBullets.forEach(bullet => {
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  });
  ctx.restore();
}

// Mueve la nave del jugador
function moveSpaceship() {
  spaceship.x += spaceship.dx;
  if (spaceship.x < 0) spaceship.x = 0;
  if (spaceship.x + spaceship.width > canvas.width)
    spaceship.x = canvas.width - spaceship.width;
}

// Mueve las balas del jugador
function moveBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].y -= bulletSpeed;
    if (bullets[i].y < 0) {
      bullets.splice(i, 1);
    }
  }
}

// Mueve los enemigos y hace que cambien de dirección al llegar a un borde
function moveAliens() {
  let hitEdge = false;
  aliens.forEach(alien => {
    // Solo mover si no está explotando
    if (!alien.exploding) {
      alien.x += alienSpeed * alienDirection;
      if (alien.x + alien.width > canvas.width || alien.x < 0) {
        hitEdge = true;
      }
    }
  });
  if (hitEdge) {
    alienDirection *= -1;
    aliens.forEach(alien => {
      alien.y += alienDrop;
    });
  }
}

// Mueve los proyectiles enemigos
function moveEnemyBullets() {
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    enemyBullets[i].y += enemyBulletSpeed;
    if (enemyBullets[i].y > canvas.height) {
      enemyBullets.splice(i, 1);
    }
  }
}

// Comprueba colisiones entre las balas del jugador y los enemigos
function collisionDetection() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    for (let j = aliens.length - 1; j >= 0; j--) {
      if (!aliens[j].exploding &&
          bullets[i].x < aliens[j].x + aliens[j].width &&
          bullets[i].x + bulletWidth > aliens[j].x &&
          bullets[i].y < aliens[j].y + aliens[j].height &&
          bullets[i].y + bulletHeight > aliens[j].y) {
        // Marcar al enemigo como explotando y establecer un timer
        aliens[j].exploding = true;
        aliens[j].explosionTimer = 15; // 15 frames de explosión
        addScorePopup(aliens[j].x + aliens[j].width / 2, aliens[j].y + aliens[j].height / 2, "+10");
        score += 10;
        // Reproducir sonido de explosión
        explosionSound.currentTime = 0;
        explosionSound.play();
        bullets.splice(i, 1);
        break;
      }
    }
  }
}

// Comprueba colisiones entre los proyectiles enemigos y la nave del jugador
function checkEnemyBulletCollision() {
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    if (
      enemyBullets[i].x < spaceship.x + spaceship.width &&
      enemyBullets[i].x + enemyBullets[i].width > spaceship.x &&
      enemyBullets[i].y < spaceship.y + spaceship.height &&
      enemyBullets[i].y + enemyBullets[i].height > spaceship.y
    ) {
      enemyBullets.splice(i, 1);
      lives--; // Se pierde una vida
      
      // Mostrar explosión en la nave del jugador y reproducir sonido
      spaceship.exploding = true;
      spaceship.explosionTimer = 15; // mostrar gif por 15 frames
      explosionSound.currentTime = 0;
      explosionSound.play();
    }
  }
}

// Comprueba condición de fin de juego: si se quedan sin vidas o si un enemigo llega al jugador
function checkGameOver() {
  if (lives <= 0) return true;
  for (let alien of aliens) {
    if (alien.y + alien.height >= spaceship.y) {
      return true;
    }
  }
  return false;
}

// Dibuja el HUD: muestra nivel, score y las vidas restantes usando la imagen 'corazon.png'
function drawHUD() {
  ctx.save();
  ctx.fillStyle = "cyan";
  ctx.font = "20px Orbitron, sans-serif";
  ctx.fillText("Nivel: " + level, 10, 30);
  ctx.fillText("Score: " + score, 10, 60);
  // Dibujar vidas en la esquina superior derecha
  const heartWidth = 20;
  const heartHeight = 20;
  const spacing = 5;
  for (let i = 0; i < lives; i++) {
    ctx.drawImage(heartImg, canvas.width - (heartWidth + spacing) * (i + 1), 10, heartWidth, heartHeight);
  }
  ctx.restore();
}

// Dibuja un overlay de pausa
function drawPauseOverlay() {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.font = "40px Orbitron, sans-serif";
  ctx.fillText("PAUSA", canvas.width / 2 - 70, canvas.height / 2);
  ctx.restore();
}

// Bucle principal del juego
function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Actualizar el timer de explosión de la nave del jugador si está en modo "exploding"
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
    
    // Lógica de disparo enemigo: a partir del nivel 2, periódicamente un enemigo dispara
    if (level >= 2 && aliens.length > 0) {
      enemyShootTimer++;
      if (enemyShootTimer >= enemyShootInterval) {
        enemyShootTimer = 0;
        // Elegir aleatoriamente un enemigo que no esté explotando
        let potenciales = aliens.filter(alien => !alien.exploding);
        if (potenciales.length > 0) {
          let shooter = potenciales[Math.floor(Math.random() * potenciales.length)];
          enemyBullets.push({
            x: shooter.x + shooter.width / 2 - enemyBulletWidth / 2,
            y: shooter.y + shooter.height,
            width: enemyBulletWidth,
            height: enemyBulletHeight
          });
          // Opcional: podrías reproducir un sonido de disparo para enemigos si lo deseas
        }
      }
    }
    
    moveEnemyBullets();
    checkEnemyBulletCollision();
  }
  
  // Actualizar timer de explosión en enemigos
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
    // Se considera victoria al completar 5 rondas (nivel 5 finalizado)
    if (level === 5) {
      victoryFlag = true;
      showEndScreen("¡VICTORIA!");
      return;
    } else {
      nextLevel();
    }
  }
  
  requestAnimationFrame(update);
}

// Función para mostrar el overlay final de partida
function showEndScreen(message) {
  const endScreen = document.getElementById("endScreen");
  const endMessage = document.getElementById("endMessage");
  endMessage.innerText = message;
  endScreen.classList.remove("hidden");
}

// Manejo de eventos del teclado para controlar la nave y disparar
function keyDown(e) {
  if (e.key === "ArrowRight" || e.key === "d") {
    spaceship.dx = spaceship.speed;
  } else if (e.key === "ArrowLeft" || e.key === "a") {
    spaceship.dx = -spaceship.speed;
  } else if (e.key === " ") {
    // Reproducir sonido de disparo y disparar
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
  if (
    e.key === "ArrowRight" ||
    e.key === "ArrowLeft" ||
    e.key === "a" ||
    e.key === "d"
  ) {
    spaceship.dx = 0;
  }
}

document.addEventListener("keydown", keyDown);
document.addEventListener("keyup", keyUp);

// Funciones para controles táctiles (dispositivos móviles)
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
    // Reproducir sonido de disparo al tocar
    gunSound.currentTime = 0;
    gunSound.play();
    bullets.push({
      x: spaceship.x + spaceship.width / 2 - bulletWidth / 2,
      y: spaceship.y
    });
  });
}

// Función para alternar pausa
function togglePause() {
  paused = !paused;
  const pauseScreen = document.getElementById("pauseScreen");
  if (paused) {
    pauseScreen.classList.remove("hidden");
  } else {
    pauseScreen.classList.add("hidden");
  }
}



// Inicializar la cuadrícula de enemigos, controles táctiles y comenzar el juego
createAliens();
setupTouchControls();
update();


