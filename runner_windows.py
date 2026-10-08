"""Windowed entrypoint; CI self-test never authenticates or opens the source."""
import sys


def self_test():
    import json
    import tempfile
    from pathlib import Path
    import tkinter
    import pystray
    import websocket
    from playwright.sync_api import sync_playwright
    from runner.client import TokenStore
    from runner.sync import CONTRACT
    from runner.version import VERSION
    assert tkinter.Tk and pystray.Icon and websocket.create_connection and sync_playwright
    assert CONTRACT['version'] == 1 and len(CONTRACT['fields']) == 14
    with tempfile.TemporaryDirectory() as directory:
        store = TokenStore(Path(directory) / 'test.dpapi')
        store.save('dpapi-smoke-test')
        assert store.load() == 'dpapi-smoke-test'
        assert b'dpapi-smoke-test' not in store.path.read_bytes()
        store.clear()
    if '--result' in sys.argv:
        Path(sys.argv[sys.argv.index('--result') + 1]).write_text(json.dumps({'status': 'OK', 'version': VERSION, 'dpapi': True}), encoding='utf-8')


if __name__ == '__main__':
    if '--self-test' in sys.argv:
        self_test()
    else:
        from runner.launcher import main
        main()
