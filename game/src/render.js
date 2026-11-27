// Drawing only: the world's state and the current screen in, pixels out. The
// 1280x720 playfield is scaled to fit the window and centred, the margin filled
// with the backdrop colour. A pseudo-3D chase view: sky, sun and clouds, distant
// ridges, a perspective ground grid with a river, the runway ahead, golden target
// rings, the plane in frame, and a lit instrument panel with the HUD.
import { COURSE, FIELD, FONT, PALETTE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const PANEL = { width: 640, top: 132, line: 34, bottom: 72 };
const HORIZON = 300;

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const altLabel = cachedLabel('ALT ');
  const speedLabel = cachedLabel('SPD ');
  const headingLabel = cachedLabel('HDG ');
  const scoreLabel = cachedLabel('SCORE ');
  const ringLabel = cachedLabel('RING ');
  const distLabel = cachedLabel('RWY ');
  const finalLabel = cachedLabel('SCORE ');
  const bestLabel = cachedLabel('BEST ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `bold ${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }
  function plainText(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `bold ${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  /** Project a world point ahead of the plane onto the screen. The chase camera
   * looks slightly down, so near ground — the runway on final approach — drops
   * into the frame instead of collapsing onto the horizon line. */
  function project(state, ahead, lateral, height) {
    const d = ahead + 60;
    const s = 560 / d;
    const camAlt = state.alt + 4;
    return {
      x: FIELD.width / 2 + (lateral - state.x * 0.85) * s * 1.6 - state.heading * 1.4,
      y: HORIZON - (height - camAlt) * s * 1.1 + 90 * (s / (s + 1.2)),
      s,
    };
  }

  function groundPoint(state, ahead, lateral) {
    const height = state.groundHeight
      ? state.groundHeight(state.dist + ahead, lateral)
      : 6;
    return project(state, ahead, lateral, height);
  }

  function drawSky(state, time) {
    const sky = context.createLinearGradient(0, 0, 0, HORIZON + 40);
    sky.addColorStop(0, PALETTE.skyTop);
    sky.addColorStop(0.55, PALETTE.skyMid);
    sky.addColorStop(1, PALETTE.skyHorizon);
    context.fillStyle = sky;
    context.fillRect(0, 0, FIELD.width, HORIZON + 40);
    // Sun with a warm glow, low over the sea haze.
    const glow = context.createRadialGradient(1020, 118, 8, 1020, 118, 120);
    glow.addColorStop(0, PALETTE.sun);
    glow.addColorStop(0.35, PALETTE.sunGlow);
    glow.addColorStop(1, 'rgba(255,158,94,0)');
    context.fillStyle = glow;
    context.fillRect(880, 0, 280, 260);
    context.fillStyle = PALETTE.sun;
    context.beginPath();
    context.arc(1020, 118, 34, 0, Math.PI * 2);
    context.fill();
    // Clouds drift with the distance flown.
    context.fillStyle = 'rgba(255,244,230,0.85)';
    for (let i = 0; i < 9; i += 1) {
      const cx = (((i * 173 + state.dist * 0.22) % 1500) + 1500) % 1500 - 110;
      const cy = 52 + ((i * 47) % 150);
      const cw = 90 + ((i * 31) % 70);
      context.beginPath();
      context.ellipse(cx, cy, cw, 16 + ((i * 13) % 10), 0, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.ellipse(cx + cw * 0.4, cy + 8, cw * 0.55, 12, 0, 0, Math.PI * 2);
      context.fill();
    }
    void time;
  }

  function drawRidges(state) {
    // Two jagged ridge layers, the far one paler, sliding with the distance flown.
    for (let layer = 0; layer < 2; layer += 1) {
      const base = HORIZON - (layer === 0 ? 6 : 34);
      const amp = layer === 0 ? 26 : 52;
      const shift = (state.dist * (layer === 0 ? 0.06 : 0.12)) % 320;
      context.fillStyle = layer === 0 ? PALETTE.ridgeFar : PALETTE.ridgeNear;
      context.beginPath();
      context.moveTo(0, HORIZON + 42);
      for (let x = -320; x <= FIELD.width + 320; x += 80) {
        const peak = base - Math.abs(Math.sin((x + shift) * 0.011 + layer * 2.1)) * amp
          - Math.abs(Math.sin((x + shift) * 0.004 + layer)) * amp * 0.5;
        context.lineTo(x, peak);
      }
      context.lineTo(FIELD.width, HORIZON + 42);
      context.closePath();
      context.fill();
      // Snow on the near ridge's highest teeth.
      if (layer === 1) {
        context.fillStyle = 'rgba(238,241,245,0.85)';
        for (let x = -320; x <= FIELD.width + 320; x += 160) {
          const peak = base - Math.abs(Math.sin((x + shift) * 0.011 + 2.1)) * amp
            - Math.abs(Math.sin((x + shift) * 0.004 + 1)) * amp * 0.5;
          context.beginPath();
          context.moveTo(x - 14, peak + 12);
          context.lineTo(x, peak);
          context.lineTo(x + 14, peak + 12);
          context.closePath();
          context.fill();
        }
      }
    }
  }

  function drawGround(state) {
    const camGround = state.groundHeight ? state.groundHeight(state.dist, state.x) : 6;
    const camAbove = Math.max(3, state.alt + 4 - camGround);
    const horizonY = HORIZON + 2;
    // The ground sheet: deep green near the plane, hazy at the horizon.
    const ground = context.createLinearGradient(0, horizonY, 0, FIELD.height);
    ground.addColorStop(0, PALETTE.groundFar);
    ground.addColorStop(1, PALETTE.groundNear);
    context.fillStyle = ground;
    context.fillRect(0, horizonY, FIELD.width, FIELD.height - horizonY);
    // Patchwork fields: alternating light and dark strips across the valley.
    context.fillStyle = PALETTE.fieldLight;
    for (let i = 0; i < 7; i += 1) {
      const stripX = ((i * 211 + state.dist * 0.4) % 1400) - 60;
      context.globalAlpha = 0.25;
      context.fillRect(stripX, horizonY, 90, FIELD.height - horizonY);
    }
    context.globalAlpha = 1;
    // Perspective grid: longitudinal lines fan from the vanishing point.
    const vx = FIELD.width / 2 - state.heading * 1.4;
    context.strokeStyle = 'rgba(238,241,245,0.28)';
    context.lineWidth = 1;
    for (let lane = -6; lane <= 6; lane += 1) {
      context.beginPath();
      context.moveTo(vx, horizonY);
      context.lineTo(FIELD.width / 2 + (lane * 60 - state.x * 2.2) * 3.4, FIELD.height);
      context.stroke();
    }
    // Transverse lines, close together near the horizon, far apart near the plane.
    const zs = [14, 22, 36, 58, 95, 155, 260, 440, 780];
    context.strokeStyle = 'rgba(238,241,245,0.2)';
    for (const z of zs) {
      const y = horizonY + (380 * camAbove) / z;
      if (y > FIELD.height + 4) continue;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(FIELD.width, y);
      context.stroke();
    }
    // The river: a blue band winding down the valley, drawn as projected quads.
    const riverZs = [30, 60, 110, 200, 360, 650, 1100];
    context.fillStyle = PALETTE.river;
    for (let i = 0; i < riverZs.length - 1; i += 1) {
      const z0 = riverZs[i];
      const z1 = riverZs[i + 1];
      const cx0 = 46 * Math.sin((state.dist + z0) * 0.0021);
      const cx1 = 46 * Math.sin((state.dist + z1) * 0.0021);
      const a = groundPoint(state, z0, cx0 - 11);
      const b = groundPoint(state, z0, cx0 + 11);
      const c = groundPoint(state, z1, cx1 + 11);
      const d = groundPoint(state, z1, cx1 - 11);
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.lineTo(c.x, c.y);
      context.lineTo(d.x, d.y);
      context.closePath();
      context.fill();
    }
  }

  function drawRunway(state) {
    const toRunway = COURSE.length - state.dist;
    if (toRunway < -620 || toRunway > 1600) return;
    const nearZ = Math.max(16, toRunway);
    const farZ = toRunway + 560;
    const gh = (ahead, lateral) => groundPoint(state, ahead, lateral);
    const hw = COURSE.runwayHalfWidth;
    const a = gh(nearZ, -hw);
    const b = gh(nearZ, hw);
    const c = gh(farZ, hw);
    const d = gh(farZ, -hw);
    context.fillStyle = PALETTE.runway;
    context.beginPath();
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.lineTo(c.x, c.y);
    context.lineTo(d.x, d.y);
    context.closePath();
    context.fill();
    // Centreline dashes and the threshold bars.
    context.fillStyle = PALETTE.runwayMark;
    for (let z = nearZ + 30; z < farZ - 20; z += 90) {
      const p0 = gh(z, -2);
      const p1 = gh(z + 42, 2);
      context.fillRect(Math.min(p0.x, p1.x), Math.min(p0.y, p1.y), Math.max(3, Math.abs(p1.x - p0.x)), Math.max(3, Math.abs(p1.y - p0.y)));
    }
    const t0 = gh(Math.max(16, toRunway + 8), -hw + 2);
    const t1 = gh(Math.max(16, toRunway + 8), hw - 2);
    context.fillRect(Math.min(t0.x, t1.x), Math.min(t0.y, t1.y), Math.abs(t1.x - t0.x), 4);
    text('27', (a.x + b.x) / 2, (a.y + b.y) / 2 + 8, 26, PALETTE.runwayMark, 'center');
  }

  function drawFeatures(state) {
    // Peaks, trees and balloons, far to near so near ones paint over far ones.
    const items = [];
    for (const peak of state.peaks) {
      const ahead = peak.d - state.dist;
      if (ahead < -40 || ahead > 1500) continue;
      items.push({ ahead, kind: 'peak', peak });
    }
    for (const tree of state.trees) {
      const ahead = tree.d - state.dist;
      if (ahead < 10 || ahead > 900) continue;
      items.push({ ahead, kind: 'tree', tree });
    }
    for (const balloon of state.balloons) {
      const ahead = balloon.d - state.dist;
      if (ahead < 10 || ahead > 1200) continue;
      items.push({ ahead, kind: 'balloon', balloon });
    }
    items.sort((a, b) => b.ahead - a.ahead);
    for (const item of items) {
      if (item.kind === 'peak') {
        const p = item.peak;
        const base = project(state, item.ahead, p.x, state.groundHeight ? state.groundHeight(p.d, p.x) : 6);
        const w = Math.max(8, p.r * base.s * 2.4);
        const h = Math.max(10, p.h * base.s * 1.5);
        context.fillStyle = '#42586e';
        context.beginPath();
        context.moveTo(base.x - w / 2, base.y);
        context.lineTo(base.x, base.y - h);
        context.lineTo(base.x + w / 2, base.y);
        context.closePath();
        context.fill();
        context.fillStyle = 'rgba(238,241,245,0.9)';
        context.beginPath();
        context.moveTo(base.x - w * 0.16, base.y - h * 0.68);
        context.lineTo(base.x, base.y - h);
        context.lineTo(base.x + w * 0.16, base.y - h * 0.68);
        context.closePath();
        context.fill();
      } else if (item.kind === 'tree') {
        const t = item.tree;
        const base = project(state, item.ahead, t.x, state.groundHeight ? state.groundHeight(t.d, t.x) : 6);
        const h = Math.max(4, 26 * base.s);
        context.fillStyle = '#2c5d2e';
        context.beginPath();
        context.moveTo(base.x - h * 0.4, base.y);
        context.lineTo(base.x, base.y - h);
        context.lineTo(base.x + h * 0.4, base.y);
        context.closePath();
        context.fill();
      } else {
        const b = item.balloon;
        const pos = project(state, item.ahead, b.x, b.alt);
        const r = Math.max(5, 15 * pos.s);
        context.fillStyle = '#e5534b';
        context.beginPath();
        context.arc(pos.x, pos.y, r, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#f2c94c';
        context.beginPath();
        context.arc(pos.x, pos.y, r * 0.55, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = '#3a3f4a';
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(pos.x - r * 0.5, pos.y + r * 0.8);
        context.lineTo(pos.x, pos.y + r * 1.7);
        context.lineTo(pos.x + r * 0.5, pos.y + r * 0.8);
        context.stroke();
      }
    }
  }

  function drawRings(state) {
    const rings = state.rings;
    for (let i = rings.length - 1; i >= 0; i -= 1) {
      const ring = rings[i];
      if (ring.done) continue;
      const ahead = ring.d - state.dist;
      if (ahead < 8 || ahead > 1600) continue;
      const pos = project(state, ahead, ring.x, ring.alt);
      const radius = Math.max(4, 16 * pos.s * 1.6);
      const isNext = i === state.ringIndex;
      context.save();
      context.shadowColor = isNext ? PALETTE.ringGlow : PALETTE.ringGold;
      context.shadowBlur = isNext ? 26 : 10;
      context.strokeStyle = isNext ? PALETTE.ringGold : 'rgba(255,201,60,0.75)';
      context.lineWidth = Math.max(2, radius * 0.16);
      context.beginPath();
      context.ellipse(pos.x, pos.y, radius, radius * 0.92, 0, 0, Math.PI * 2);
      context.stroke();
      context.restore();
      if (isNext) {
        text('NEXT RING', pos.x, pos.y - radius - 12, 15, PALETTE.ringGold, 'center');
        // A chevron above the plane points at the next ring.
        const dx = ring.x - state.x;
        const da = ring.alt - state.alt;
        const angle = Math.atan2(da, dx);
        void angle;
      }
    }
  }

  function drawPlane(state, time) {
    const px = FIELD.width / 2;
    const py = 512;
    const blink = Math.floor(time / 500) % 2 === 0;
    context.save();
    context.translate(px, py);
    context.rotate(-state.bank * 0.38);
    const scale = 1 + state.speed / 320;
    context.scale(scale, scale);
    // Engine glow, brighter with the throttle.
    const glow = context.createRadialGradient(0, 26, 2, 0, 26, 34 + state.throttle * 26);
    glow.addColorStop(0, 'rgba(255,179,71,0.9)');
    glow.addColorStop(1, 'rgba(255,179,71,0)');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(0, 26, 34 + state.throttle * 26, 0, Math.PI * 2);
    context.fill();
    // Wings, swept back, seen from behind.
    context.fillStyle = PALETTE.planeBody;
    context.beginPath();
    context.moveTo(-14, 8);
    context.lineTo(-118, 34);
    context.lineTo(-112, 48);
    context.lineTo(-10, 26);
    context.closePath();
    context.fill();
    context.beginPath();
    context.moveTo(14, 8);
    context.lineTo(118, 34);
    context.lineTo(112, 48);
    context.lineTo(10, 26);
    context.closePath();
    context.fill();
    // Wingtip lights: red left, green right, blinking.
    if (blink) {
      context.fillStyle = '#ff5a4e';
      context.beginPath();
      context.arc(-116, 40, 5, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#39ff88';
      context.beginPath();
      context.arc(116, 40, 5, 0, Math.PI * 2);
      context.fill();
    }
    // Tail fin and stabilisers.
    context.fillStyle = PALETTE.planeAccent;
    context.beginPath();
    context.moveTo(-8, -6);
    context.lineTo(0, -52);
    context.lineTo(8, -6);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.planeBody;
    context.beginPath();
    context.moveTo(-34, -2);
    context.lineTo(-52, -14);
    context.lineTo(-48, -6);
    context.lineTo(-30, 6);
    context.closePath();
    context.fill();
    context.beginPath();
    context.moveTo(34, -2);
    context.lineTo(52, -14);
    context.lineTo(48, -6);
    context.lineTo(30, 6);
    context.closePath();
    context.fill();
    // Fuselage and the lit canopy.
    context.fillStyle = PALETTE.planeBody;
    context.beginPath();
    context.ellipse(0, 6, 26, 34, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.planeGlass;
    context.beginPath();
    context.ellipse(0, -12, 13, 20, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(57,255,136,0.85)';
    context.beginPath();
    context.ellipse(-4, -16, 4, 7, 0, 0, Math.PI * 2);
    context.fill();
    // Twin exhausts.
    context.fillStyle = '#2c3648';
    context.beginPath();
    context.arc(-11, 30, 6, 0, Math.PI * 2);
    context.arc(11, 30, 6, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.planeGlow;
    context.beginPath();
    context.arc(-11, 30, 3.5, 0, Math.PI * 2);
    context.arc(11, 30, 3.5, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawDial(cx, cy, r, label, value, max, unit) {
    context.fillStyle = PALETTE.panel;
    context.beginPath();
    context.arc(cx, cy, r, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.stroke();
    for (let i = 0; i <= 10; i += 1) {
      const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
      const x0 = cx + Math.cos(a) * (r - 6);
      const y0 = cy + Math.sin(a) * (r - 6);
      const x1 = cx + Math.cos(a) * (r - 12);
      const y1 = cy + Math.sin(a) * (r - 12);
      context.strokeStyle = PALETTE.instrument;
      context.lineWidth = i % 5 === 0 ? 2 : 1;
      context.beginPath();
      context.moveTo(x0, y0);
      context.lineTo(x1, y1);
      context.stroke();
    }
    const frac = Math.max(0, Math.min(1, value / max));
    const angle = Math.PI * 0.75 + frac * Math.PI * 1.5;
    context.strokeStyle = PALETTE.instrumentAmber;
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(cx, cy);
    context.lineTo(cx + Math.cos(angle) * (r - 16), cy + Math.sin(angle) * (r - 16));
    context.stroke();
    context.fillStyle = PALETTE.instrument;
    context.beginPath();
    context.arc(cx, cy, 4, 0, Math.PI * 2);
    context.fill();
    text(label, cx, cy + r + 14, 13, PALETTE.muted, 'center');
    text(unit, cx, cy - 6, 13, PALETTE.text, 'center');
  }

  function drawInstruments(state, time) {
    // The instrument panel: a dark strip with lit dials along the bottom.
    context.fillStyle = PALETTE.panel;
    context.fillRect(0, 596, FIELD.width, 124);
    context.fillStyle = PALETTE.panelEdge;
    context.fillRect(0, 596, FIELD.width, 3);
    // Artificial horizon.
    const hx = 96;
    const hy = 648;
    context.save();
    context.beginPath();
    context.arc(hx, hy, 42, 0, Math.PI * 2);
    context.clip();
    context.translate(hx, hy);
    context.rotate(-state.bank * 0.5);
    context.fillStyle = '#2e6f9e';
    context.fillRect(-46, -46 - state.bank * 0 + (state.alt % 20) * 0, 92, 46);
    context.fillStyle = '#7a5230';
    context.fillRect(-46, 0, 92, 46);
    context.fillStyle = '#eef1f5';
    context.fillRect(-46, -2, 92, 3);
    context.restore();
    context.strokeStyle = PALETTE.instrument;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(hx, hy, 42, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.moveTo(hx - 12, hy);
    context.lineTo(hx + 12, hy);
    context.stroke();
    text('HORIZON', hx, hy + 56, 12, PALETTE.muted, 'center');
    // Altimeter and airspeed dials, needles lit amber.
    drawDial(216, 648, 40, 'ALTITUDE', state.alt, 260, `${Math.round(state.alt * 3.281)} FT`);
    drawDial(330, 648, 40, 'AIRSPEED', state.speed * 1.944, 150, `${Math.round(state.speed * 1.944)} KT`);
    // Compass tape.
    const cx = 640;
    context.fillStyle = '#0b0f18';
    context.fillRect(cx - 150, 622, 300, 44);
    context.strokeStyle = PALETTE.panelEdge;
    context.strokeRect(cx - 150, 622, 300, 44);
    const headings = ['N', '030', '060', 'E', '120', '150', 'S', '210', '240', 'W', '300', '330'];
    for (let i = 0; i < 12; i += 1) {
      const deg = i * 30;
      let diff = ((deg - state.heading + 540) % 360) - 180;
      const x = cx + diff * 2.4;
      if (x < cx - 145 || x > cx + 145) continue;
      text(headings[i], x, 652, 14, deg % 90 === 0 ? PALETTE.instrument : PALETTE.muted, 'center');
    }
    context.fillStyle = PALETTE.instrumentAmber;
    context.beginPath();
    context.moveTo(cx - 7, 622);
    context.lineTo(cx + 7, 622);
    context.lineTo(cx, 634);
    context.closePath();
    context.fill();
    text('HEADING', cx, 678, 12, PALETTE.muted, 'center');
    // Throttle and fuel bars.
    const tx = 1010;
    context.fillStyle = '#0b0f18';
    context.fillRect(tx, 618, 22, 76);
    context.fillStyle = PALETTE.instrument;
    context.fillRect(tx, 618 + (1 - state.throttle) * 76, 22, state.throttle * 76);
    text('THR', tx + 11, 706, 12, PALETTE.muted, 'center');
    const fx = 1060;
    context.fillStyle = '#0b0f18';
    context.fillRect(fx, 618, 22, 76);
    const fuelLow = state.fuel < 25 && Math.floor(time / 400) % 2 === 0;
    context.fillStyle = fuelLow ? PALETTE.instrumentRed : PALETTE.instrumentAmber;
    context.fillRect(fx, 618 + (1 - state.fuel / 100) * 76, 22, (state.fuel / 100) * 76);
    text('FUEL', fx + 11, 706, 12, PALETTE.muted, 'center');
    // Hull: three lit pips.
    for (let i = 0; i < 3; i += 1) {
      context.fillStyle = i < state.hull ? PALETTE.instrumentRed : '#3a3f4a';
      context.beginPath();
      context.arc(1150 + i * 26, 640, 9, 0, Math.PI * 2);
      context.fill();
    }
    text('HULL', 1176, 668, 12, PALETTE.muted, 'center');
    text(`RING ${state.ringsHit}/${COURSE.rings}`, 1176, 692, 13, PALETTE.ringGold, 'center');
  }

  function drawHud(state) {
    context.textBaseline = 'top';
    text(altLabel(Math.round(state.alt * 3.281)), 24, 18, 26, PALETTE.text, 'left');
    text('FT', 24, 48, 14, PALETTE.muted, 'left');
    text(speedLabel(Math.round(state.speed * 1.944)), 190, 18, 26, PALETTE.text, 'left');
    text('KT', 190, 48, 14, PALETTE.muted, 'left');
    const headingDeg = Math.round(((state.heading % 360) + 360) % 360);
    text(headingLabel(String(headingDeg).padStart(3, '0')), 356, 18, 26, PALETTE.text, 'left');
    text('DEG', 356, 48, 14, PALETTE.muted, 'left');
    text(scoreLabel(Math.round(state.score)), FIELD.width / 2, 18, 26, PALETTE.text, 'center');
    const toRunway = Math.max(0, Math.round(COURSE.length - state.dist));
    text(distLabel(`${toRunway} M`), FIELD.width - 24, 18, 26, PALETTE.text, 'right');
    text(ringLabel(`${state.ringsHit}/${COURSE.rings}`), FIELD.width - 24, 48, 14, PALETTE.ringGold, 'right');
    // Next-ring pointer: a small arrow at the top edge pointing at the next ring.
    const ring = state.ringIndex < state.rings.length ? state.rings[state.ringIndex] : null;
    if (ring) {
      const dx = ring.x - state.x;
      const arrowX = FIELD.width / 2 + Math.max(-420, Math.min(420, dx * 4));
      context.fillStyle = PALETTE.ringGold;
      context.beginPath();
      context.moveTo(arrowX, 84);
      context.lineTo(arrowX - 9, 70);
      context.lineTo(arrowX + 9, 70);
      context.closePath();
      context.fill();
    }
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2 - 40;
    context.fillStyle = 'rgba(20,26,38,0.92)';
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    plainText(title, FIELD.width / 2, y + 78, 46, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      plainText(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 21, PALETTE.muted, 'center');
    }
    plainText(prompt, FIELD.width / 2, y + height - 38, 23, PALETTE.coin, 'center');
  }

  const TITLE_LINES = [
    'Fly the island run: thread 12 golden rings, mind your fuel,',
    'and put her down on runway 27 at the far airfield.',
    'Steer with ← → or the mouse. Climb W, descend S.',
    'Throttle E / Q, boost with Shift. Pause with P.',
    '',
  ];
  const PAUSED_LINES = ['The sky will wait for you.'];
  const OVER_LINES = ['', ''];
  const WIN_LINES = ['', ''];

  /** Paint one frame: the sky, the world, the plane, the instruments and the HUD. */
  function draw(state, screen, best, time) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawSky(state, time);
    drawRidges(state);
    drawGround(state);
    drawRunway(state);
    drawFeatures(state);
    // The title screen shows the parked plane and the strip, not the rings.
    if (screen !== SCREEN_TITLE) drawRings(state);
    drawPlane(state, time);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[4] = bestLabel(best);
      drawPanel('MERIDIAN SKY', TITLE_LINES, 'Press Space or click to take off');
      return;
    }
    drawHud(state);
    drawInstruments(state, time);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
    } else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(Math.round(state.score));
      OVER_LINES[1] = bestLabel(best);
      drawPanel('Down in the hills', OVER_LINES, 'Press Space or click to fly again');
    } else if (screen === SCREEN_WIN) {
      WIN_LINES[0] = finalLabel(Math.round(state.score));
      WIN_LINES[1] = bestLabel(best);
      drawPanel('Runway 27 — landed!', WIN_LINES, 'Press Space or click to fly again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
