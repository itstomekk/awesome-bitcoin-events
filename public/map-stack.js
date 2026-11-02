// Keeps map pins from touching, at every zoom level.
//
// The page hands over every pin as a screen position (pixels at the current zoom) plus
// its radius and priority. Pins are placed one by one in priority order (upcoming
// events, then meetups, then past events); each takes the free spot nearest its own
// place whose distance to every pin already placed is at least three times the larger
// of the two radii. Pins in one city pile up around it; pins from nearby cities push
// each other apart only when the zoom brings them close. The page reruns this on every
// zoom, so zooming in lets pins drift back towards their real places.
//
// Plain script (no modules): the home page loads it before its inline map code, and
// tests/map-stack.test.mjs runs it in a sandbox.
(function (root) {
  const GAP = 3; // closest two centres may get, as a multiple of the larger radius

  // items: [{ x, y, radius, priority }] in screen pixels (lower priority = placed first).
  // Returns [dx, dy] per item, same order.
  //
  // The nearest free spot to a pin's place is either the place itself or lies on the
  // edge of some placed pin's keep-out circle, so candidates are sampled on those edges
  // (`angles` per circle), nearest first. Search widens until a free spot is found. A grid
  // of cells one keep-out wide keeps every check to the 3x3 cells around a point.
  function layout(items, gap = GAP, angles = 48) {
    const order = items.map((_, i) => i).sort((a, b) => items[a].priority - items[b].priority || a - b);
    const cell = Math.max(1, gap * Math.max(0, ...items.map((item) => item.radius)));
    const grid = new Map();
    const cellOf = (v) => Math.floor(v / cell);
    const free = (px, py, r) => {
      const cx = cellOf(px), cy = cellOf(py);
      for (let gx = cx - 1; gx <= cx + 1; gx++) {
        for (let gy = cy - 1; gy <= cy + 1; gy++) {
          for (const q of grid.get(`${gx},${gy}`) || []) {
            if (Math.hypot(px - q.x, py - q.y) < gap * Math.max(r, q.r) - 1e-6) return false;
          }
        }
      }
      return true;
    };
    const near = (px, py, reach) => {
      const found = [];
      const n = Math.ceil(reach / cell);
      const cx = cellOf(px), cy = cellOf(py);
      for (let gx = cx - n; gx <= cx + n; gx++) {
        for (let gy = cy - n; gy <= cy + n; gy++) {
          for (const q of grid.get(`${gx},${gy}`) || []) if (Math.hypot(px - q.x, py - q.y) <= reach) found.push(q);
        }
      }
      return found;
    };
    const out = new Array(items.length);
    for (const i of order) {
      const { x, y, radius: r } = items[i];
      let spot = free(x, y, r) ? [x, y] : null;
      for (let reach = 2 * cell; !spot; reach *= 2) {
        const candidates = [];
        for (const q of near(x, y, reach)) {
          // Spots on q's circle that were taken once stay taken (pins are only ever
          // added), so each circle keeps a shrinking list of its still-free spots.
          const d = gap * Math.max(r, q.r) + 1e-6;
          if (!q.open.has(d)) {
            const all = [];
            for (let k = 0; k < angles; k++) {
              const angle = -Math.PI / 2 + (2 * Math.PI * k) / angles;
              all.push([q.x + d * Math.cos(angle), q.y + d * Math.sin(angle)]);
            }
            q.open.set(d, all);
          }
          const open = q.open.get(d).filter(([cx, cy]) => free(cx, cy, r));
          q.open.set(d, open);
          for (const [cx, cy] of open) candidates.push([Math.hypot(cx - x, cy - y), cx, cy]);
        }
        candidates.sort((p, q) => p[0] - q[0]);
        // Candidates are already free; one farther than reach - cell might still lose to
        // a spot on a circle not gathered yet, so widen the search instead.
        if (candidates.length && candidates[0][0] <= reach - cell) spot = [candidates[0][1], candidates[0][2]];
      }
      const key = `${cellOf(spot[0])},${cellOf(spot[1])}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push({ x: spot[0], y: spot[1], r, open: new Map() });
      out[i] = [Math.round((spot[0] - x) * 100) / 100, Math.round((spot[1] - y) * 100) / 100];
    }
    return out;
  }

  // Pins that all share one place, given by radius in priority order (finer search).
  const stack = (radii, gap = GAP) => layout(radii.map((radius, priority) => ({ x: 0, y: 0, radius, priority })), gap, 720);

  root.abeStack = { GAP, layout, stack };
})(globalThis);
