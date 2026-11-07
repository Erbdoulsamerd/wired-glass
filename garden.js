// The scenes behind the glass. Each garden is painted onto a canvas in three
// depth layers (far, middle, near), so the glass and the Depth slider have
// something to blur. Every garden is drawn from code: no image files needed.

export const GARDENS = [
  { id: 'leafy', name: 'Leafy hedge' },
  { id: 'roses', name: 'Rose garden' },
  { id: 'tulips', name: 'Tulip field' },
  { id: 'lavender', name: 'Lavender rows' },
  { id: 'sunflowers', name: 'Sunflowers' },
  { id: 'blossom', name: 'Cherry blossom' },
  { id: 'meadow', name: 'Wildflower meadow' },
];

function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
const pick = (r, list) => list[Math.floor(r() * list.length)];
const rgba = (c, a, k = 1) => `rgba(${c[0] * k | 0},${c[1] * k | 0},${c[2] * k | 0},${a})`;

/* ---------------- shared pieces ---------------- */

function backdrop(ctx, S, r, stops, glow) {
  const g = ctx.createLinearGradient(0, 0, S * 0.4, S);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 6; i++) {
    const x = r() * S, y = r() * S * 0.55, rad = 90 + r() * 170;
    const sg = ctx.createRadialGradient(x, y, 0, x, y, rad);
    sg.addColorStop(0, glow); sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
}

function leaf(ctx, x, y, w, rot, col) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(0, -w * 0.62);
  ctx.bezierCurveTo(w * 0.62, -w * 0.4, w * 0.55, w * 0.42, 0, w * 0.5);
  ctx.bezierCurveTo(-w * 0.55, w * 0.42, -w * 0.62, -w * 0.4, 0, -w * 0.62);
  ctx.fill();
  ctx.restore();
}

// a bed of leaves for flowers to sit in
function foliage(ctx, S, r, n, size, dark, alpha, palette, top = 0.15) {
  for (let i = 0; i < n; i++) {
    const x = r() * S, y = (top + r() * (1.05 - top)) * S;
    leaf(ctx, x, y, size[0] + r() * (size[1] - size[0]), r() * 6.28, rgba(pick(r, palette), alpha, dark * (0.75 + r() * 0.35)));
  }
}

function layers(ctx, S, draw) {
  // far = very soft, near = crisp; the glass blurs it all further.
  // Each layer is drawn sharp on its own canvas, then blurred once as a whole,
  // which is far faster than blurring every petal separately.
  const L = [
    { blur: 9, alpha: 0.6, dark: 0.6, scale: 1.25, n: 1.2 },
    { blur: 4, alpha: 0.8, dark: 0.82, scale: 1, n: 1 },
    { blur: 1.2, alpha: 0.96, dark: 1, scale: 0.8, n: 0.7 },
  ];
  const layer = document.createElement('canvas');
  layer.width = layer.height = S;
  const lctx = layer.getContext('2d');
  for (const l of L) {
    lctx.clearRect(0, 0, S, S);
    draw(l, lctx);
    if ('filter' in ctx) ctx.filter = `blur(${l.blur}px)`;
    ctx.drawImage(layer, 0, 0);
    if ('filter' in ctx) ctx.filter = 'none';
  }
}

/* ---------------- flowers ---------------- */

function rose(ctx, x, y, s, col, a, k) {
  // rings of overlapping petals, darker and tighter toward the centre
  for (let ring = 0; ring < 4; ring++) {
    const rad = s * (1 - ring * 0.22), petals = 5 + ring;
    const shade = k * (1 - ring * 0.13);
    ctx.fillStyle = rgba(col, a, shade);
    for (let p = 0; p < petals; p++) {
      const ang = p / petals * 6.28 + ring * 0.6;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(ang) * rad * 0.42, y + Math.sin(ang) * rad * 0.42, rad * 0.52, rad * 0.4, ang, 0, 6.28);
      ctx.fill();
    }
  }
  ctx.fillStyle = rgba(col, a, k * 0.45);
  ctx.beginPath(); ctx.arc(x, y, s * 0.16, 0, 6.28); ctx.fill();
  ctx.fillStyle = `rgba(255,240,240,${0.18 * a})`;
  ctx.beginPath(); ctx.ellipse(x - s * 0.25, y - s * 0.3, s * 0.3, s * 0.15, -0.6, 0, 6.28); ctx.fill();
}

