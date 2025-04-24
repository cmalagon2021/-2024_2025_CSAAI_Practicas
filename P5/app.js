// Elementos y estado
const CANVAS = document.getElementById('networkCanvas');
const tooltip = document.getElementById('tooltip');
const themeSwitcher = document.getElementById('themeSwitcher');
const paletteSwitcher = document.getElementById('paletteSwitcher');
const generateBtn = document.getElementById('generateBtn');
const calcBtn = document.getElementById('calcBtn');
let nodes = [], edges = [], ctx;
const MAX_NODES = 5;

// Inicialización
function init() {
  ctx = CANVAS.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  CANVAS.addEventListener('mousemove', onHover);
  CANVAS.addEventListener('mouseleave', () => tooltip.style.opacity = 0);
  themeSwitcher.addEventListener('change', e => document.documentElement.setAttribute('data-theme', e.target.value));
  paletteSwitcher.addEventListener('change', e => document.documentElement.style.setProperty('--accent', e.target.value));
  generateBtn.addEventListener('click', generateGraph);
  calcBtn.addEventListener('click', calculateRoute);
}

// Ajuste Hi-DPI y redibujo
function resizeCanvas() {
  CANVAS.width = CANVAS.clientWidth * devicePixelRatio;
  CANVAS.height = CANVAS.clientHeight * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  drawGraph();
}

// Tooltips en nodos/aristas
function onHover(evt) {
  const rect = CANVAS.getBoundingClientRect();
  const mx = evt.clientX - rect.left;
  const my = evt.clientY - rect.top;
  let found = false;

  for (let n of nodes) {
    if (Math.hypot(mx - n.x, my - n.y) < 20) {
      showTooltip(`Nodo ${n.id}\nDelay: ${n.delay}ms`, evt.clientX, evt.clientY);
      found = true;
      break;
    }
  }
  if (!found) {
    for (let e of edges) {
      const a = nodes[e.from], b = nodes[e.to];
      const t = ((mx - a.x)*(b.x - a.x) + (my - a.y)*(b.y - a.y)) /
                ((b.x - a.x)**2 + (b.y - a.y)**2);
      if (t > 0 && t < 1) {
        const px = a.x + t*(b.x - a.x), py = a.y + t*(b.y - a.y);
        if (Math.hypot(mx - px, my - py) < 6) {
          showTooltip(`Arista ${e.from}→${e.to}\nPeso: ${e.weight}`, evt.clientX, evt.clientY);
          found = true;
          break;
        }
      }
    }
  }
  if (!found) tooltip.style.opacity = 0;
}

function showTooltip(text, x, y) {
  tooltip.textContent = text;
  tooltip.style.left = x + 12 + 'px';
  tooltip.style.top = y + 12 + 'px';
  tooltip.style.opacity = 1;
}

// Utilidades y lógica de red
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateGraph() {
  nodes = [];
  edges = [];
  const n = randInt(2, MAX_NODES);

  for (let i = 0; i < n; i++) {
    nodes.push({
      id: i,
      delay: randInt(5, 50),
      x: randInt(50, CANVAS.clientWidth - 50),
      y: randInt(50, CANVAS.clientHeight - 50),
      color: 'steelblue'
    });
  }

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const w = randInt(10, 100);
    edges.push({ from: i, to: j, weight: w });
    edges.push({ from: j, to: i, weight: w });
  }

  document.getElementById('nodeCount').textContent = n;
  document.getElementById('totalTime').textContent = 0;
  document.getElementById('message').textContent = 'Red generada correctamente.';
  drawGraph();
}

function drawGraph(highlightedPath = []) {
  ctx.clearRect(0, 0, CANVAS.clientWidth, CANVAS.clientHeight);
  ctx.lineWidth = 2;
  ctx.font = '12px sans-serif';

  edges.forEach(e => {
    const from = nodes[e.from], to = nodes[e.to];
    ctx.strokeStyle = '#999';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2;
    ctx.fillStyle = 'var(--text)';
    ctx.fillText(e.weight, mx + 4, my - 4);
  });

  nodes.forEach(n => {
    ctx.beginPath();
    ctx.fillStyle = highlightedPath.includes(n.id) ? 'limegreen' : n.color;
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.arc(n.x, n.y, 20, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`N${n.id}`, n.x, n.y - 6);
    ctx.fillText(`${n.delay}ms`, n.x, n.y + 10);
  });
}

function dijkstra(start, end) {
  const dist = Array(nodes.length).fill(Infinity);
  const prev = Array(nodes.length).fill(null);
  const visited = Array(nodes.length).fill(false);
  dist[start] = 0;

  for (let i = 0; i < nodes.length; i++) {
    let u = -1;
    for (let j = 0; j < nodes.length; j++)
      if (!visited[j] && (u < 0 || dist[j] < dist[u])) u = j;
    if (dist[u] === Infinity) break;
    visited[u] = true;

    edges.filter(e => e.from === u).forEach(e => {
      if (dist[e.to] > dist[u] + e.weight) {
        dist[e.to] = dist[u] + e.weight;
        prev[e.to] = u;
      }
    });
  }

  const path = [];
  for (let u = end; u != null; u = prev[u]) path.unshift(u);
  return { path, distance: dist[end] };
}

function calculateRoute() {
  if (!nodes.length) {
    document.getElementById('message').textContent = 'Primero genera la red, por favor.';
    return;
  }
  const start = 0, end = nodes.length - 1;
  const { path, distance } = dijkstra(start, end);
  if (!path.length) {
    document.getElementById('message').textContent = `No hay camino de ${start} a ${end}.`;
    return;
  }
  const totalDelay = path.reduce((sum, id) => sum + nodes[id].delay, 0);
  document.getElementById('totalTime').textContent = totalDelay;
  document.getElementById('message').textContent = `Ruta mínima (peso aristas=${distance}) encontrada.`;
  drawGraph(path);
}

// Arrancar
init();