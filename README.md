# Portfolio - Josiah Legg

A personal portfolio site built from scratch with a focus on typography, motion, and craft. No frameworks, no build step - just hand-written HTML, CSS, and vanilla JavaScript.

🔗 **Live:** [josiahlegg.com](https://josiahlegg.com)

## Features

- **Zero dependencies / no build** - plain static files you can serve from anywhere.
- **Light & dark themes** - a five-color palette per theme, toggled from the header and remembered in `localStorage` (set before first paint, so there's no flash of the wrong theme).
- **Soft client-side routing** - navigations swap only `<main>` in place via a small `fetch`-based router, so the sidebar never reloads and content blurs out/in between pages. Falls back to a full page load if anything fails, and works without JS.
- **Section scroll-snapping** - on desktop the multi-section pages scroll one screen at a time, with a dot indicator; respects `prefers-reduced-motion`.
- **Responsive** - tuned for a 2048×1152 desktop, with gated breakpoints for small desktops/tablets, short viewports, and a full-screen mobile nav overlay.
- **Accessible touches** - skip-to-content link, keyboard navigation, focus management on route changes, and `aria-current` state.
- **Details** - animated nav-dot that follows the cursor, copy-to-clipboard email, and a subtle grain texture that works in both themes.

## Tech

- HTML, CSS (custom properties, `clamp`, `:has`, container-free responsive layout)
- Vanilla JavaScript (ES modules-free, single `main.js`)
- Fonts: [Bricolage Grotesque](https://fonts.google.com/specimen/Bricolage+Grotesque) + [Cascadia Mono](https://fonts.google.com/specimen/Cascadia+Mono) (Google Fonts)

## Project structure

```
.
├── index.html          # Home
├── about/index.html
├── projects/index.html
├── contact/index.html
├── 404.html
├── styles/styles.css   # All styles
├── scripts/main.js     # Router, theme toggle, nav, scroll-snapping, copy-to-clipboard
├── favicon.svg
├── og-image.png        # Social preview (1200×630)
├── robots.txt
└── sitemap.xml
```

## Running locally

The site is fully static, so any static server works. The router uses absolute paths (`/projects/`, etc.), so serve from the project root rather than opening files directly.

```bash
# Python
python -m http.server 8000

# or Node
npx serve .
```

Then open <http://localhost:8000>.

## Deployment

Any static host (GitHub Pages, Netlify, Cloudflare Pages, …) works - just publish the repo root. The `404.html` is served on unknown paths by most static hosts, including GitHub Pages.

## Customizing

A few placeholders are marked with `TODO` comments in the source and should be updated before going live:

- Production domain - replace `josiahlegg.com` in the `<meta>`/canonical/OG tags of each page, plus `robots.txt` and `sitemap.xml`.
- The **Resume** nav link (currently a placeholder URL).
- The **GitHub** / **LinkedIn** handles on the contact page.
- Project cards in `projects/index.html` (several are placeholders).

## License

© Josiah Legg. All rights reserved.
