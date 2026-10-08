"""Package public project configuration only. No machine or 4Wall credential inputs."""
import os
import sys
import json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from runner.client import SupabaseRunnerClient
url = os.environ.get('VITE_SUPABASE_URL', 'https://uukhwkywmnarcfruerpp.supabase.co')
key = os.environ.get('VITE_SUPABASE_PUBLISHABLE_KEY') or os.environ.get('VITE_SUPABASE_ANON_KEY', '')
SupabaseRunnerClient(url, key, 'runner-cuu-4wall-01')  # rejects privileged keys and wrong project
Path('runner_config.public.generated.json').write_text(json.dumps({'supabase_url': url, 'public_key': key, 'runner_id': 'runner-cuu-4wall-01'}), encoding='utf-8')
print('Runner public configuration validated.')
