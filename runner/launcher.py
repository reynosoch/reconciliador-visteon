"""Windowed launcher: daily memory-only 4Wall login, tray and explicit safe shutdown."""
import json
import os
import queue
import threading
import urllib.request
import webbrowser
from pathlib import Path
from .client import RemoteError
from .engine import RunnerEngine
from .source import PlaywrightExcelAdapter
from .version import VERSION


def check_update():
    request = urllib.request.Request('https://api.github.com/repos/reynosoch/reconciliador-visteon/releases/latest', headers={'Accept': 'application/vnd.github+json', 'User-Agent': 'Visteon4WallRunner/' + VERSION})
    with urllib.request.urlopen(request, timeout=15) as response:
        release = json.loads(response.read(200000))
    tag = release.get('tag_name', '').removeprefix('runner-v').removeprefix('v')
    available = tuple(int(part) for part in tag.split('.')) > tuple(int(part) for part in VERSION.split('.'))
    return {'available': available, 'version': tag, 'url': release.get('html_url')}


class RunnerWindow:
    def __init__(self, root, config):
        import tkinter as tk
        from tkinter import ttk
        from bot_extractor import make_client
        self.root, self.tk, self.ttk = root, tk, ttk
        self.client = make_client(config)
        self.events, self.engine, self.worker, self.tray = queue.Queue(), None, None, None
        self.closing = False
        root.title('Visteon · 4Wall Runner ' + VERSION)
        root.geometry('440x330')
        root.resizable(False, False)
        self.frame = ttk.Frame(root, padding=24)
        self.frame.pack(fill='both', expand=True)
        self.message = tk.StringVar(value='Credenciales 4Wall solo en memoria, cada mañana.')
        self.username, self.password = tk.StringVar(), tk.StringVar()
        ttk.Label(self.frame, text='4Wall corporativo', font=('Segoe UI', 18, 'bold')).pack(anchor='w')
        ttk.Label(self.frame, textvariable=self.message, wraplength=385).pack(anchor='w', pady=12)
        self.form = ttk.Frame(self.frame)
        self.form.pack(fill='x')
        ttk.Label(self.form, text='Usuario 4Wall').pack(anchor='w')
        ttk.Entry(self.form, textvariable=self.username).pack(fill='x', pady=3)
        ttk.Label(self.form, text='Contraseña 4Wall').pack(anchor='w')
        ttk.Entry(self.form, textvariable=self.password, show='•').pack(fill='x', pady=3)
        self.button = ttk.Button(self.form, text='Validar e iniciar', command=self.start)
        self.button.pack(fill='x', pady=12)
        self.visible = tk.BooleanVar(value=False)
        ttk.Checkbutton(self.form, text='Diagnóstico: Edge visible', variable=self.visible).pack(anchor='w')
        root.protocol('WM_DELETE_WINDOW', self.close)
        root.after(100, self.drain_events)

    def enrollment(self):
        from tkinter import simpledialog, messagebox
        try:
            if self.client.restore():
                return True
        except (RemoteError, RuntimeError, OSError):
            messagebox.showerror('Identidad runner', 'No pudimos renovar la identidad técnica. Comprueba la conexión o vuelve a registrar esta máquina.')
        email = simpledialog.askstring('Identidad runner · primer uso', 'Correo de la cuenta técnica dedicada (no tu cuenta operator):', parent=self.root)
        if not email:
            return False
        password = simpledialog.askstring('Identidad runner · primer uso', 'Contraseña de esa cuenta técnica. Solo se guarda su refresh token cifrado con DPAPI:', show='•', parent=self.root)
        if not password:
            return False
        try:
            self.client.sign_in(email.strip(), password)
            return True
        except Exception:
            messagebox.showerror('Identidad runner', 'No pudimos autenticar o guardar la identidad técnica. Revisa el registro y la conexión.')
            return False
        finally:
            email = password = None

    def start(self):
        if self.worker and self.worker.is_alive():
            return
        if not self.username.get().strip() or not self.password.get():
            self.message.set('Escribe usuario y contraseña 4Wall.')
            return
        if not self.enrollment():
            return
        source = PlaywrightExcelAdapter(self.username.get().strip(), self.password.get(), visible=self.visible.get())
        self.username.set('')
        self.password.set('')
        self.button.configure(state='disabled')
        self.message.set('Validando login 4Wall…')
        self.engine = RunnerEngine(self.client, source, self.events.put)
        self.worker = threading.Thread(target=self.engine.run, daemon=True, name='4wall-worker')
        self.worker.start()

    def drain_events(self):
        while not self.events.empty():
            event = self.events.get_nowait()
            if 'ui_action' in event:
                event['ui_action']()
                continue
            if 'update_result' in event:
                self.offer_update(event['update_result'])
                continue
            if event.get('update_error'):
                from tkinter import messagebox
                messagebox.showinfo('Actualización', 'No hay una release verificable ahora. Revisa el artifact del workflow Windows runner; no se cambió el ejecutable.')
                continue
            self.message.set(event.get('error') or ('Estado: ' + event.get('state', 'STARTING')))
            if event.get('login') == 'VALID' and self.tray is None:
                self.make_tray()
                self.root.withdraw()
            if event.get('login') == 'FAILED':
                self.button.configure(state='normal')
                self.root.deiconify()
            if self.tray:
                self.tray.title = '4Wall ' + event.get('state', 'OFFLINE')
        if self.closing and (not self.worker or not self.worker.is_alive()):
            if self.tray:
                self.tray.stop()
            self.root.destroy()
            return
        self.root.after(150, self.drain_events)

    def make_tray(self):
        import pystray
        from PIL import Image, ImageDraw
        icon = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
        draw = ImageDraw.Draw(icon)
        draw.rounded_rectangle((5, 5, 59, 59), radius=12, fill='#f5821f')
        draw.line((17, 22, 47, 22, 17, 42, 47, 42), fill='#111820', width=5)
        def dispatch(callback):
            return lambda *_: self.events.put({'ui_action': callback})
        self.tray = pystray.Icon('visteon-4wall', icon, '4Wall runner', pystray.Menu(
            pystray.MenuItem('Estado', dispatch(self.show_status), default=True),
            pystray.MenuItem('Abrir diagnóstico', dispatch(self.show_diagnostic)),
            pystray.MenuItem('Buscar actualización', dispatch(self.update)),
            pystray.MenuItem('Cerrar runner', dispatch(self.close))))
        threading.Thread(target=self.tray.run, daemon=True, name='4wall-tray').start()

    def show_status(self):
        from tkinter import messagebox
        status = self.engine.status() if self.engine else {}
        messagebox.showinfo('Estado 4Wall', f"Runner {self.client.runner_id}\nEstado: {status.get('state')}\nPróximo corte: {status.get('next_run_at') or 'Pendiente'}\nÚltimo resultado: {(status.get('last_run') or {}).get('status', 'Pendiente')}")

    def show_diagnostic(self):
        from tkinter import messagebox
        status = self.engine.status() if self.engine else {}
        messagebox.showinfo('Diagnóstico sin datos ni credenciales', json.dumps(status, ensure_ascii=False, indent=2))
        # Visible Edge is selected at the next start. Never launch a second Playwright during a run.

    def update(self):
        from tkinter import messagebox
        if self.engine and self.engine.active:
            messagebox.showinfo('Actualización', 'Termina el corte antes de actualizar. El ejecutable no se reemplaza durante un run.')
            return
        def check():
            try:
                result = check_update()
                self.events.put({'update_result': result})
            except Exception:
                self.events.put({'update_error': True})
        threading.Thread(target=check, daemon=True).start()

    def offer_update(self, result):
        from tkinter import messagebox
        if not result['available']:
            messagebox.showinfo('Actualización', 'Esta es la última release publicada.')
        elif result['url'] and result['url'].startswith('https://github.com/reynosoch/reconciliador-visteon/releases/') and messagebox.askyesno('Nueva versión ' + result['version'], '¿Abrir la descarga? Cierra el runner antes de sustituir su carpeta. Después puedes seguir usando tu registro DPAPI.'):
            webbrowser.open(result['url'])

    def close(self):
        import tkinter as tk
        from tkinter import ttk
        if self.engine and self.engine.active:
            dialog = tk.Toplevel(self.root)
            dialog.title('Corte activo')
            ttk.Label(dialog, text='La opción segura termina este corte antes de cerrar.', padding=16).pack()
            def graceful():
                self.closing = True
                self.engine.request_close()
                self.message.set('Terminando corte antes de cerrar…')
                dialog.destroy()
            safe = ttk.Button(dialog, text='Terminar corte y cerrar (recomendado)', command=graceful)
            safe.pack(fill='x', padx=16, pady=6)
            safe.focus_set()
            dialog.bind('<Return>', lambda *_: graceful())
            ttk.Button(dialog, text='Forzar cierre', command=lambda: os._exit(1)).pack(fill='x', padx=16, pady=6)
            ttk.Button(dialog, text='Seguir trabajando', command=dialog.destroy).pack(fill='x', padx=16, pady=6)
            dialog.transient(self.root)
            dialog.grab_set()
        else:
            self.closing = True
            if self.engine:
                self.engine.request_close()


def main():
    import tkinter as tk
    import sys
    from bot_extractor import load_config
    executable_dir = Path(sys.executable).parent if getattr(sys, 'frozen', False) else Path(__file__).parents[1]
    root = tk.Tk()
    try:
        RunnerWindow(root, load_config(executable_dir / 'runner.config.json'))
        root.mainloop()
    except Exception:
        from tkinter import messagebox
        messagebox.showerror('Runner no configurado', 'Revisa runner.config.json: proyecto correcto, clave pública y runner_id. No agregues contraseñas ni service_role al archivo.')
        root.destroy()
