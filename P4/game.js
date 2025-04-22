document.addEventListener('DOMContentLoaded', () => {
  // Elementos del DOM principales
  const startBtn = document.getElementById('startBtn');
  const resetBtn = document.getElementById('resetBtn');
  const dimensionSelector = document.getElementById('dimensionSelector');
  const gameBoard = document.getElementById('gameBoard');
  const moveCountDisplay = document.getElementById('moveCount');
  const timerDisplay = document.getElementById('timer');

  // Variables globales
  let dimension;
  let totalCards;
  let cardValues = [];
  let flippedCards = [];
  let moves = 0;
  let timer = 0;
  let timerInterval = null;
  let gameStarted = false;
  let matchedPairs = 0;
  let totalPairs = 0;
  let lockBoard = false;

  // Crear modal de victoria dinámicamente
  const modal = document.createElement('div');
  modal.classList.add('modal');
  modal.id = 'victoryModal';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>¡Felicidades!</h2>
      <p id="modalMessage"></p>
      <button id="closeModalBtn">Cerrar</button>
    </div>
  `;
  document.body.appendChild(modal);

  const modalMessage = modal.querySelector('#modalMessage');
  const closeModalBtn = modal.querySelector('#closeModalBtn');

  // Evento para cerrar el modal y reiniciar el juego
  closeModalBtn.addEventListener('click', () => {
    modal.classList.remove('show');
    initGame();
  });
  // Cerrar modal al hacer clic fuera del contenido
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('show');
      initGame();
    }
  });

  // Inicia o reinicia el juego
  function initGame() {
    clearInterval(timerInterval);
    timer = 0;
    moves = 0;
    matchedPairs = 0;
    flippedCards = [];
    gameStarted = false;
    lockBoard = false;
    updateStats();

    // Rehabilitar selector de dimensión
    dimensionSelector.disabled = false;
    dimension = parseInt(dimensionSelector.value);
    totalCards = dimension * dimension;
    totalPairs = totalCards / 2;
    gameBoard.style.gridTemplateColumns = `repeat(${dimension}, auto)`;

    // Preparar imágenes
    const availableImages = [];
    for (let i = 1; i <= 18; i++) {
      availableImages.push(`imagen${i}.png`);
    }
    let selectedImages = [];
    while (selectedImages.length < totalPairs) {
      const randomIndex = Math.floor(Math.random() * availableImages.length);
      selectedImages.push(availableImages.splice(randomIndex, 1)[0]);
    }
    cardValues = selectedImages.concat(selectedImages);
    shuffleArray(cardValues);

    // Dibujar el tablero
    gameBoard.innerHTML = '';
    cardValues.forEach((img, index) => {
      const card = document.createElement('div');
      card.classList.add('card');
      card.dataset.image = img;

      const cardInner = document.createElement('div');
      cardInner.classList.add('card-inner');

      const cardBack = document.createElement('div');
      cardBack.classList.add('card-face', 'card-back');

      const cardFront = document.createElement('div');
      cardFront.classList.add('card-face', 'card-front');
      cardFront.style.backgroundImage = `url('${img}')`;

      cardInner.append(cardBack, cardFront);
      card.appendChild(cardInner);
      card.addEventListener('click', () => handleCardClick(card));
      gameBoard.appendChild(card);
    });
  }

  // Actualiza contadores de movimientos y tiempo
  function updateStats() {
    moveCountDisplay.textContent = `Movimientos: ${moves}`;
    timerDisplay.textContent = `Tiempo: ${timer} s`;
  }

  // Maneja el clic en una carta
  function handleCardClick(card) {
    if (lockBoard || card.classList.contains('flipped')) return;

    if (!gameStarted) {
      gameStarted = true;
      dimensionSelector.disabled = true;
      timerInterval = setInterval(() => {
        timer++;
        updateStats();
      }, 1000);
    }

    card.classList.add('flipped');
    flippedCards.push(card);

    if (flippedCards.length === 2) {
      moves++;
      updateStats();
      checkForMatch();
    }
  }

  // Comprueba si las dos cartas son iguales
  function checkForMatch() {
    const [card1, card2] = flippedCards;
    if (card1.dataset.image === card2.dataset.image) {
      matchedPairs++;
      flippedCards = [];
      if (matchedPairs === totalPairs) {
        clearInterval(timerInterval);
        const message = `Has completado el juego en ${moves} movimientos y ${timer} segundos.`;
        modalMessage.textContent = message;
        modal.classList.add('show');
      }
    } else {
      lockBoard = true;
      setTimeout(() => {
        card1.classList.remove('flipped');
        card2.classList.remove('flipped');
        flippedCards = [];
        lockBoard = false;
      }, 1000);
    }
  }

  // Algoritmo de Fisher-Yates para mezclar el array
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // Eventos de los botones
  startBtn.addEventListener('click', initGame);
  resetBtn.addEventListener('click', initGame);

  // Permitir inicio con clic en el tablero
  gameBoard.addEventListener('click', (e) => {
    if (!gameStarted && e.target.closest('.card')) {
      initGame();
    }
  });

  // Iniciar al cargar la página
  initGame();
});
