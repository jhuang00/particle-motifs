---
name: particle-motifs
description: Turn a concept, motif or symbol into particle art for the web - a form made of thousands of points (a knot for "closing the loop", a spiral for growth, ripples for listening, a word or icon sampled into dots), with a chosen spread (line, dotted, ribbon, tube, cloud, splash, shell, stipple) and a chosen motion (static, drift, flow, breathe, morph), rendered with WebGL from one dependency-free JS file. Use whenever someone wants a particle visual, a "made of dots" hero or section graphic, an abstract motif for an idea, a symbol or word turned into particles, a still particle image for a poster or slide, or asks to restyle, move, thin out or morph an existing particle form. Also use for /particle-motifs.
---

# Particle motifs

Turn an idea into a form made of points, then decide how the points sit around it and how they move. One engine file does the drawing; your job is the choices and the verification.

- Engine: `assets/particle-motif.js` (copy it into the project; no build step, no dependencies)
- Showcase of every option: `showcase/index.html` (open it to see what each choice looks like)
- Lessons from real builds: `references/lessons.md` (read before integrating into a page)
- Concept-to-motif recipes and maths: `references/motifs.md`

## Workflow

1. **Name the idea in one line.** What should someone feel or understand? "Work that closes the loop", "a company that keeps growing", "listening before building".
2. **Pick the motif.** A form whose shape carries the idea (see the table below and `references/motifs.md`). Prefer one clear form over a busy scene. A symbol the person already uses (their initials, a word, an icon) can be sampled straight into points with `fromText` or `fromPath`.
3. **Pick the spread.** How far points stray from the form, and in what shape. This sets the character more than anything else.
4. **Pick the motion,** or static. Motion should be slow and the form should hold; the eye should read the shape first and notice the movement second.
5. **Place it.** Where it sits relative to the words on the page (centre, size, tilt). Leave the text area clear or dim the form behind it.
6. **Build a static comparison first** when the choice is open: a page of still frames side by side, labelled, at the real screen proportions. People judge by looking; a written list of options is not enough. Then animate the chosen one.
7. **Verify in a browser** (see Checklist). Screenshots of motion lie; measure that pixels change over time, and say what you could not see.

## The choices

### Spread: how points sit around the form

| Spread | Looks like | Use for |
|---|---|---|
| `line` | a fine filament along the form | elegant, precise; the shape reads instantly |
| `dotted` | rows of evenly spaced dots | technical, measured, calm; pairs well with type |
| `ribbon` | a flat band, wide one way, thin the other | flowing forms, movement, a sense of material |
| `tube` | a hollow sleeve around the form | solid 3D presence, links and knots |
| `cloud` | a soft volume filling the space around it | uncertainty, atmosphere, "the messy middle" |
| `splash` | a burst outward, dense at the form and thinning | energy, growth, impact, a spark |
| `scatter` | an even, uniform fill around the form | noise, dust, a field, a background texture |
| `shell` | points on a surface | spheres, tori, waves, ripples, Möbius bands |
| `stipple` | points filling a symbol | text, emoji, icons, logos |

`amount` scales the spread (1 is default; 0.5 tighter, 1.6 looser).

**Which spreads suit which motifs.** Curves (`dims: 1`) take every spread. Surfaces (`dims: 2`) and symbols (`dims: 0`) cover an area already, so `line`, `dotted` and `stipple` give a thin skin on them, `tube` behaves like `shell`, and `dotted` rows only exist on curves. For a noise field, use `scatter` (or `cloud`) on a flat surface motif.

**Light backgrounds.** On a dark ground points add light. For dark ink on a light ground the engine switches to ordinary blending automatically (`blend: 'auto'` picks `'over'` when `colour` is dark), so ink stays ink instead of greying out. Use `background: null` and set the page colour in CSS, or pass the light colour as `background`.

**Brightness.** Points are additive and each one is faint, so the result depends on how many points share an area. A thin curve with 20k points is bright; the same 20k spread over a large word or a field is dim. Raise `alpha` (1.5 to 3) for area-filling forms and sparse fields, lower it (0.5 to 0.8) if dense parts blow out to white. Always check on the real background.

### Motion

| Motion | What moves | Use for |
|---|---|---|
| `static` | nothing; drawn once | print, posters, slides, a still hero, reduced motion |
| `drift` | each point wanders a little; the form holds | the default for a living background |
| `flow` | points travel along the form | loops, cycles, journeys, processes |
| `breathe` | the spread swells and settles | calm, waiting, presence |
| `morph` | gathers from one form into another (`morphTo`); `morphMode: 'loop'` goes back and forth, `'once'` resolves over `morphDuration` seconds and holds | change, resolution, "finding shape" |

`breathe` swells the spread and the whole form slightly, so it shows even on tight spreads like `stipple`.

Every 3D form also sways slowly (`sway: true`). It never turns all the way round, because flat forms go edge-on and disappear for part of each turn.

### Built-in motifs

