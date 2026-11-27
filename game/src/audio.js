// Synthesised sound (WebAudio, no audio files): an engine hum that follows the
// throttle, a chime for flying through a ring, a thud for a hit, and short stingers
// for landing and for crashing. Nothing plays until the player first presses a key
// or clicks, which is when the browser allows audio to start.
export function createAudio() {
  let context = null;
  let engine = null;
  let engineGain = null;
  let muted = false;

  function ensure() {
    if (context !== null) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      engine = context.createOscillator();
      engine.type = 'sawtooth';
      engine.frequency.value = 55;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      engineGain = context.createGain();
      engineGain.gain.value = 0;
      engine.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(context.destination);
      engine.start();
      return true;
    } catch {
      return false;
    }
  }

  function tone(frequency, seconds, type, volume, when = 0) {
    if (context === null || muted) return;
    const start = context.currentTime + when;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(start);
    osc.stop(start + seconds + 0.05);
  }

  return {
    unlock() {
      if (ensure() && context.state === 'suspended') context.resume();
    },
    /** Call every frame with the throttle (0..1) and speed; the hum follows them. */
    engine(throttle, speed, flying) {
      if (context === null || muted) return;
      const target = flying ? 0.035 + throttle * 0.05 : 0;
      engineGain.gain.setTargetAtTime(target, context.currentTime, 0.1);
      engine.frequency.setTargetAtTime(48 + throttle * 42 + speed * 0.35, context.currentTime, 0.1);
    },
    ring() {
      tone(880, 0.35, 'sine', 0.16);
      tone(1318, 0.5, 'sine', 0.12, 0.09);
    },
    nearMiss() {
      tone(660, 0.18, 'sine', 0.08);
    },
    hit() {
      tone(90, 0.35, 'sine', 0.25);
      tone(55, 0.4, 'triangle', 0.2, 0.02);
    },
    land() {
      tone(523, 0.25, 'sine', 0.14);
      tone(659, 0.25, 'sine', 0.14, 0.12);
      tone(784, 0.45, 'sine', 0.16, 0.24);
    },
    crash() {
      tone(70, 0.7, 'sawtooth', 0.2);
      tone(45, 0.9, 'sine', 0.22, 0.05);
    },
    lowFuel() {
      tone(440, 0.12, 'square', 0.05);
      tone(440, 0.12, 'square', 0.05, 0.18);
    },
    toggleMute() {
      muted = !muted;
      if (context !== null && engineGain !== null) {
        engineGain.gain.setTargetAtTime(muted ? 0 : 0.05, context.currentTime, 0.05);
      }
      return muted;
    },
  };
}
