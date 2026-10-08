"""Development CLI for the same outbound Windows runner used by the tray executable."""
import argparse
import getpass
import json
import os
import signal
from pathlib import Path
from runner.client import SupabaseRunnerClient, TokenStore
from runner.engine import RunnerEngine
from runner.source import PlaywrightExcelAdapter
from runner.sync import SENSITIVE


def load_config(path=None):
    path = Path(path) if path else Path(__file__).with_name('runner.config.json')
    generated = Path(__file__).with_name('runner_config.public.generated.json')
    config = json.loads(path.read_text(encoding='utf-8')) if path.exists() else json.loads(generated.read_text(encoding='utf-8')) if generated.exists() else {}
    config.setdefault('supabase_url', 'https://uukhwkywmnarcfruerpp.supabase.co')
    config.setdefault('public_key', os.getenv('SUPABASE_PUBLISHABLE_KEY', ''))
    config.setdefault('runner_id', 'runner-cuu-4wall-01')
    if set(config) - {'supabase_url', 'public_key', 'runner_id'} or any(SENSITIVE.search(name) for name in config):
        raise ValueError('CONFIG_MUST_CONTAIN_PUBLIC_VALUES_ONLY')
    if not __import__('re').fullmatch(r'[a-z0-9][a-z0-9-]{2,79}', config['runner_id']):
        raise ValueError('INVALID_RUNNER_ID')
    return config


def make_client(config, persistent=True):
    store = TokenStore(Path(os.environ.get('LOCALAPPDATA', Path.home())) / 'Visteon4WallRunner' / (config['runner_id'] + '.dpapi')) if os.name == 'nt' and persistent else None
    return SupabaseRunnerClient(config['supabase_url'], config['public_key'], config['runner_id'], store)


def main():
    parser = argparse.ArgumentParser(description='4Wall corporate outbound runner. No listener or shared bot password.')
    parser.add_argument('--config', help='Public configuration JSON, never 4Wall credentials')
    parser.add_argument('--diagnostic', action='store_true', help='Launch installed Edge visibly for this session')
    args = parser.parse_args()
    client = make_client(load_config(args.config))
    if not client.restore():
        client.sign_in(input('Dedicated runner account email: ').strip(), getpass.getpass('Runner account password (enrollment only): '))
    username = input('4Wall username (memory only): ').strip()
    password = getpass.getpass('4Wall password (memory only): ')
    source = PlaywrightExcelAdapter(username, password, visible=args.diagnostic)
    username = password = None
    engine = RunnerEngine(client, source, lambda value: print(json.dumps({key: value.get(key) for key in ('state', 'attempt', 'next_run_at', 'error', 'last_run')})))
    signal.signal(signal.SIGINT, lambda *_: engine.request_close())
    engine.run()


if __name__ == '__main__':
    main()
