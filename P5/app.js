// app.js

// Elementos y estado
const bgCanvas        = document.getElementById('bgCanvas');
const bgCtx           = bgCanvas.getContext('2d');
const CANVAS          = document.getElementById('networkCanvas');
const ctx             = CANVAS.getContext('2d');
const tooltip         = document.getElementById('tooltip');
const themeSwitcher   = document.getElementById('themeSwitcher');
const paletteSwitcher = document.getElementById('paletteSwitcher');
const generateBtn     = document.getElementById('generateBtn');
const calcBtn         = document.getElementById('calcBtn');

let nodes = [], edges = [];
const MAX_NODES = 5;

// Factor para ralentizar la animación de paquetes
const PACKET_SPEED_MULTIPLIER = 40;  // Aumenta para ir más despacio

// Zoom & Pan
let scale = 1, panX = 0, panY = 0;
let isPanning = false, panStart = {};

// Fondo de partículas
const particles = [];
const PARTICLE_COUNT = 60;

// Inicialización
function init() {
  window.addEventListener('resize', resizeAll);

  CANVAS.addEventListener('mousemove', onHover);
  CANVAS.addEventListener('mouseleave',   () => tooltip.style.opacity = 0);
  CANVAS.addEventListener('wheel',        onWheel,   { passive: false });
  CANVAS.addEventListener('mousedown',    startPan);
  window.addEventListener('mousemove',    panMove);
  window.addEventListener('mouseup',      endPan);

  themeSwitcher.addEventListener('change',  e => document.documentElement.setAttribute('data-theme', e.target.value));
  paletteSwitcher.addEventListener('change', e => document.documentElement.style.setProperty('--accent', e.target.value));

  generateBtn.addEventListener('click', generateGraph);
  calcBtn.addEventListener('click',     calculateRoute);

  initParticles();
  requestAnimationFrame(animateBackground);
  resizeAll();
}

// Ajustes HiDPI y redraw
function resizeAll() {
  // Canvas de fondo
  bgCanvas.width  = bgCanvas.clientWidth  * devicePixelRatio;
  bgCanvas.height = bgCanvas.clientHeight * devicePixelRatio;
  bgCtx.scale(devicePixelRatio, devicePixelRatio);

  // Canvas de red
  CANVAS.width  = CANVAS.clientWidth  * devicePixelRatio;
  CANVAS.height = CANVAS.clientHeight * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);

  drawGraph();
}

// Inicializa partículas de fondo
function initParticles() {
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x:  Math.random() * bgCanvas.clientWidth,
      y:  Math.random() * bgCanvas.clientHeight,
      r:  1 + Math.random() * 2,
      vx: -0.3 + Math.random() * 0.6,
      vy: -0.3 + Math.random() * 0.6
    });
  }
}

// Anima partículas de fondo continuamente
function animateBackground() {
  bgCtx.clearRect(0, 0, bgCanvas.clientWidth, bgCanvas.clientHeight);
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0) p.x = bgCanvas.clientWidth;
    if (p.x > bgCanvas.clientWidth) p.x = 0;
    if (p.y < 0) p.y = bgCanvas.clientHeight;
    if (p.y > bgCanvas.clientHeight) p.y = 0;
    bgCtx.beginPath();
    bgCtx.fillStyle = 'rgba(255,255,255,0.2)';
    bgCtx.arc(p.x, p.y, p.r, 0, 2*Math.PI);
    bgCtx.fill();
  });
  requestAnimationFrame(animateBackground);
}

// Manejo de zoom con la rueda
function onWheel(e) {
  e.preventDefault();
  const rect = CANVAS.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const delta = e.deltaY < 0 ? 1.1 : 0.9;
  const newScale = Math.max(0.5, Math.min(3, scale * delta));
  panX = mx - ((mx - panX) * newScale / scale);
  panY = my - ((my - panY) * newScale / scale);
  scale = newScale;
  drawGraph();
}
function startPan(e) { isPanning = true; panStart = { x: e.clientX, y: e.clientY }; }
function panMove(e) {
  if (!isPanning) return;
  const dx = e.clientX - panStart.x;
  const dy = e.clientY - panStart.y;
  panX += dx; panY += dy;
  panStart = { x: e.clientX, y: e.clientY };
  drawGraph();
}
function endPan() { isPanning = false; }

