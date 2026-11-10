# Data Musings

Kunal Kohli's Jekyll blog. The site uses the approved **Signal layout with Workbench colors**: compact top navigation, a technical reading index, blue/lavender light mode, midnight-navy dark mode, and a grapefruit accent for signature marks (dots, sparks, arrows, category tags, reading progress).

## Publishing

- Add posts to `_posts/` as before. Existing post URLs and Markdown are retained.
- The homepage hero automatically selects the newest published post by date, excluding `published: false` and future-dated posts. The full index, search, filters, archive, and topics use real site content—not the design-lab sample copy.
- Optional `description` supplies the homepage/article deck; otherwise cards use the excerpt. An optional `image.feature` supplies a cover. Without one, a category-based SVG illustration is used.
- `read_time` remains an optional minutes override, useful for posts with substantial inline SVG markup.
- Article contents are generated server-side from the authored H2–H4 headings. They work without JavaScript; enhancement adds active-section highlighting, reading progress, and a sticky collapsible mobile menu.
- The original Binance attack animation/include/CSS/JS and **all existing post source files are unchanged** by the redesign. The PHP diagrams and technical disclosures are preserved too.

## Site structure

- `_layouts/default.html`, `_includes/site-nav.html`, `_includes/site-footer.html`: shared shell.
- `_layouts/post_listing.html`: automatic latest-post hero and full reading index.
- `_layouts/post.html`, `_includes/contents.html`: article presentation and contents sidebar.
- `css/site.css`, `js/site.js`: responsive styling, light/dark preference, search/filtering, and reading enhancements. There is no new framework or npm runtime dependency.
- `js/site-mermaid.js`: keeps authored Mermaid diagrams intact and re-renders them in the selected theme; readable source remains if the CDN is unavailable.
- `/archive/`, `/categories/`, `/tags/`, `/resume/`: redesigned secondary pages. Legacy `/archive.html` and `/tags.html` links redirect to their canonical pages.
- Biography, career, education, skill, and project data still come from `_data/index/` and `_includes/sections/about.html`. The biography now presents skill names as accessible tags rather than relying on the old external Chart.js widget.

Themes follow the OS until the reader makes a choice. The choice is saved under the site-only `data-musings-theme` localStorage key and applied before paint. A text-size control next to the theme toggle scales the site between 70–110% (default 90%) via the pre-paint script and saves its preference under `data-musings-text-size`; pages render at 100% when JavaScript is unavailable. Motion respects `prefers-reduced-motion`. Search and theme buttons remain hidden if JavaScript is unavailable; the writing and contents remain accessible.

## Local preview

Normally use your Jekyll/Bundler environment:

```sh
bundle exec jekyll serve
```

This machine's existing lockfile pins an incompatible Nokogiri platform. The established local workaround builds outside the repository:

```sh
JEKYLL_NO_BUNDLER_REQUIRE=true "$HOME/.gem/ruby/2.6.0/bin/jekyll" build --destination /path/to/preview-build
python3 scripts/serve-preview.py --directory /path/to/preview-build --port 8797
```

The preview server supports the site's existing extensionless post links like GitHub Pages does. It also serves the `.html` versions of those same files. Do not commit generated `_site/` output.

## Checks

Use an existing Playwright installation (or supply the path to `playwright-core`). `CHROME_PATH` can select an installed Chrome:

```sh
CHROME_PATH=/path/to/chrome node scripts/test-site-revamp.cjs http://127.0.0.1:8797 /path/to/playwright-core /path/to/screenshots
CHROME_PATH=/path/to/chrome node scripts/test-php-locker-post.cjs /path/to/preview-build /path/to/playwright-core
JEKYLL_BIN=/path/to/jekyll python3 scripts/test-latest-post.py
```

- Main browser checks cover all eight posts and the homepage, topics, archive, biography, and tags in both themes at 320–2560px.
- Tests cover the original six attack scenes, stage controls and captions, server-generated contents, mobile menu, reading progress, Mermaid/theme changes, search/filtering, persisted themes, internal links, and no-JavaScript fallbacks.
- PHP regression checks preserve the original illustrated sequences, tables, disclosures, mouse/keyboard interaction, and 320–3440px layout.
- The latest-post fixture runs in an isolated temporary site, confirms draft/future exclusion and automatic promotion of a newer post, and never edits the real posts.
- The main test explicitly fails if `_posts/` or the original attack-animation assets differ from `origin/master`.

Google Fonts have system-font fallbacks. Mermaid is loaded only for posts opting in via `mermaid: true`. Existing syntax highlighting, authored HTML, diagrams, and post paths continue to use Jekyll.
