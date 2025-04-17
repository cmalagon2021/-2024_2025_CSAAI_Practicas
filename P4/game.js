document.addEventListener('DOMContentLoaded', () => {
  // Elementos del DOM
  const startBtn = document.getElementById('startBtn');
  const resetBtn = document.getElementById('resetBtn');
  const dimensionSelector = document.getElementById('dimensionSelector');
  const gameBoard = document.getElementById('gameBoard');
  const moveCountDisplay = document.getElementById('moveCount');
  const timerDisplay = document.getElementById('timer');
  const messageDisplay = document.getElementById('message');

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

  // Inicia o reinicia el juego
  function initGame() {
    // Reiniciar variables y detener el timer
    clearInterval(timerInterval);
    timer = 0;
    moves = 0;
    matchedPairs = 0;
    flippedCards = [];
    gameStarted = false;
    lockBoard = false;
    messageDisplay.textContent = '';
    updateStats();

    // Se permite cambiar la dimensión antes de iniciar el juego
    dimensionSelector.disabled = false;

    // Leer la dimensión seleccionada (2, 4 o 6)
    dimension = parseInt(dimensionSelector.value);
    totalCards = dimension * dimension;
    totalPairs = totalCards / 2;

    // Configurar el grid según la dimensión
    gameBoard.style.gridTemplateColumns = `repeat(${dimension}, auto)`;

    // Preparar las imágenes disponibles (imagen1.webp ... imagen18.webp)
    const availableImages = [];
    for (let i = 1; i <= 18; i++) {
      availableImages.push(`imagen${i}.png`) ;
    }

    // Seleccionar aleatoriamente las imágenes necesarias
    let selectedImages = [];
    while (selectedImages.length < totalPairs) {
      const randomIndex = Math.floor(Math.random() * availableImages.length);
      const image = availableImages.splice(randomIndex, 1)[0];
      selectedImages.push(image);
    }

    // Duplicar imágenes para formar parejas y mezclarlas
    cardValues = selectedImages.concat(selectedImages);
    shuffleArray(cardValues);

    // Crear las cartas en el tablero
    gameBoard.innerHTML = '';
    cardValues.forEach((img, index) => {
      const card = document.createElement('div');
      card.classList.add('card');
      card.dataset.image = img;
      card.dataset.index = index;

      const cardInner = document.createElement('div');
      cardInner.classList.add('card-inner');

      // Importante: La cara trasera se crea primero
      const cardBack = document.createElement('div');
      cardBack.classList.add('card-face', 'card-back');

      const cardFront = document.createElement('div');
      cardFront.classList.add('card-face', 'card-front');
      cardFront.style.backgroundImage = `url('${img}')`;

      // Agregamos las caras en el orden adecuado
      cardInner.appendChild(cardBack);
      cardInner.appendChild(cardFront);
      card.appendChild(cardInner);

      // Evento de clic para voltear la carta
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
    if (lockBoard) return;
    if (card.classList.contains('flipped')) return;

    // Iniciar juego (y timer) si aún no ha comenzado
    if (!gameStarted) {
      gameStarted = true;
      dimensionSelector.disabled = true;
      timerInterval = setInterval(() => {
        timer++;
        updateStats();
      }, 1000);
    }

    // Voltear la carta
    card.classList.add('flipped');
    flippedCards.push(card);

    // Si se voltearon dos, verificar coincidencia
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
        messageDisplay.textContent = `¡Felicidades! Has completado el juego en ${moves} movimientos y ${timer} segundos.`;
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

  // Asignar eventos a los botones
  startBtn.addEventListener('click', initGame);
  resetBtn.addEventListener('click', initGame);

  // Permitir iniciar el juego al pulsar sobre una carta
  gameBoard.addEventListener('click', (e) => {
    if (!gameStarted && e.target.closest('.card')) {
      initGame();
    }
  });

  // Iniciar al cargar la página
  initGame();
});
