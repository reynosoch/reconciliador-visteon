"""4Wall source boundary. Future official API/QAD adapters implement the same methods."""
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Protocol
from .sync import read_excel


class SourceAdapter(Protocol):
    def login(self): ...
    def extract(self): ...
    def close(self): ...


class SourceError(RuntimeError):
    def __init__(self, code, step):
        super().__init__(code)
        self.code, self.step = code, step


class PlaywrightExcelAdapter:
    def __init__(self, username, password, *, visible=False, login_url='http://cuupd003.chihuahua.visteon.com/4WallAdmin/Pages/Login.aspx', overall_url='http://cuupd003.chihuahua.visteon.com/4WallAdmin/Inventory/Overall.aspx'):
        self._username, self._password = username, password
        self.visible, self.login_url, self.overall_url = visible, login_url, overall_url
        self.playwright = self.browser = self.context = self.page = None

    def _login_form(self):
        return 'login.aspx' in self.page.url.lower() or self.page.locator('#txtPassword').count() > 0

    def login(self):
        from playwright.sync_api import sync_playwright
        if self.playwright is None:
            self.playwright = sync_playwright().start()
            self.browser = self.playwright.chromium.launch(channel='msedge', headless=not self.visible)
            # In-memory context only: no storage_state, persistent profile, tracing or HAR.
            self.context = self.browser.new_context(accept_downloads=True)
            self.page = self.context.new_page()
        try:
            self.page.goto(self.login_url, wait_until='domcontentloaded', timeout=45000)
            self.page.locator('#txtUser').fill(self._username)
            self.page.locator('#txtPassword').fill(self._password)
            self.page.locator('#btnLogin').click()
            self.page.wait_for_url(lambda url: 'login.aspx' not in str(url).lower(), timeout=30000)
            self.page.goto(self.overall_url, wait_until='domcontentloaded', timeout=45000)
            if self._login_form():
                raise SourceError('LOGIN_ERROR', 'login')
        except Exception:
            # Never expose Playwright exceptions: they can include filled values or HTML.
            raise SourceError('LOGIN_ERROR', 'login') from None

    def extract(self):
        download = None
        try:
            self.page.goto(self.overall_url, wait_until='domcontentloaded', timeout=45000)
            if self._login_form():
                self.login()
            button = self.page.get_by_text('Exportar a Excel', exact=False)
            if button.count():
                button.first.click()
            else:
                self.page.evaluate("__doPostBack('ctl00$cphMaster$ExportExcel', '')")
            link = self.page.locator('#ctl00_cphMaster_mdlExcelFile_C_lnkFile')
            link.wait_for(state='visible', timeout=35000)
            with self.page.expect_download(timeout=45000) as event:
                link.click()
            download = event.value
            if download.failure():
                raise SourceError('DOWNLOAD_ERROR', 'download')
            with tempfile.TemporaryDirectory(prefix='visteon-4wall-') as directory:
                path = Path(directory) / 'export.xlsx'
                download.save_as(path)
                if not path.stat().st_size or path.stat().st_size > 100_000_000:
                    raise SourceError('DOWNLOAD_ERROR', 'download')
                try:
                    rows = read_excel(path)
                except Exception:
                    raise SourceError('PARSER_ERROR', 'parse') from None
            return {'rows': rows, 'extracted_at': datetime.now(timezone.utc).isoformat(), 'export_complete': True}
        except SourceError:
            raise
        except Exception:
            raise SourceError('DOWNLOAD_ERROR', 'download') from None
        finally:
            if download:
                try:
                    download.delete()
                except Exception:
                    pass

    def close(self):
        for resource, method in ((self.context, 'close'), (self.browser, 'close'), (self.playwright, 'stop')):
            if resource:
                try:
                    getattr(resource, method)()
                except Exception:
                    pass
        self._username = self._password = None
        self.page = self.context = self.browser = self.playwright = None