function tulip(ctx, x, y, s, col, a, k) {
  ctx.strokeStyle = rgba([60, 120, 50], a, k); ctx.lineWidth = s * 0.14;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + s * 0.2, y + s * 2, x - s * 0.1, y + s * 3.5); ctx.stroke();
  ctx.fillStyle = rgba(col, a, k);
  ctx.beginPath();
  ctx.moveTo(x - s * 0.55, y - s * 0.9);
  ctx.lineTo(x - s * 0.25, y - s * 0.45); ctx.lineTo(x, y - s * 1.0);
  ctx.lineTo(x + s * 0.25, y - s * 0.45); ctx.lineTo(x + s * 0.55, y - s * 0.9);
  ctx.bezierCurveTo(x + s * 0.7, y + s * 0.1, x + s * 0.3, y + s * 0.35, x, y + s * 0.35);
  ctx.bezierCurveTo(x - s * 0.3, y + s * 0.35, x - s * 0.7, y + s * 0.1, x - s * 0.55, y - s * 0.9);
  ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${0.15 * a})`;
  ctx.beginPath(); ctx.ellipse(x - s * 0.2, y - s * 0.3, s * 0.1, s * 0.4, 0.2, 0, 6.28); ctx.fill();
}

function lavender(ctx, x, y, s, col, a, k, r) {
  ctx.strokeStyle = rgba([80, 110, 70], a, k); ctx.lineWidth = Math.max(1, s * 0.06);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s * 0.2, y + s * 4); ctx.stroke();
  for (let i = 0; i < 14; i++) {
    const t = i / 14, bx = x + (r() - 0.5) * s * 0.35 * (1 - t), by = y - t * s * 2.2;
    ctx.fillStyle = rgba(col, a, k * (0.8 + r() * 0.35));
    ctx.beginPath(); ctx.ellipse(bx, by, s * 0.26 * (1 - t * 0.4), s * 0.18, 0, 0, 6.28); ctx.fill();
  }
}

function sunflower(ctx, x, y, s, a, k, r) {
  const petals = 18;
  for (let p = 0; p < petals; p++) {
    const ang = p / petals * 6.28 + r() * 0.1;
    ctx.fillStyle = rgba(pick(r, [[250, 196, 40], [245, 175, 30], [255, 210, 70]]), a, k);
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(ang) * s * 0.75, y + Math.sin(ang) * s * 0.75, s * 0.42, s * 0.15, ang, 0, 6.28);
    ctx.fill();
  }
  ctx.fillStyle = rgba([90, 55, 25], a, k);
  ctx.beginPath(); ctx.arc(x, y, s * 0.5, 0, 6.28); ctx.fill();
  ctx.fillStyle = rgba([60, 35, 15], a, k);
  for (let i = 0; i < 20; i++) {
    const rr = Math.sqrt(r()) * s * 0.42, aa = r() * 6.28;
    ctx.beginPath(); ctx.arc(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr, s * 0.05, 0, 6.28); ctx.fill();
  }
}

function fivePetal(ctx, x, y, s, col, a, k, centre) {
  ctx.fillStyle = rgba(col, a, k);
  for (let p = 0; p < 5; p++) {
    const ang = p / 5 * 6.28;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(ang) * s * 0.5, y + Math.sin(ang) * s * 0.5, s * 0.48, s * 0.36, ang, 0, 6.28);
    ctx.fill();
  }
  ctx.fillStyle = rgba(centre, a, k);
  ctx.beginPath(); ctx.arc(x, y, s * 0.22, 0, 6.28); ctx.fill();
}

function daisy(ctx, x, y, s, col, a, k) {
  ctx.fillStyle = rgba(col, a, k);
  for (let p = 0; p < 12; p++) {
    const ang = p / 12 * 6.28;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(ang) * s * 0.55, y + Math.sin(ang) * s * 0.55, s * 0.45, s * 0.13, ang, 0, 6.28);
    ctx.fill();
  }
  ctx.fillStyle = rgba([245, 190, 40], a, k);
  ctx.beginPath(); ctx.arc(x, y, s * 0.24, 0, 6.28); ctx.fill();
}

function poppy(ctx, x, y, s, col, a, k) {
  ctx.fillStyle = rgba(col, a, k);
  for (let p = 0; p < 4; p++) {
    const ang = p / 4 * 6.28 + 0.4;
    ctx.beginPath(); ctx.arc(x + Math.cos(ang) * s * 0.35, y + Math.sin(ang) * s * 0.35, s * 0.55, 0, 6.28); ctx.fill();
  }
  ctx.fillStyle = rgba([30, 25, 30], a, k);
  ctx.beginPath(); ctx.arc(x, y, s * 0.2, 0, 6.28); ctx.fill();
}

/* ---------------- the gardens ---------------- */

const LEAVES = [[62, 110, 44], [88, 140, 58], [120, 168, 72], [70, 120, 60], [44, 86, 40]];

const PAINTERS = {
  leafy(ctx, S, r) {
    backdrop(ctx, S, r, ['#2c4a26', '#1d3a1c', '#0f2412'], 'rgba(214,232,196,0.55)');
    const palette = [...LEAVES, [150, 190, 90], [190, 200, 110], [210, 196, 90]];
    layers(ctx, S, (l, ctx) => {
      for (let i = 0; i < 120 * l.n; i++) {
        const x = Math.pow(r(), 0.7) * S, y = (0.15 + Math.pow(r(), 0.8) * 0.95) * S;
        const w = (26 + r() * 50) * l.scale;
        leaf(ctx, x, y, w, r() * 6.28, rgba(pick(r, palette), l.alpha, l.dark * (0.75 + r() * 0.35)));
        ctx.fillStyle = `rgba(230,240,190,${0.12 * l.dark})`;
        ctx.beginPath(); ctx.ellipse(x - w * 0.12, y - w * 0.15, w * 0.22, w * 0.14, -0.6, 0, 6.28); ctx.fill();
      }
    });
  },

  roses(ctx, S, r) {
    backdrop(ctx, S, r, ['#3a3a2a', '#1f2d1c', '#12200f'], 'rgba(255,225,215,0.45)');
    const reds = [[205, 30, 50], [230, 70, 100], [245, 150, 170], [180, 20, 40], [250, 235, 230], [240, 120, 80]];
    layers(ctx, S, (l, ctx) => {
      foliage(ctx, S, r, 70 * l.n, [26 * l.scale, 60 * l.scale], l.dark * 0.8, l.alpha, LEAVES);
      for (let i = 0; i < 34 * l.n; i++) {
        rose(ctx, r() * S, (0.2 + r() * 0.85) * S, (22 + r() * 28) * l.scale, pick(r, reds), l.alpha, l.dark * (0.85 + r() * 0.2));
      }
    });
  },

  tulips(ctx, S, r) {
    backdrop(ctx, S, r, ['#7fa6c9', '#a9c48f', '#3d6b2d'], 'rgba(255,255,235,0.5)');
    const cols = [[230, 40, 60], [250, 180, 30], [240, 110, 160], [250, 120, 40], [150, 60, 170], [255, 245, 230]];
    layers(ctx, S, (l, ctx) => {
      foliage(ctx, S, r, 40 * l.n, [30 * l.scale, 70 * l.scale], l.dark * 0.85, l.alpha, LEAVES, 0.45);
      // tulips planted in loose rows of one colour, like a bulb field
      const rows = 6;
      for (let row = 0; row < rows; row++) {
        const col = pick(r, cols), y0 = (0.35 + row / rows * 0.7) * S;
        for (let i = 0; i < 16 * l.n; i++) {
          tulip(ctx, r() * S, y0 + (r() - 0.5) * 60, (24 + r() * 18) * l.scale * (0.7 + row / rows * 0.6), col, l.alpha, l.dark * (0.85 + r() * 0.2));
        }
      }
    });
  },

  lavender(ctx, S, r) {
    backdrop(ctx, S, r, ['#c9b6d9', '#8d7fb0', '#4b4470'], 'rgba(255,235,210,0.55)');
    const purples = [[140, 110, 200], [120, 90, 180], [165, 135, 215], [105, 80, 160]];
    layers(ctx, S, (l, ctx) => {
      foliage(ctx, S, r, 30 * l.n, [20 * l.scale, 45 * l.scale], l.dark * 0.7, l.alpha * 0.8, [[90, 120, 90], [110, 140, 100]], 0.4);
      // planted in rows that converge toward the horizon
      for (let i = 0; i < 300 * l.n; i++) {
        const row = Math.floor(r() * 9), t = r();
        const x = S * 0.5 + (row - 4) * S * 0.16 * (0.4 + t) + (r() - 0.5) * 40;
        const y = (0.3 + t * 0.8) * S;
        lavender(ctx, x, y, (16 + t * 22) * l.scale, pick(r, purples), l.alpha, l.dark * (0.85 + r() * 0.25), r);
      }
    });
  },

  sunflowers(ctx, S, r) {
    backdrop(ctx, S, r, ['#6fa8dc', '#b8d4a0', '#4c7a32'], 'rgba(255,250,215,0.6)');
    layers(ctx, S, (l, ctx) => {
      foliage(ctx, S, r, 60 * l.n, [34 * l.scale, 80 * l.scale], l.dark * 0.9, l.alpha, LEAVES, 0.35);
      for (let i = 0; i < 28 * l.n; i++) {
        sunflower(ctx, r() * S, (0.22 + r() * 0.8) * S, (20 + r() * 26) * l.scale, l.alpha, l.dark * (0.9 + r() * 0.15), r);
      }
    });
  },

  blossom(ctx, S, r) {
    backdrop(ctx, S, r, ['#dfe9f5', '#f3d9e3', '#b9a3b5'], 'rgba(255,255,255,0.7)');
    const pinks = [[250, 190, 210], [245, 160, 190], [255, 220, 230], [235, 140, 175], [255, 245, 248]];
    layers(ctx, S, (l, ctx) => {
      // dark branches first, then clouds of five-petal blossom along them
      ctx.strokeStyle = rgba([70, 45, 45], l.alpha, l.dark); ctx.lineCap = 'round';
      const twigs = [];
      for (let b = 0; b < 7 * l.n; b++) {
        let x = r() * S, y = S * (0.2 + r() * 0.9), ang = -0.4 - r() * 2.3, w = 14 * l.scale;
        for (let s = 0; s < 9; s++) {
          const nx = x + Math.cos(ang) * 70 * l.scale, ny = y + Math.sin(ang) * 70 * l.scale;
          ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(nx, ny); ctx.stroke();
          twigs.push([nx, ny]); x = nx; y = ny; ang += (r() - 0.5) * 0.8; w *= 0.85;
        }
      }
      for (const [tx, ty] of twigs) {
        for (let f = 0; f < 11; f++) {
          fivePetal(ctx, tx + (r() - 0.5) * 110 * l.scale, ty + (r() - 0.5) * 110 * l.scale, (12 + r() * 14) * l.scale, pick(r, pinks), l.alpha, l.dark * (0.9 + r() * 0.12), [200, 80, 120]);
        }
      }
    });
  },

  meadow(ctx, S, r) {
    backdrop(ctx, S, r, ['#9cc3e0', '#c7d99b', '#557a34'], 'rgba(255,250,225,0.55)');
    const grass = [[110, 150, 60], [90, 130, 50], [140, 170, 70], [70, 110, 45]];
    layers(ctx, S, (l, ctx) => {
      foliage(ctx, S, r, 90 * l.n, [18 * l.scale, 46 * l.scale], l.dark * 0.9, l.alpha, grass, 0.3);
      for (let i = 0; i < 90 * l.n; i++) {
        const x = r() * S, y = (0.3 + r() * 0.75) * S, s = (13 + r() * 18) * l.scale, k = l.dark * (0.9 + r() * 0.15);
        const kind = r();
        if (kind < 0.35) daisy(ctx, x, y, s, [250, 250, 245], l.alpha, k);
        else if (kind < 0.6) poppy(ctx, x, y, s, [225, 45, 35], l.alpha, k);
        else if (kind < 0.8) fivePetal(ctx, x, y, s * 0.8, [70, 110, 220], l.alpha, k, [240, 240, 255]);
        else fivePetal(ctx, x, y, s * 0.7, [250, 210, 40], l.alpha, k, [230, 140, 20]);
      }
    });
  },
};

export function paintGarden(ctx, S, id, seed) {
  const r = rng(seed);
  ctx.save();
  (PAINTERS[id] || PAINTERS.leafy)(ctx, S, r);
  ctx.restore();
}
