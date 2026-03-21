"""
OrthoSlide Expert V2 — Standalone Launcher
PyInstaller entry point: starts Flask, opens browser automatically.
"""
import sys
import os
import threading
import webbrowser
import time
import socket

# ── Path setup for frozen (PyInstaller) vs dev mode ──────────────────────────
if getattr(sys, 'frozen', False):
    # Running as .exe / .app
    BUNDLE_DIR = sys._MEIPASS
    EXE_DIR    = os.path.dirname(sys.executable)
else:
    # Running as plain Python (development)
    BUNDLE_DIR = os.path.dirname(os.path.abspath(__file__))
    EXE_DIR    = BUNDLE_DIR

# Tell the backend where to find sunum.pptx (next to the exe)
os.environ['ORTHO_EXE_DIR']    = EXE_DIR
os.environ['ORTHO_BUNDLE_DIR'] = BUNDLE_DIR

# Backend modules live inside the bundle
sys.path.insert(0, os.path.join(BUNDLE_DIR, 'backend'))


def find_free_port(preferred=5000):
    """Return preferred port if free, otherwise find a random free one."""
    for port in [preferred, 5001, 5002, 5003, 8080, 8081]:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('', port))
                return port
        except OSError:
            continue
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        return s.getsockname()[1]


PORT = find_free_port()
URL  = f'http://localhost:{PORT}'


def open_browser():
    time.sleep(2.0)
    webbrowser.open(URL)


def main():
    print(f"  OrthoSlide Expert V2")
    print(f"  Adres: {URL}")
    print(f"  Kapatmak icin bu pencereyi kapatin.")

    threading.Thread(target=open_browser, daemon=True).start()

    from app import app
    app.run(host='127.0.0.1', port=PORT, debug=False, use_reloader=False, threaded=True)


if __name__ == '__main__':
    main()
