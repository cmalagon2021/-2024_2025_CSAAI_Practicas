// Variables globales para el juego
let secretCode = [];
let revealed = [false, false, false, false];
let attemptsRemaining = 10;
let gameStarted = false;

// Referencias a elementos del DOM
const secretKeyDiv = document.getElementById("secretKey");
const attemptsDiv = document.getElementById("attempts");
const timerDiv = document.getElementById("timer");
const digitButtons = document.querySelectorAll(".digit-btn");
const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");
const resetBtn = document.getElementById("reset");

// Instancia del cronómetro (usando el fichero crono.js)
const crono = new Crono(timerDiv);

// Función para generar la clave secreta (4 dígitos aleatorios)
function generateSecretCode() {
  secretCode = [];
  revealed = [false, false, false, false];
  for (let i = 0; i < 4; i++) {
    secretCode.push(Math.floor(Math.random() * 10)); // número del 0 al 9
  }
  console.log("Clave secreta (para depuración):", secretCode);
  // Reiniciamos la visualización de la clave (oculta)
  const spans = secretKeyDiv.querySelectorAll(".digit");
  spans.forEach(span => {
    span.textContent = "*";
    span.classList.remove("revealed-digit");
    span.classList.add("hidden-digit");
  });
}

// Actualizar el número de intentos restantes
function updateAttempts() {
  attemptsDiv.textContent = `Intentos restantes: ${attemptsRemaining}`;
}

// Comprobar si se han revelado todos los dígitos
function isGameWon() {
  return revealed.every(val => val === true);
}

/* Funciones para mostrar/ocultar el mensaje modal */
function showMessage(title, text) {
  const messageModal = document.getElementById("messageModal");
  const messageTitle = document.getElementById("messageTitle");
  const messageText = document.getElementById("messageText");
  
  messageTitle.textContent = title;
  messageText.textContent = text;
  
  messageModal.classList.add("active");
}

function hideMessage() {
  const messageModal = document.getElementById("messageModal");
  messageModal.classList.remove("active");
}

// Event listener para cerrar el mensaje
const closeMessageBtn = document.getElementById("closeMessage");
if (closeMessageBtn) {
  closeMessageBtn.addEventListener("click", hideMessage);
}

// Función para manejar el clic en un botón de dígito
function handleDigitClick(e) {
  // Si es el primer intento, se inicia el cronómetro
  if (!gameStarted) {
    crono.start();
    gameStarted = true;
  }
  
  const digit = parseInt(e.target.getAttribute("data-digit"));
  let acierto = false;
  
  // Recorrer la clave secreta y revelar los dígitos que coincidan
  secretCode.forEach((num, index) => {
    if (num === digit && !revealed[index]) {
      revealed[index] = true;
      acierto = true;
      // Actualizar la visualización en la posición correspondiente
      const span = secretKeyDiv.children[index];
      span.textContent = num;
      span.classList.remove("hidden-digit");
      span.classList.add("revealed-digit");
    }
  });
  
  // Se descuenta un intento por cada botón pulsado
  attemptsRemaining--;
  updateAttempts();
  
  // Si se han acertado todos los dígitos, detener el cronómetro y mostrar mensaje de enhorabuena
  if (isGameWon()) {
    crono.stop();
    showMessage("BOMBA DESACTIVADA", "¡Felicidades! Has desactivado la bomba.");
    // Aquí podrías reiniciar el juego automáticamente o esperar a que el usuario cierre el mensaje
  }
  
  // Si se han agotado los intentos sin ganar, detener el cronómetro y mostrar mensaje de explosión
  if (attemptsRemaining <= 0 && !isGameWon()) {
    crono.stop();
    showMessage("¡BOOM!", "¡La bomba ha explotado! No lograste desactivarla.");
    resetGame();
  }
}

// Función para reiniciar el juego
function resetGame() {
  // Reiniciar estado del cronómetro y de los intentos
  crono.reset();
  gameStarted = false;
  attemptsRemaining = 10;
  updateAttempts();
  generateSecretCode();
}

// Eventos para los botones de dígitos
digitButtons.forEach(button => {
  button.addEventListener("click", handleDigitClick);
});

// Eventos para los botones de control
startBtn.addEventListener("click", () => {
  // Arranca el cronómetro si no está ya en marcha
  if (!gameStarted) {
    crono.start();
    gameStarted = true;
  }
});

stopBtn.addEventListener("click", () => {
  crono.stop();
  gameStarted = false; // Permite reiniciar el cronómetro posteriormente
});

resetBtn.addEventListener("click", () => {
  resetGame();
});

// Inicializar el juego al cargar la página
window.onload = () => {
  generateSecretCode();
  updateAttempts();
};
