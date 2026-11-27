// The flight rules and state, with no drawing and no browser in it: the plane, the
// course, the rings, the fuel and the hull. step() advances one fixed step and
// returns what happened as bit flags, so the caller can react without the world
// knowing about screens or sound. Nothing here allocates after createWorld returns.
import { COURSE, FUEL, HULL, PLANE, POOL, RING, SCORE } from './config.js';

export const EVENT_RING = 1;
export const EVENT_NEAR = 2;
export const EVENT_HIT = 4;
export const EVENT_OVER = 8;
export const EVENT_WIN = 16;

function clamp(value, low, high) {
  return value < low ? low : value > high ? value : value;
}

export function createWorld(random) {
  const peaks = [];
  const trees = [];
  const balloons = [];
  const rings = [];
  for (let i = 0; i < POOL.peaks; i += 1) {
    peaks.push({ d: 0, x: 0, r: 0, h: 0 });
  }
  for (let i = 0; i < POOL.trees; i += 1) {
    trees.push({ d: 0, x: 0 });
  }
  for (let i = 0; i < POOL.balloons; i += 1) {
    balloons.push({ d: 0, x: 0, alt: 0 });
  }
  for (let i = 0; i < COURSE.rings; i += 1) {
    rings.push({ d: 0, x: 0, alt: 0, done: false, centre: false });
  }

  const state = {
    // The renderer reads the ground height through the state, so it can project
    // the river, the runway and the peaks onto the same terrain the plane flies.
    groundHeight: null,
    dist: 0,
    x: 0,
    alt: 2,
    heading: 0,
    bank: 0,
    speed: 0,
    throttle: 0.6,
    fuel: FUEL.start,
    hull: HULL.max,
    score: 0,
    ringsHit: 0,
    ringIndex: 0,
    elapsed: 0,
    invulnerable: 0,
    landed: false,
    over: false,
    peaks,
    trees,
    balloons,
    rings,
  };

  /** Rolling hills under everything, before the peaks are added. */
  function baseGround(dist) {
    return 6 + 4 * Math.sin(dist * 0.003 + 1.7) + 3 * Math.sin(dist * 0.011 + 0.4);
  }

  /** Height of the ground (hills plus peaks) at a point on the course. */
  function groundHeight(dist, x) {
    let height = baseGround(dist);
    for (let i = 0; i < peaks.length; i += 1) {
      const peak = peaks[i];
      const dd = dist - peak.d;
      if (dd < -peak.r || dd > peak.r) continue;
      const dx = x - peak.x;
      if (dx < -peak.r || dx > peak.r) continue;
      const fall = (dd * dd + dx * dx) / (peak.r * peak.r);
      if (fall < 1) height += peak.h * (1 - fall);
    }
    return height;
  }

  function generate() {
    let d = 320;
    for (let i = 0; i < peaks.length; i += 1) {
      d += 90 + random() * 110;
      const nearRunway = d > COURSE.length - 700;
      peaks[i].d = Math.min(d, COURSE.length + 300);
      peaks[i].x = (random() * 2 - 1) * (COURSE.corridor + 40);
      peaks[i].r = 45 + random() * 55;
      // Keep the runway approach clear: low hills only near the far airfield.
      peaks[i].h = nearRunway ? 8 + random() * 10 : 26 + random() * 62;
    }
    for (let i = 0; i < trees.length; i += 1) {
      trees[i].d = 150 + random() * (COURSE.length + 200);
      trees[i].x = (random() * 2 - 1) * (COURSE.corridor + 60);
    }
    for (let i = 0; i < balloons.length; i += 1) {
      balloons[i].d = 600 + random() * (COURSE.length - 1200);
      balloons[i].x = (random() * 2 - 1) * 100;
      balloons[i].alt = 90 + random() * 90;
    }
    for (let i = 0; i < rings.length; i += 1) {
      rings[i].d = 420 + i * 430;
      rings[i].x = 72 * Math.sin(i * 1.1 + 0.5);
      rings[i].alt = 95 + 55 * Math.sin(i * 0.7 + 1.0);
      rings[i].done = false;
      rings[i].centre = false;
    }
  }

  function reset() {
    state.groundHeight = groundHeight;
    generate();
    state.dist = 0;
    state.x = 0;
    // Park on the island strip: just above the ground at the threshold.
    state.alt = groundHeight(0, 0) + 2;
    state.heading = 0;
    state.bank = 0;
    state.speed = 0;
    state.throttle = 0.6;
    state.fuel = FUEL.start;
    state.hull = HULL.max;
    state.score = 0;
    state.ringsHit = 0;
    state.ringIndex = 0;
    state.elapsed = 0;
    state.invulnerable = 0;
    state.landed = false;
    state.over = false;
  }

  function nextRing() {
    return state.ringIndex < rings.length ? rings[state.ringIndex] : null;
  }

  /**
   * One fixed step. ctrl holds steer (-1..1), pitch (-1..1), throttle (-1..1, a
   * change, not a setting) and boost (true while held). With `harmless` set (the
   * title screen's backdrop) the plane flies on but nothing scores and nothing
   * can hurt it.
   */
  function step(dt, ctrl, harmless) {
    let events = 0;
    if (state.landed || state.over) return events;
    state.elapsed += dt;

    if (state.fuel > 0) {
      state.throttle = clamp(state.throttle + ctrl.throttle * 0.5 * dt, 0, 1);
    } else {
      state.throttle = Math.max(0, state.throttle - dt * 0.5);
    }
    const boosting = ctrl.boost && state.fuel > 0;
    const targetSpeed = boosting ? PLANE.boostSpeed : state.throttle * PLANE.maxSpeed;
    state.speed += (targetSpeed - state.speed) * Math.min(1, dt * 0.8);
    if (state.speed < 0) state.speed = 0;

    const turn = ctrl.steer * PLANE.turnRate * (0.45 + 0.55 * (state.speed / PLANE.maxSpeed));
    state.heading = clamp(state.heading + turn * dt, -48, 48);
    state.bank += (ctrl.steer - state.bank) * Math.min(1, dt * 6);
    state.x += (ctrl.steer * PLANE.lateralSpeed + Math.sin((state.heading * Math.PI) / 180) * state.speed * 0.55) * dt;
    if (state.x > COURSE.corridor) {
      state.x = COURSE.corridor;
      state.heading = Math.min(state.heading, 0);
    } else if (state.x < -COURSE.corridor) {
      state.x = -COURSE.corridor;
      state.heading = Math.max(state.heading, 0);
    }

    let vertical = 0;
    if (state.speed > PLANE.stallSpeed) {
      vertical = ctrl.pitch * PLANE.climbRate * (0.3 + 0.7 * (state.speed / PLANE.maxSpeed));
    } else {
      vertical = -PLANE.sinkRate + ctrl.pitch * PLANE.climbRate * 0.25;
    }
    // Below flying speed the wings give no lift, but the plane is on its
    // wheels, not falling: never let a slow plane sink below 6 m over the
    // ground it is rolling on.
    if (state.speed < PLANE.stallSpeed && state.alt <= groundHeight(state.dist, state.x) + 6) {
      vertical = Math.max(0, vertical);
    }
    state.alt = clamp(state.alt + vertical * dt, 0, PLANE.maxAlt);
    // On the departure strip the plane rolls on its wheels: while it is still
    // slow and close to the strip, let it follow the strip's gentle rise
    // instead of clipping the first bump and counting it as a crash.
    if (state.dist < 300 && state.alt <= groundHeight(state.dist, state.x) + 2) {
      state.alt = groundHeight(state.dist, state.x) + 2;
    }

    const burn = FUEL.idleBurn + state.throttle * FUEL.burn + (boosting ? PLANE.boostDrain : 0);
    state.fuel = Math.max(0, state.fuel - burn * dt);

    state.dist += state.speed * dt;
    if (!harmless) state.score += (state.speed * dt) / 10;
    if (state.invulnerable > 0) state.invulnerable = Math.max(0, state.invulnerable - dt);

    // Flying through the next ring, or just past it.
    const ring = nextRing();
    if (ring !== null && state.dist >= ring.d) {
      const dx = state.x - ring.x;
      const da = state.alt - ring.alt;
      const gap = Math.sqrt(dx * dx + da * da);
      ring.done = true;
      if (gap <= RING.radius) {
        ring.centre = true;
        state.ringsHit += 1;
        if (!harmless) {
          state.score += SCORE.ringCentre;
          state.fuel = Math.min(100, state.fuel + FUEL.ringBonus);
          events |= EVENT_RING;
        }
      } else if (gap <= RING.nearRadius) {
        if (!harmless) {
          state.score += SCORE.ringNear;
          events |= EVENT_NEAR;
        }
      }
      state.ringIndex += 1;
    }

    const ground = groundHeight(state.dist, state.x);
    const inRunwayZone = state.dist >= COURSE.length - 60 && state.dist <= COURSE.length + 600;
    // Touching down counts a little above the scrape line, so a gentle
    // landing is not read as a crash.
    if (state.alt <= ground + 4 && inRunwayZone) {
      if (
        Math.abs(state.x) <= COURSE.runwayHalfWidth + 4 &&
        state.speed <= 32 &&
        vertical > -7
      ) {
        state.landed = true;
        state.alt = ground + 1;
        if (!harmless) {
          state.score += SCORE.landing + SCORE.landingBonusPerHull * state.hull;
          state.score += Math.max(0, SCORE.parSeconds - state.elapsed) * SCORE.timeBonusPerSecond;
          events |= EVENT_WIN;
        }
      }
    }
    if (!state.landed && state.alt <= ground + PLANE.minSafeAlt) {
      if (!harmless && state.invulnerable === 0) {
        state.hull -= 1;
        state.invulnerable = 2;
        state.alt = ground + 18;
        state.speed *= 0.7;
        events |= EVENT_HIT;
        if (state.hull <= 0) {
          state.over = true;
          events |= EVENT_OVER;
        }
      } else if (harmless) {
        state.alt = ground + 18;
      }
    }

    // Ran past the runway without landing, or out of fuel over the hills.
    if (!state.landed && state.dist > COURSE.length + 600) {
      state.over = true;
      if (!harmless) events |= EVENT_OVER;
    }
    return events;
  }

  reset();
  return { state, reset, step, groundHeight, nextRing };
}
