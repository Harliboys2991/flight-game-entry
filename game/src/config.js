// Every tuning number and colour for Meridian Sky in one place. The playfield is a
// fixed 1280x720 logical area; the renderer scales it to the window, so no rule
// below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display rate. */
export const STEP = 1 / 60;

/** The course: one sortie from the island strip to the far airfield runway. */
export const COURSE = {
  length: 6000, // metres of forward flight to the runway threshold
  corridor: 130, // metres either side of the centreline the pilot may fly
  rings: 12, // golden target rings along the course
  runwayHalfWidth: 14, // metres either side of the centreline that counts as on-runway
};

export const PLANE = {
  maxSpeed: 58, // m/s at full throttle
  cruiseSpeed: 42,
  stallSpeed: 17, // below this the wings stop lifting and the plane sinks
  climbRate: 16, // m/s of vertical speed at full pull with flying speed
  sinkRate: 9, // m/s the plane sinks when stalled
  lateralSpeed: 46, // m/s of sideways drift at full bank
  turnRate: 38, // degrees of heading change per second at full bank
  maxAlt: 260, // metres; the air gets thin above this and the climb stops
  minSafeAlt: 1.5, // metres above the ground; below this is a scrape
  boostSpeed: 74, // m/s while the boost is held
  boostDrain: 9, // extra fuel points per second while boosting
};

export const FUEL = {
  start: 100,
  burn: 1.05, // points per second at full throttle
  idleBurn: 0.25,
  ringBonus: 12, // fuel back for flying through a ring
  lowWarn: 25, // the gauge turns red below this
};

export const HULL = { max: 3 };

export const RING = {
  radius: 16, // metres; fly through the middle of the hoop
  nearRadius: 30, // a near miss still scores a little
  centrePoints: 250,
  nearPoints: 50,
};

export const SCORE = {
  ringCentre: 250,
  ringNear: 50,
  metre: 1, // one point per 10 m flown, counted in whole metres below
  landing: 1000,
  landingBonusPerHull: 250,
  timeBonusPerSecond: 5, // under the par time of 150 s
  parSeconds: 150,
};

/** How many peaks, trees and balloons the course holds; the pool is allocated once. */
export const POOL = { peaks: 46, trees: 90, balloons: 6 };

export const PALETTE = {
  backdrop: '#0e1626',
  skyTop: '#1d3a6e',
  skyMid: '#4a7ab8',
  skyHorizon: '#ff9e5e',
  sun: '#ffd98a',
  sunGlow: '#ff9e5e',
  ridgeFar: '#5d6f9e',
  ridgeNear: '#3d5178',
  groundFar: '#4d7a4a',
  groundNear: '#2f5d33',
  fieldLight: '#7fae5a',
  fieldDark: '#4a7a44',
  water: '#2e6f9e',
  river: '#3f8fc4',
  runway: '#3a3f4a',
  runwayMark: '#f2f2e8',
  ringGold: '#ffc93c',
  ringGlow: '#ff9e2e',
  ringPassed: '#7ddc8a',
  planeBody: '#e8edf2',
  planeAccent: '#e5534b',
  planeGlass: '#1b3a5c',
  planeGlow: '#ffb347',
  panel: '#141a26',
  panelEdge: '#2c3648',
  instrument: '#39ff88',
  instrumentAmber: '#ffb347',
  instrumentRed: '#ff5a4e',
  text: '#eef1f5',
  muted: '#9aa5b8',
  coin: '#f2c94c',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'meridian-sky.best';
