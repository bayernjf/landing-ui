# @bay/landing-ui

Shared design system for the `*-landing` sites: design tokens (CSS) and
framework-free Astro components. One source of truth instead of copy-pasted
`Icon.astro` / `global.css` files across 14 repositories.

## Contents

| Export | What it is |
| ------ | ---------- |
| `@bay/landing-ui/styles/tokens.css` | `--lui-*` design tokens (type, radii, elevation, motion, accent) + shared primitives (`.lui-btn`, `.lui-card`, `.lui-eyebrow`) |
| `@bay/landing-ui/components/Icon.astro` | Inline Lucide SVG icon component (~45 icons), zero dependencies |

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

## Versioning

Releases are git tags (`v1.0.0`, `v1.1.0`, ...). Sites pin a tag explicitly —
bumping the shared package never silently changes a live site. To upgrade a
site, change the tag in its `package.json` and run `npm install`.

## Rules

- Icons are inline SVG paths (Lucide), never emoji, never a runtime icon lib.
- Tokens are prefixed `--lui-`; component classes are prefixed `.lui-`.
- `--lui-accent` is the single brand variable each site overrides.
- No webfont loading — the system font stack is a deliberate choice.
