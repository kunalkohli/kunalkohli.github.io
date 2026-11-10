#!/usr/bin/env python3
"""Serve a Jekyll build with GitHub Pages-style extensionless .html URLs."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class PreviewHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        translated = super().translate_path(path)
        candidate = Path(translated)
        if not candidate.exists() and not candidate.suffix:
            html = candidate.with_suffix('.html')
            if html.is_file():
                return str(html)
        return translated


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', required=True)
    parser.add_argument('--port', type=int, default=8797)
    args = parser.parse_args()
    handler = partial(PreviewHandler, directory=str(Path(args.directory).resolve()))
    server = ThreadingHTTPServer(('127.0.0.1', args.port), handler)
    print(f'Preview: http://127.0.0.1:{args.port}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
