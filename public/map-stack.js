// Stacks map pins that share a place, so two events in one city never hide each other.
//
// Every pin in a place competes for the centre. Pins are placed one by one in priority
// order (upcoming events, then meetups, then past events); each takes the free spot
// nearest the centre whose distance to every pin already placed is at least three times
// the larger of the two radii, so pins never touch. The first pin sits on the place, the
// rest crowd around it as close as the rule allows.
//
// Offsets are in screen pixels, so the pile looks the same at every zoom level.
// Plain script (no modules): the home page loads it before its inline map code, and
// tests/map-stack.test.mjs runs it in a sandbox.
(function (root) {
  const GAP = 3; // closest two centres may get, as a multiple of the larger radius
  const STEP = 0.25; // search resolution, pixels

  // Candidate spots ordered by distance from the centre: the centre, then rings
  // STEP pixels apart, sampled about every STEP pixels along each ring.
  function* spots() {
    yield [0, 0];
    for (let ring = STEP; ; ring += STEP) {
      const count = Math.max(8, Math.ceil((2 * Math.PI * ring) / STEP));
      for (let k = 0; k < count; k++) {
        const angle = -Math.PI / 2 + (2 * Math.PI * k) / count; // start straight up
        yield [ring * Math.cos(angle), ring * Math.sin(angle)];
      }
    }
  }

  // radii: pin radii in priority order. Returns [dx, dy] for each, same order.
  function stack(radii, gap = GAP) {
    const placed = [];
    for (const r of radii) {
      for (const [x, y] of spots()) {
        const free = placed.every(([px, py, pr]) => Math.hypot(x - px, y - py) >= gap * Math.max(r, pr) - 1e-9);
        if (free) { placed.push([x, y, r]); break; }
      }
    }
    const round = (v) => Math.round(v * 100) / 100;
    return placed.map(([x, y]) => [round(x), round(y)]);
  }

  // Same place = same coordinates to about 10 m.
  const placeKey = (p) => `${Number(p.latitude).toFixed(4)},${Number(p.longitude).toFixed(4)}`;

  // items: [{ point, radius, priority }] (lower priority number = closer to the centre).
  // Sets item.dx / item.dy in place and returns items.
  function stackPlaces(items, gap = GAP) {
    const groups = new Map();
    items.forEach((item, index) => {
      const key = placeKey(item.point);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push([item, index]);
    });
    for (const group of groups.values()) {
      group.sort(([a, ia], [b, ib]) => a.priority - b.priority || ia - ib);
      const offsets = stack(group.map(([item]) => item.radius), gap);
      group.forEach(([item], i) => { [item.dx, item.dy] = offsets[i]; });
    }
    return items;
  }

  root.abeStack = { GAP, stack, stackPlaces };
})(globalThis);
