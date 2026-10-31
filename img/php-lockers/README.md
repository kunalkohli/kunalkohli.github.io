# PHP locker-room diagrams

The post uses custom locker-room comic strips for the main narrative and optional
Archify technical diagrams in native HTML disclosures. They explain
CVE-2026-109618 and CVE-2026-109619, are educational rather than exploit
instructions, and need no JavaScript to read.

The strips are rendered by `_includes/php-locker-story.html` from
`_data/php_locker_stories.yml`. Each panel reuses the same attendant, green locker A,
blue first bag, orange later bag, and paper slip. Red rings have written failure
labels, and each panel has a plain-language caption. These custom illustrations
are separate from the generated Archify artifacts below.

The flowchart SVGs were generated with [Archify](https://github.com/tt-a1i/archify) 3.2.0 at commit
`25cf37080fc8b1dbe758a4efc3935b55f3327083`. See `LICENSE-Archify.txt`.

The typed JSON sources are in `source/`. The exported SVGs live in
`_includes/php-lockers/` so Jekyll can inline them without a CDN or browser renderer.
Each view has a separate vertical layout for phones. All steps remain visible.

To rebuild, from the repository root:

```sh
node scripts/build-php-locker-diagrams.mjs /path/to/archify/archify /path/to/playwright /path/to/temporary/output
```

The script runs Archify's validation, delivery, artifact, and browser gates before
exporting each SVG. Native HTML and validation receipts stay in the temporary
output directory. Export removes viewer-only controls and decorative empty
margins, namespaces SVG IDs, and retains the authored nodes, arrows, and labels.
The blog's scoped CSS inherits the site typography, uses neutral technical-diagram
colors, and caps technical SVGs at 640px wide (280px for the vertical phone layout).
The illustrated strips use up to three columns on desktop (two for the four-panel
bug sequences) and a single column on phones, keeping the slip text readable.

After building the Jekyll site, run the browser regression checks with:

```sh
node scripts/test-php-locker-post.cjs /path/to/built/site /path/to/playwright /path/to/optional/screenshots
```

The check covers the three strips, two boxed tables, closed-by-default technical
notes, keyboard access, unique SVG IDs, the 1040px reading column, and narrow to
ultrawide layouts without JavaScript.
