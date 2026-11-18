# Lessons from real particle builds

Learned building a portfolio in Nov 2026: a 90k-point hero that sorts itself between shapes, a cursor trail, a ring field footer, and a scroll hand-off. Each line is something that went wrong or was corrected by the person.

## Look and taste
- **Stillness first, motion second.** People liked slow, physical motion that settles (springs, easing) and disliked anything that wanders "for no purpose". A drift of particles running down a whole page was rejected as annoying; a light scatter in one section was fine.
- **Don't overuse particles.** One strong particle moment per page section. Everything else can be type and space.
- **Don't reinvent the form between sections.** Moving a form across the screen in a new shape felt repetitive. What worked: the form stays where it is and changes character (fewer points, a ring that closes) while the words play out.
- **Thick, flat, face-on forms look dull** as an end state. Prefer a single line with depth (a knot), crossing loops, or a tilted view.
- **Text effects on the words themselves were rejected.** Keep type intact; put the effect in the graphic.
- **Static studies before motion.** When a piece looked wrong live ("low res", "crooked", "specks floating around"), making still versions on a separate page and matching a reference closely fixed it. Smooth curves, no warping noise on the geometry, broad brightness bands for gradation.
- **Granularity is real resolution:** render at device pixel ratio (cap 2), supersample shaders (4 to 16 taps), and anti-alias by how much the geometry shrinks per pixel. Random sub-pixel specks read as noise, not detail.
- **A faint rainbow on near points works** when it is tied to an interaction (cursor near) rather than always on.
- **Palette:** off-black ground (#141416 to #17171A) so white points don't overpower; white points with about 8% in the accent colour.

## Engineering
- **Additive blending on a transparent canvas** needs premultiplied output: `gl_FragColor = vec4(colour * a, a)`, context `{ alpha: true, premultipliedAlpha: true }`, blend `ONE, ONE`.
- **A fixed, full-viewport canvas** that a form travels through must stack above section backgrounds (positioned sections paint over a `z-index: 0` canvas) and below the text: give the canvas `z-index: 1` and later text containers `position: relative; z-index: 1`.
- **Clear a fixed canvas** when nothing should show, or its last frame stays on screen over later sections.
- **`[].slice.call(map.values())` returns []** (an iterator isn't array-like). Use `Array.from`. This made a form silently never draw.
- **Browsers cap WebGL contexts (~16).** A gallery of many canvases needs lazy contexts: create on screen, `WEBGL_lose_context` and swap in a fresh canvas element when off screen.
- **Pause off screen** with IntersectionObserver; draw every other frame when motion is slow.
- **Reduced motion:** one still frame, no pinning, no cursor effects.
- **Never let a form rotate fully** if it has a flat side; sway within about ±0.45 rad.
- **Sticky/pinned sections break under `overflow: hidden`** on any ancestor; use `overflow: clip` or remove it.
- **Cursor:** velocity-based effects should rise fast and decay slowly; a resting cursor should show nothing (a blob at rest was "too much").
- **Measure motion by pixels.** Screenshots in a hidden or background browser pane can lag or freeze; read pixels twice a few seconds apart and count the changes.

## Hero-scale pattern (GPU)
For 50k to 100k points: store each shape's positions as vertex attributes (a0..a3), pick the current pair by a time uniform, and mix per point with a staggered smoothstep so points travel at different moments, adding a detour (`sin(pi * k)`) so they arc instead of sliding. Cursor pull and swirl in the vertex shader in screen space. A scroll hand-off adds one more uniform that mixes every point toward a target form (for example a ring) and a second that gates points joining it in order around the angle, so the loop draws itself and closes.

## From the first fresh-agent test (18 Nov 2026)
A new agent built three briefs from the skill alone (a moving climate hero with custom roots, a still "Signal and noise" slide, the initials "JH" as a breathing mark). The roots and the signal line read well. What it exposed, now fixed in the engine and SKILL.md: symbol units didn't match other motifs; `size` clipped wide forms in narrow canvases; `breathe` was invisible on tight spreads; area-filling forms (words, fields) came out too dim; there was no even "noise" spread (now `scatter`); text was sampled before its font loaded; the cursor pulled from anywhere on the page; layering, still export and the swapped lazy canvas weren't documented.

## From the second fresh-agent test (18 Nov 2026)
Four briefs: noise resolving into rhythm, a still portrait post, the word "open" in ink on a light page, and a two-layer hero. All four worked visually; the agent had to work around the engine for three of them. Fixed: dark ink on light grounds greyed out under additive blending (now automatic 'over' blending); `morph` couldn't start from noise and hold (now `morphMode: 'once'`); round forms looked small on wide bands (now `stretch`); exports depended on CSS size and device pixel ratio (now `pixelRatio` and `snapshot()`); long words could clip in `fromText` (now auto-fit); no helper for the motion check (now `measureMotion`).
