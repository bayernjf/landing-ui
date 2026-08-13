# @bay/landing-ui

Shared design system for the `*-landing` sites: design tokens (CSS) and
framework-free Astro components. One source of truth instead of copy-pasted
`Icon.astro` / `global.css` files across 14 repositories.

## Contents

| Export | What it is |
| ------ | ---------- |
| `@bay/landing-ui/styles/tokens.css` | `--lui-*` design tokens (type, radii, elevation, motion, accent) + shared primitives (`.lui-btn`, `.lui-card`, `.lui-eyebrow`) |
| `@bay/landing-ui/components/Icon.astro` | Inline Lucide SVG icon component (~45 icons), zero dependencies |
| `@bay/landing-ui/components/BayjfMark.astro` | The BayJF brand mark ("Shoreline Hook"), inline SVG, geometry identical to bayjf.com |
| `@bay/landing-ui/components/BayjfLink.astro` | `BayjfMark` + "BayJF" label, linked to bayjf.com — the portfolio backlink every site carries |
| `@bay/landing-ui/components/StarOnGithub.astro` | GitHub mark + "Star on GitHub" label as one pill, linked to that site's product repo |

## Install

In each landing project's `package.json`:

```json
"dependencies": {
  "@bay/landing-ui": "github:bayernjf/landing-ui#v1.0.0"
}
```

Then `npm install`. Cloudflare Pages and GitHub Actions can install from a
public GitHub repo without extra credentials.

## Usage

### Tokens

```css
/* src/styles/global.css — import first, then override brand accent */
@import "@bay/landing-ui/styles/tokens.css";

:root {
  --lui-accent: #3b82f6; /* this site's brand color */
  --lui-accent-hover: #60a5fa;
}
```

### Icon

```astro
---
import Icon from '@bay/landing-ui/components/Icon.astro';
---

<Icon name="Globe" size={16} />
```

### BayJF backlink

Replaces the text-only `<a href="https://bayjf.com">BayJF</a>` in each site's
nav and footer. Pass the site's own appearance classes through `class` — the
component sets no `display`, so utilities like `hidden sm:block` keep working
and nothing is restyled:

```astro
---
import BayjfLink from '@bay/landing-ui/components/BayjfLink.astro';
---

<BayjfLink size={18} class="text-sm text-gray-400 transition hover:text-white" />
```

Use `size={18}` in nav and `size={16}` in footer. Below ~16px the three
stroked arcs merge and the mark stops being legible. The border hairline is
`currentColor` at 12%, so it adapts to light and dark surfaces on its own.

### Star on GitHub

Sits immediately to the right of `BayjfLink` in the nav, and replaces any
GitHub icon/link the footer used to carry, so both read the same. `href` is the
site's own product repo:

```astro
---
import StarOnGithub from '@bay/landing-ui/components/StarOnGithub.astro';
---

<StarOnGithub href="https://github.com/bayernjf/splity" />
```

The pill styles itself from `currentColor` (surface at 8%, hairline at 14%,
both lifting on hover), so it inherits the surrounding nav or footer text color
and needs no tokens. Pass `class` only for spacing or responsive visibility —
e.g. `class="hidden sm:inline-flex"` to match a hidden-on-mobile `BayjfLink`.

## Versioning

Releases are git tags (`v1.0.0`, `v1.1.0`, ...). Sites pin a tag explicitly —
bumping the shared package never silently changes a live site. To upgrade a
site, change the tag in its `package.json` and run `npm install`.

### Release checklist (run on every change to this repo)

Because consuming sites pull from GitHub by tag, an unpublished change is an
invisible change. Follow this every time:

1. Make the change (new icon path, token, primitive).
2. Bump the `version` in `package.json` (semver).
3. Commit — one logical change per commit, English Conventional Commits.
4. Tag the release: `git tag -a v1.2.0 -m "..."`.
5. Push branch and tag: `git push origin main v1.2.0`.

Then, to roll the bump into a site, edit that site's `package.json` tag and
reinstall:

```bash
npm install
```

Never forget step 4 — without a new tag, no site will ever see the change.

## Rules

- Icons are inline SVG paths (Lucide), never emoji, never a runtime icon lib.
- Tokens are prefixed `--lui-`; component classes are prefixed `.lui-`.
- `--lui-accent` is the single brand variable each site overrides.
- No webfont loading — the system font stack is a deliberate choice.
