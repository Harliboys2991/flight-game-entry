// The screenshot scenes behind ?shot=start|play|rings|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot (aim at the next ring, keep clear of the hills, line up for
// the runway at the end), so the frame is what a short flight really looks like
// and the same seed always gives the same frame.
import { COURSE, STEP } from './config.js';
import { EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 2;
const PLAY_SECONDS = 34;
const RINGS_SECONDS = 20;
const END_LIMIT_SECONDS = 600;

/** Steer toward the next ring, or toward the runway when the rings are done. */
export function autopilot(state, world) {
  const ring = world.nextRing();
  const toRunway = COURSE.length - state.dist;
  let targetX = 0;
  let targetAlt = 95;
  let throttle = 0.85;
  if (ring !== null && toRunway > 600) {
    targetX = ring.x;
    // Never aim below the hills between here and the ring: clear the highest
    // ground on the way by 28 m, not just the ground under the ring itself.
    let maxGround = world.groundHeight(ring.d, ring.x);
    for (let d = state.dist + 80; d < ring.d; d += 80) {
      const along = state.x + ((ring.x - state.x) * (d - state.dist)) / Math.max(1, ring.d - state.dist);
      maxGround = Math.max(maxGround, world.groundHeight(d, along));
    }
    targetAlt = Math.max(ring.alt, maxGround + 28);
  } else {
    // Final approach: centre on the runway and come down to the threshold,
    // measured above the ground at the threshold, not above sea level.
    targetX = 0;
    targetAlt = world.groundHeight(state.dist, 0) + Math.max(2, (toRunway - 60) * 0.03);
    throttle = 0.5;
  }
  // Look well ahead: if the hills in front are higher than the plane, pull up
  // early and slide sideways toward the lower ground. On the final approach
  // this is switched off: the runway line is deliberately low over low hills,
  // and dodging there only pushes the plane off the centreline.
  const onApproach = toRunway <= 600;
  const aheadGround = world.groundHeight(state.dist + 260, state.x);
  const leftGround = world.groundHeight(state.dist + 260, state.x - 55);
  const rightGround = world.groundHeight(state.dist + 260, state.x + 55);
  const steerGain = onApproach ? 18 : 28;
  let steer = Math.max(-1, Math.min(1, (targetX - state.x) / steerGain));
  let pitch = Math.max(-1, Math.min(1, (targetAlt - state.alt) / 22));
  if (!onApproach && aheadGround > state.alt - 18) {
    pitch = 1;
    steer = leftGround < rightGround ? -0.7 : 0.7;
  }
  // Hard floor: never let the ground 180 m ahead get within 18 m of the plane.
  if (!onApproach && world.groundHeight(state.dist + 180, state.x) + 18 > state.alt) pitch = 1;
  // Never climb through the ceiling on the approach.
  if (toRunway <= 600 && state.alt > targetAlt + 12) pitch = -1;
  // step() takes the throttle as a change per second, so scale the gap up.
  return { steer, pitch, throttle: (throttle - state.throttle) * 4, boost: false };
}

function flyFor(world, seconds, landing) {
  let events = 0;
  const steps = Math.floor(seconds / STEP);
  for (let index = 0; index < steps; index += 1) {
    const ctrl = autopilot(world.state, world);
    events |= world.step(STEP, ctrl, false);
    if (world.state.landed || world.state.over) break;
  }
  void landing;
  return events;
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the
 * best score to show. Any name that is not play, rings or end is the start scene.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    flyFor(world, PLAY_SECONDS);
    return { screen: SCREEN_PLAY, best: Math.round(world.state.score) };
  }
  if (name === 'rings') {
    // Fly until the next ring is close ahead, so the hoop fills the frame.
    flyFor(world, RINGS_SECONDS);
    const ring = world.nextRing();
    if (ring !== null) {
      let guard = 0;
      while (ring.d - world.state.dist > 150 && guard < 60 * 60) {
        const ctrl = autopilot(world.state, world);
        world.step(STEP, ctrl, false);
        guard += 1;
        if (world.state.landed || world.state.over) break;
      }
    }
    return { screen: SCREEN_PLAY, best: Math.round(world.state.score) };
  }
  if (name === 'end') {
    const events = flyFor(world, END_LIMIT_SECONDS);
    const won = world.state.landed || (events & EVENT_WIN) !== 0;
    const over = world.state.over || (events & EVENT_OVER) !== 0;
    return { screen: won ? SCREEN_WIN : over ? SCREEN_OVER : SCREEN_PLAY, best: Math.round(world.state.score) };
  }
  // Start: the plane waits on the runway at the island strip, engines idling.
  for (let index = 0; index < START_SECONDS / STEP; index += 1) {
    world.step(STEP, { steer: 0, pitch: 0, throttle: -1, boost: false }, true);
  }
  return { screen: SCREEN_TITLE, best: 0 };
}
