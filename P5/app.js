// Parámetros
const MAX_NODES = 5;
const CANVAS = document.getElementById('networkCanvas');
const ctx = CANVAS.getContext('2d');
const generateBtn = document.getElementById('generateBtn');
const calcBtn     = document.getElementById('calcBtn');
const msgDiv      = document.getElementById('message');
const nodeCountEl = document.getElementById('nodeCount');
const totalTimeEl = document.getElementById('totalTime');

let nodes = [];
let edges = [];

// Genera un entero aleatorio entre min y max (incluidos)
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Genera la red: grafo ciclo de n nodos (n entre 2 y MAX_NODES)
function generateGraph() {
  nodes = [];
  edges = [];
  const n = randInt(2, MAX_NODES);

  // Crear nodos con posición y retardo aleatorio
  for (let i = 0; i < n; i++) {
    nodes.push({
      id: i,
      delay: randInt(5, 50), // ms
      x: randInt(50, CANVAS.width - 50),
      y: randInt(50, CANVAS.height - 50),
      color: 'steelblue'
    });
  }

  // Crear ciclo: cada nodo se conecta con el siguiente (undirected)
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const w = randInt(10, 100); // peso distancia
    edges.push({ from: i, to: j, weight: w });
    edges.push({ from: j, to: i, weight: w });
  }

  nodeCountEl.textContent = n;
  totalTimeEl.textContent = '0';
  msgDiv.textContent = 'Red generada correctamente.';
  drawGraph();
}

// Dibuja los nodos y aristas en el canvas
function drawGraph(highlightedPath = []) {
  ctx.clearRect(0, 0, CANVAS.width, CANVAS.height);

  // Dibujar aristas
  ctx.lineWidth = 2;
  ctx.font = '12px sans-serif';
  edges.forEach(e => {
    const from = nodes[e.from];
    const to   = nodes[e.to];
    // línea
    ctx.strokeStyle = '#999';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    // peso en el punto medio
    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2;
    ctx.fillStyle = 'black';
    ctx.fillText(e.weight, mx + 4, my - 4);
  });

  // Dibujar nodos
  nodes.forEach(n => {
    ctx.beginPath();
    ctx.fillStyle = highlightedPath.includes(n.id) ? 'limegreen' : n.color;
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.arc(n.x, n.y, 20, 0, 2*Math.PI);
    ctx.fill();
    ctx.stroke();
    // id y delay
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`N${n.id}`, n.x, n.y - 6);
    ctx.fillText(`${n.delay}ms`, n.x, n.y + 10);
  });
}

// Implementación de Dijkstra (uso de pesos de aristas)
function dijkstra(start, end) {
  const dist = Array(nodes.length).fill(Infinity);
  const prev = Array(nodes.length).fill(null);
  const visited = Array(nodes.length).fill(false);
  dist[start] = 0;

  for (let i = 0; i < nodes.length; i++) {
    // buscar no visitado de menor distancia
    let u = -1;
    for (let j = 0; j < nodes.length; j++)
      if (!visited[j] && (u < 0 || dist[j] < dist[u])) u = j;
    if (dist[u] === Infinity) break;
    visited[u] = true;

    // relajar bordes
    edges.filter(e => e.from === u).forEach(e => {
      if (dist[e.to] > dist[u] + e.weight) {
        dist[e.to] = dist[u] + e.weight;
        prev[e.to] = u;
      }
    });
  }

  // reconstruir camino
  const path = [];
  for (let u = end; u != null; u = prev[u]) path.unshift(u);
  return { path, distance: dist[end] };
}

// Calcula la ruta mínima y suma retardo de nodos
function calculateRoute() {
  if (nodes.length === 0) {
    msgDiv.textContent = 'Primero genera la red, por favor.';
    return;
  }
  const start = 0;
  const end   = nodes.length - 1;
  const { path, distance } = dijkstra(start, end);
  if (path.length === 0) {
    msgDiv.textContent = `No hay camino de ${start} a ${end}.`;
    return;
  }
  // sumar retardos de nodos en el camino
  const totalDelay = path.reduce((sum, nodeId) => sum + nodes[nodeId].delay, 0);
  totalTimeEl.textContent = totalDelay;
  msgDiv.textContent = `Ruta mínima (peso aristas = ${distance}) encontrada.`;
  drawGraph(path);
}

// Eventos
generateBtn.addEventListener('click', generateGraph);
calcBtn.addEventListener('click', calculateRoute);
