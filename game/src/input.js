// Keyboard and pointer input. Held keys give steering, pitch and throttle; one-shot
// presses (start or restart, pause, mute) are queued as bit flags and taken once by
// the loop, so a press between two frames is never lost and never counted twice.
// The mouse steers too: where the pointer sits left or right of centre banks the
// plane, and a click confirms or starts.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CLIMB = new Set(['ArrowUp', 'KeyW']);
const DESCEND = new Set(['ArrowDown', 'KeyS']);
const THROTTLE_UP = new Set(['KeyE']);
const THROTTLE_DOWN = new Set(['KeyQ']);
const BOOST = new Set(['ShiftLeft', 'ShiftRight']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);

export function createInput(target) {
  let left = false;
  let right = false;
  let climb = false;
  let descend = false;
  let throttleUp = false;
  let throttleDown = false;
  let boost = false;
  let mouseSteer = 0;
  let actions = 0;

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (CLIMB.has(event.code)) climb = true;
    else if (DESCEND.has(event.code)) descend = true;
    else if (THROTTLE_UP.has(event.code)) throttleUp = true;
    else if (THROTTLE_DOWN.has(event.code)) throttleDown = true;
    else if (BOOST.has(event.code)) boost = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (CLIMB.has(event.code)) climb = false;
    else if (DESCEND.has(event.code)) descend = false;
    else if (THROTTLE_UP.has(event.code)) throttleUp = false;
    else if (THROTTLE_DOWN.has(event.code)) throttleDown = false;
    else if (BOOST.has(event.code)) boost = false;
  });
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => {
    left = false;
    right = false;
    climb = false;
    descend = false;
    throttleUp = false;
    throttleDown = false;
    boost = false;
    mouseSteer = 0;
  });
  target.addEventListener('pointermove', (event) => {
    const rect = target.getBoundingClientRect();
    const centre = rect.left + rect.width / 2;
    mouseSteer = Math.max(-1, Math.min(1, (event.clientX - centre) / (rect.width * 0.32)));
  });
  target.addEventListener('pointerdown', () => {
    actions |= ACTION_CONFIRM;
  });

  return {
    /** -1 for left, 1 for right, 0 for neither or both; the mouse adds its own lean. */
    steer() {
      const keys = (right ? 1 : 0) - (left ? 1 : 0);
      if (keys !== 0) return keys;
      return mouseSteer;
    },
    /** -1 to descend, 1 to climb. */
    pitch() {
      return (climb ? 1 : 0) - (descend ? 1 : 0);
    },
    /** -1 to ease the throttle off, 1 to open it up. */
    throttle() {
      return (throttleUp ? 1 : 0) - (throttleDown ? 1 : 0);
    },
    boost() {
      return boost;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