`ring`, `knot` (trefoil), `lemniscate` (figure of eight), `spiral`, `helix`, `linked` (two interlocked rings), `orbits` (three crossing loops), `mobius`, `sphere`, `torus`, `wave`, `ripples`. Plus `ParticleMotif.fromText(text, { font })`, `ParticleMotif.fromPath(svgPathD, [w, h], { stroke })`, or a custom `{ dims, fn }` (see the header of the engine file, and `references/motifs.md` for how to write one).

| Idea | Motif | Spread | Motion |
|---|---|---|---|
| closing the loop, iteration | `knot` or `ring` | line | flow |
| growth, expansion | `spiral` | splash | drift |
| listening, influence | `ripples` | shell | drift |
| trust, partnership | `linked` | tube | flow |
| uncertainty resolving | `sphere` morphing to `ring` or `knot` | cloud | morph |
| momentum, progress | `helix` | ribbon | flow |
| signal, data, rhythm | `wave` | shell | drift |
| signal and noise | a curve over a flat field, two layered canvases | line over scatter | static or drift |
| continuity, no end | `lemniscate` or `mobius` | ribbon or shell | flow |
| identity, a name | `fromText` / `fromPath` | stipple (`alpha` 2 or more) | breathe |

## Using the engine

Notes the API won't tell you:
- `size` is a fraction of the canvas's shorter side, so a form fits a portrait, square or wide canvas the same way. Forms span about -1.2..1.2 at `size` 1/2.4; most look right between 0.3 and 0.42.
- `fromText` and `fromPath` scale the symbol so its longer side spans -1.2..1.2, like the built-in motifs. A wide word therefore needs a larger `size` (0.5 to 0.6) than a round form. `fromText` shrinks the font until the text fits its raster, so it never clips.
- Built-in forms are about as wide as they are tall. On a wide band (say 1200 x 500) use `stretch` (1.6 to 2.2) to spread the form across the width rather than writing a wider motif.
- Load the font before sampling text: `await document.fonts.load('500 300px "My Font"')`, then call `fromText`. Otherwise the fallback font is sampled. The default font is `system-ui`.
- One mount has one motif and one spread. For two layers (a signal over noise, a form over a field), stack two canvases with `background: null` on the upper one, and set `colour` and `accent` on each.
- Custom motifs: on a curve (`dims: 1`) `b` is a free random number per point; use it to spread points across a band or to stagger timing. `fn` is a closure, so it can read outside state (a progress value you animate yourself) when a built-in motion doesn't fit.
- Multi-part custom motifs: set `parts: n`; `fn` receives `k` (0..n-1). Points are split evenly between parts, so short parts look denser; give long parts a larger share by splitting them into several parts.
- With `lazy` on (default), the canvas element is replaced when it leaves the screen. Keep the returned handle and use `handle.canvas`, not your original reference.
- A still image: use `motion: 'static'` and give the canvas its final size. For an exact export size, size the canvas in CSS and set `pixelRatio` (a 540 x 675 CSS canvas with `pixelRatio: 2` exports 1080 x 1350). Call `handle.snapshot()` for a PNG data URL while the canvas is on screen (off-screen canvases have no image when `lazy` is on). For layered canvases or added text, draw each snapshot and the text onto one 2D canvas. Saving the file needs a browser: a download link, or an agent with browser tools.
- `cursor: true` pulls points toward the pointer only while it is over the canvas.
- Under `prefers-reduced-motion` the engine draws one still frame with no sway or drift.


```html
<canvas id="art" style="width:100%;aspect-ratio:16/10"></canvas>
<script src="particle-motif.js"></script>
<script>
  ParticleMotif.mount(document.getElementById('art'), {
    motif: 'knot', spread: 'line', motion: 'flow',
    count: 20000, size: .38, cx: .65, cy: .45,     // centre and size as fractions of the canvas
    background: '#17171A'                          // or null for a transparent canvas over the page
  });
</script>
```

Options: `count`, `amount`, `speed`, `cx`, `cy`, `size`, `tilt`, `turn`, `sway`, `colour`, `accent`, `accentShare`, `alpha`, `background`, `cursor` (points lean toward the pointer), `lazy` (default true: the WebGL context exists only while on screen, so a page can hold many), `morphTo`. `mount` returns `{ canvas, set(opts), destroy() }`.

For a hero-scale piece (90k+ points, the form changing between several shapes over time, cursor swirl, scroll hand-offs), write a dedicated vertex-shader version instead: put the shapes in attributes and mix them on the GPU. `references/lessons.md` describes the one built for a portfolio hero.

## Checklist before calling it done

- [ ] The form reads at a glance at the real size, on the real background. If it is behind text, the text is still readable (dim the form, thin it, or move it).
- [ ] Brightness: additive points saturate fast. Dense areas should not blow out to a white blob; lower `alpha` or `count`.
- [ ] Motion is slow and the form holds. Check over at least 10 seconds; check that it doesn't go edge-on.
- [ ] Verified that it actually moves: `await handle.measureMotion(3000)` returns the share of pixels that changed (above about 0.02 is moving; 0 is frozen). Don't judge motion from two screenshots by eye.
- [ ] Off screen it pauses; under `prefers-reduced-motion` it shows one still frame.
- [ ] Phone width checked, or said that it wasn't.
- [ ] Say what you could not verify (feel of motion, a real mouse, the person's own display).
