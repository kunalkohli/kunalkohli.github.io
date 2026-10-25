# PHP locker-room diagrams

These diagrams explain CVE-2026-109618 and CVE-2026-109619 using paired
locker-room and technical views. They are educational, not exploit instructions.

Generated with [Archify](https://github.com/tt-a1i/archify) 3.2.0 at commit
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
The blog's scoped CSS supplies colors and text styles. The adapted SVGs and
post interactions are checked separately in a browser.
