# particle-motifs

A skill for AI agents that turns a concept, motif or symbol into particle art for the web: a form made of thousands of points, drawn live with WebGL from one small JavaScript file.

You describe an idea ("closing the loop", "growth", "listening", your initials) and the agent works through four choices with you:

1. **A form** that carries the idea: a knot, a spiral, ripples, two linked rings, a word or icon sampled into dots, or a shape the agent writes for you.
2. **A spread**, meaning how the points sit around the form: a fine line, rows of dots, a ribbon, a tube, a soft cloud, a splash, an even scatter, a surface, or a filled symbol.
3. **A motion**: still (for slides and posters), drifting, flowing along the form, breathing, or morphing from one form into another.
4. **Placement** on the page, next to the words it sits with.

When the choice is open, the skill has the agent build a page of still options to compare before animating anything, because these things are easier to judge by eye than from a description.

**See it:** open `showcase/index.html` through a local server (for example `python3 -m http.server`, then visit `/showcase/`).

## Install

**Claude Code**: copy the `particle-motifs` folder into `~/.claude/skills/` (for all your projects) or into `.claude/skills/` inside one project.

```bash
git clone https://github.com/jhuang00/particle-motifs ~/.claude/skills/particle-motifs
```

**Claude apps**: download `particle-motifs.skill` from the [latest release](https://github.com/jhuang00/particle-motifs/releases/latest) and upload it in your skills settings.

**Other agents**: the skill is a folder of Markdown instructions plus `assets/particle-motif.js`. Point your agent at `SKILL.md`.

## Use

You don't need to call it by name. It's meant to kick in when you say things like:

- "Make a particle graphic for our hero about trust"
- "Turn our logo into a field of dots that gently breathes"
- "I need a still image for a talk slide called Signal and noise"
- "Can this ring of particles close up as the heading scrolls in?"

The engine also works on its own, with no agent:

```html
<canvas id="art" style="width:100%;aspect-ratio:16/10"></canvas>
<script src="particle-motif.js"></script>
<script>
  ParticleMotif.mount(document.getElementById('art'), { motif: 'knot', spread: 'line', motion: 'flow' });
</script>
```

## What's inside

| Path | What it is |
|---|---|
| `SKILL.md` | The instructions the agent follows: workflow, the options and when to use each, a checklist |
| `assets/particle-motif.js` | The engine. Plain JavaScript, no dependencies, no build step |
| `references/motifs.md` | How to pick a form for an idea, and how to write a new one |
| `references/lessons.md` | What went wrong in real builds and how it was fixed |
| `showcase/index.html` | Every option, drawn live |

## How it was made

I built it while experimenting with particle forms and building my portfolio. The lessons file records what I corrected along the way. Then I tested it on fresh agents that had only the skill to go on, across seven briefs (a climate nonprofit hero, a talk slide, a personal mark, noise resolving into rhythm, a portrait social post, a word in ink on a light page, and a two-layer hero), and fixed each place they got stuck.

## Licence

MIT
