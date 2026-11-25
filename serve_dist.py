#!/usr/bin/env python3
import http.server
import os
import socketserver
from pathlib import Path

DIST_DIR = Path(__file__).resolve().parent / "dist"
PORT = int(os.environ.get("PORT", "8090"))
HOST = os.environ.get("HOST", "0.0.0.0")


class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST_DIR), **kwargs)

    def end_headers(self):
        if self.path.startswith("/assets/"):
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        else:
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_GET(self):
        req_path = self.path.split("?", 1)[0].lstrip("/")
        target = DIST_DIR / req_path
        if req_path and not target.exists():
            self.path = "/index.html"
        return super().do_GET()


class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    with ThreadingHTTPServer((HOST, PORT), SPAHandler) as httpd:
        print(f"Serving {DIST_DIR} on http://{HOST}:{PORT}", flush=True)
        httpd.serve_forever()
