# Motif recipes

## Choosing a form for an idea
Ask what the idea *does*, not what it is. A loop returns, growth widens, trust holds, listening spreads outward, uncertainty has no edge, momentum pushes along an axis. Then pick the simplest form with that behaviour, and let the spread add the mood.

If the idea already has a symbol (a logo, initials, a word, an emoji), sample it with `fromText` or `fromPath` and use `stipple`. Keep text large in the raster (300px or more) so the points have enough pixels to sample.

## Writing a custom motif
A motif is `{ dims, fn, parts? }`. `fn(a, b, k, out, time)` writes a point on the skeleton into `out`, in a space about -1.2 to 1.2.

- `dims: 1`, a curve: `a` in [0, 1) runs along it. Use `parts: n` and `k` (0..n-1) for several curves (two linked rings).
- `dims: 2`, a surface: `a` and `b` in [0, 1) cover it. Spreads `shell`, `ribbon` compute the normal numerically.
- `time` lets a motif move on its own (waves, ripples). Flow motion separately advances `a`.

Register it with `ParticleMotif.define('name', motif)` or pass the object directly.

## Useful parametric forms
- Trefoil knot: x = sin t + 2 sin 2t, y = cos t - 2 cos 2t, z = -sin 3t (scale x, y by 0.36 and z by 0.5).
- Torus knot (p, q): r = cos(q t) + 2; x = r cos(p t), y = r sin(p t), z = -sin(q t).
- Figure of eight (lemniscate of Gerono/Bernoulli): x = cos t / (1 + sin² t), y = sin t cos t / (1 + sin² t).
- Möbius band: x = (1 + v cos(u/2)) cos u, y = (1 + v cos(u/2)) sin u, z = v sin(u/2), v in [-w, w].
- Fibonacci sphere (even points): y = 1 - 2(i + 0.5)/N, r = sqrt(1 - y²), angle = i × 2.39996.
- Spiral: r grows with a; three turns read better than many.
- Rings of dots on a perspective plane (a horizon of rings): ray-cast a plane, take r = |hit - centre|, ring index = floor(log r × K) so rings bunch toward the centre, dots per ring = whole number so there is no seam.

## Composition
- Put the form where the words are not, or make it quiet where they overlap (lower alpha, fewer points).
- A form at 0.34 to 0.42 of the screen height reads as a hero object; at 0.2 it reads as a mark beside a heading.
- Tilting a ring 0.2 to 0.6 rad gives depth; face-on reads flat.
