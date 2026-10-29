// On a phone held upright, the full-screen board is turned sideways with CSS
// (rotate 90° clockwise) so it is used in landscape. Pointer positions come in
// screen coordinates, so everything that turns a touch into a board position
// goes through these helpers, which undo the turn.

const turned = (el: Element) => !!el.closest("[data-rotated]");

// Where a pointer is inside `el`, as fractions (0–1) of its own width/height.
export function localPoint(el: Element, clientX: number, clientY: number): [number, number] {
  const r = el.getBoundingClientRect();
  if (turned(el)) return [(clientY - r.top) / r.height, (r.right - clientX) / r.width];
  return [(clientX - r.left) / r.width, (clientY - r.top) / r.height];
}

// A pointer movement, as fractions of `el`'s own width/height.
export function localDelta(el: Element, dx: number, dy: number): [number, number] {
  const r = el.getBoundingClientRect();
  if (turned(el)) return [dy / r.height, -dx / r.width];
  return [dx / r.width, dy / r.height];
}
