#!/usr/bin/env python3
"""Build an isolated fixture to verify automatic latest-published-post selection."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

root = Path(__file__).resolve().parents[1]
jekyll = os.environ.get('JEKYLL_BIN') or shutil.which('jekyll')
if not jekyll:
    raise SystemExit('Set JEKYLL_BIN to an installed Jekyll executable.')

with tempfile.TemporaryDirectory(prefix='latest-post-fixture-', dir=os.environ.get('OPENCODE_TMP')) as directory:
    fixture = Path(directory) / 'source'
    fixture.mkdir()
    for name in ('_layouts', '_includes'):
        shutil.copytree(root / name, fixture / name)
    (fixture / '_config.yml').write_text((root / '_config.yml').read_text() + '\nfuture: true\n')
    (fixture / 'index.html').write_text('---\nlayout: post_listing\n---\n')
    posts = fixture / '_posts'
    posts.mkdir()

    def post(name, title, published=True):
        (posts / name).write_text(f'---\nlayout: post\ntitle: "{title}"\ncategories: [systems]\npublished: {str(published).lower()}\n---\nA fixture, not real blog content.\n')

    post('2020-01-01-older.md', 'Older published story')
    post('2021-01-01-current.md', 'Current published story')
    post('2022-01-01-hidden.md', 'Unpublished story', published=False)
    post('2099-01-01-future.md', 'Future story')
    destination = Path(directory) / 'build'

    def build():
        subprocess.run([jekyll, 'build', '--source', str(fixture), '--destination', str(destination)], cwd=fixture, check=True, env=os.environ.copy(), stdout=subprocess.DEVNULL)
        return (destination / 'index.html').read_text()

    html = build()
    strip = html.split('LATEST: <b>', 1)[1].split('</b>', 1)[0]
    assert 'Current published story' in strip
    assert 'Unpublished story' not in html
    assert 'Future story' not in html
    post('2023-01-01-newer.md', 'Newly published story')
    html = build()
    strip = html.split('LATEST: <b>', 1)[1].split('</b>', 1)[0]
    assert 'Newly published story' in strip
    assert 'Unpublished story' not in html
    assert 'Future story' not in html
    print('PASS: strip advances to the newest published post, excluding drafts and future posts; no real posts were edited.')
