# PyInstaller onedir: installed Edge is used; Playwright's Node driver is packaged.
from PyInstaller.utils.hooks import collect_all
pw_data, pw_binaries, pw_hidden = collect_all('playwright')
a = Analysis(['runner_windows.py'], pathex=['.'], binaries=pw_binaries,
    datas=pw_data + [('fourwall_contract.json', '.'), ('runner_config.public.generated.json', '.')],
    hiddenimports=pw_hidden + ['pystray._win32', 'PIL', 'websocket', 'openpyxl', 'tkinter'],
    hookspath=[], runtime_hooks=[], excludes=[], noarchive=False)
pyz = PYZ(a.pure)
exe = EXE(pyz, a.scripts, [], exclude_binaries=True, name='4WallRunner', debug=False,
    bootloader_ignore_signals=False, strip=False, upx=False, console=False)
coll = COLLECT(exe, a.binaries, a.datas, strip=False, upx=False, name='4WallRunner')
