"""
OrthoSlide Expert V2 — Portable launcher
Runs when using the embedded Python package (no system Python needed).
"""
import sys
import os
import threading
import webbrowser
import time
import socket

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, 'backend'))

os.environ['ORTHO_EXE_DIR'] = ROOT


def find_free_port():
    for port in [5000, 5001, 5002, 5003, 8080]:
        try:
            with socket.socket() as s:
                s.bind(('', port))
                return port
        except OSError:
            continue
    with socket.socket() as s:
        s.bind(('', 0))
        return s.getsockname()[1]


PORT = find_free_port()


def open_browser():
    time.sleep(2)
    webbrowser.open(f'http://localhost:{PORT}')


if __name__ == '__main__':
    print(f"  OrthoSlide Expert V2 — http://localhost:{PORT}")
    print("  Kapatmak icin bu pencereyi kapatin.")
    threading.Thread(target=open_browser, daemon=True).start()
    from app import app
    app.run(host='127.0.0.1', port=PORT, debug=False, use_reloader=False, threaded=True)