// Tooltips en nodos y aristas
function onHover(evt) {
  const rect = CANVAS.getBoundingClientRect();
  const mx = (evt.clientX - rect.left - panX) / scale;
  const my = (evt.clientY - rect.top  - panY) / scale;
  let found = false;

  for (let n of nodes) {
    if (Math.hypot(mx - n.x, my - n.y) < 20) {
      showTooltip(`Nodo ${n.id}\nDelay: ${n.delay} ms`, evt.clientX, evt.clientY);
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
  tooltip.style.left    = x + 12 + 'px';
  tooltip.style.top     = y + 12 + 'px';
  tooltip.style.opacity = 1;
}

// Generación y lógica de la red
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateGraph() {
  nodes = []; edges = [];
  const n = randInt(2, MAX_NODES);

  for (let i = 0; i < n; i++) {
    nodes.push({
      id:    i,
      delay: randInt(5, 50),
      x:     randInt(50, CANVAS.clientWidth  - 50),
      y:     randInt(50, CANVAS.clientHeight - 50),
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
  document.getElementById('message').textContent   = 'Red generada correctamente.';
  drawGraph();
}

// Dibujar nodos y aristas (aplica zoom/pan)
function drawGraph(highlightedPath = []) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, CANVAS.clientWidth, CANVAS.clientHeight);
  ctx.setTransform(scale, 0, 0, scale, panX, panY);

  // Aristas
  ctx.lineWidth = 2;
  ctx.font      = '12px sans-serif';
  ctx.fillStyle = 'var(--text)';
  edges.forEach(e => {
    const a = nodes[e.from], b = nodes[e.to];
    ctx.strokeStyle = '#999';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    ctx.fillText(e.weight, mx + 4, my - 4);
  });

  // Nodos
  nodes.forEach(n => {
    ctx.beginPath();
    ctx.fillStyle   = highlightedPath.includes(n.id) ? 'limegreen' : n.color;
    ctx.strokeStyle = '#333';
    ctx.lineWidth   = 2;
    ctx.arc(n.x, n.y, 20, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle     = '#fff';
    ctx.textAlign     = 'center';
    ctx.textBaseline  = 'middle';
    ctx.fillText(`N${n.id}`, n.x, n.y - 6);
    ctx.fillText(`${n.delay} ms`, n.x, n.y + 10);
  });
}

// Dijkstra
function dijkstra(start, end) {
  const dist = Array(nodes.length).fill(Infinity);
  const prev = Array(nodes.length).fill(null);
  const visited = Array(nodes.length).fill(false);
  dist[start] = 0;

  for (let i = 0; i < nodes.length; i++) {
    let u = -1;
    for (let j = 0; j < nodes.length; j++) {
      if (!visited[j] && (u < 0 || dist[j] < dist[u])) u = j;
    }
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
  for (let u = end; u != null; u = prev[u]) {
    path.unshift(u);
  }
  return { path, distance: dist[end] };
}

// Cálculo de ruta y animación de paquetes
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
  document.getElementById('message').textContent   = `Ruta mínima (peso=${distance}) encontrada.`;
  drawGraph(path);
  animatePackets(path);
}

function animatePackets(path) {
  let idx = 0, t0 = null;
  function step(ts) {
    if (idx >= path.length - 1) {
      generateBtn.disabled = false;
      calcBtn.disabled     = false;
      return;
    }
    if (!t0) t0 = ts;

    const from     = nodes[path[idx]];
    const to       = nodes[path[idx + 1]];
    const duration = to.delay * PACKET_SPEED_MULTIPLIER;
    const elapsed  = ts - t0;
    const t        = Math.min(elapsed / duration, 1);

    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;

    drawGraph(path);

    // Dibuja el paquete
    ctx.beginPath();
    ctx.fillStyle = 'yellow';
    ctx.arc(x, y, 8, 0, 2 * Math.PI);
    ctx.fill();

    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      idx++;
      t0 = null;
      requestAnimationFrame(step);
    }
  }

  generateBtn.disabled = true;
  calcBtn.disabled     = true;
  requestAnimationFrame(step);
}

// Parallax del fondo
window.addEventListener('mousemove', e => {
  const x = (e.clientX / window.innerWidth)  * 100;
  const y = (e.clientY / window.innerHeight) * 100;
  document.body.style.backgroundPosition = `${x}% ${y}%`;
});

// Arrancar la aplicación
init();
