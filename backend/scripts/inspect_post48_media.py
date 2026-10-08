#!/usr/bin/env python3
"""Read-only incident diagnosis. Never print credentials or unrelated article content."""
import datetime
import hashlib
import hmac
import json
from pathlib import Path
import shlex
import sqlite3
import subprocess
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path('/var/www/blog/backend')
UUID = '4c24548a-121c-4437-9852-42b321108b5b'
KEY = f'images/2026/10/{UUID}.webp'
config = {}
for line in (ROOT / '.env').read_text().splitlines():
    if '=' not in line or line.lstrip().startswith('#'):
        continue
    key, value = line.split('=', 1)
    if key.strip().startswith('S3_'):
        values = shlex.split(value, comments=True)
        config[key.strip()] = values[0] if values else ''


def request(method, key='', query=None):
    endpoint = config['S3_ENDPOINT'].rstrip('/')
    host = urllib.parse.urlsplit(endpoint).netloc
    path = '/' + urllib.parse.quote(config['S3_BUCKET'], safe='')
    if key:
        path += '/' + urllib.parse.quote(key, safe='/')
    query_string = '&'.join(f'{urllib.parse.quote(k, safe="")}={urllib.parse.quote(v, safe="")}' for k, v in sorted((query or {}).items()))
    now = datetime.datetime.now(datetime.timezone.utc)
    stamp, day = now.strftime('%Y%m%dT%H%M%SZ'), now.strftime('%Y%m%d')
    digest = hashlib.sha256(b'').hexdigest()
    canonical_headers = f'host:{host}\nx-amz-content-sha256:{digest}\nx-amz-date:{stamp}\n'
    signed = 'host;x-amz-content-sha256;x-amz-date'
    canonical = '\n'.join([method, path, query_string, canonical_headers, signed, digest])
    region = config.get('S3_REGION', 'auto')
    scope = f'{day}/{region}/s3/aws4_request'
    message = '\n'.join(['AWS4-HMAC-SHA256', stamp, scope, hashlib.sha256(canonical.encode()).hexdigest()])
    signing = ('AWS4' + config['S3_SECRET_KEY']).encode()
    for value in [day, region, 's3', 'aws4_request']:
        signing = hmac.new(signing, value.encode(), hashlib.sha256).digest()
    signature = hmac.new(signing, message.encode(), hashlib.sha256).hexdigest()
    headers = {'x-amz-date': stamp, 'x-amz-content-sha256': digest, 'Authorization': f'AWS4-HMAC-SHA256 Credential={config["S3_ACCESS_KEY"]}/{scope}, SignedHeaders={signed}, Signature={signature}'}
    url = endpoint + path + ('?' + query_string if query_string else '')
    try:
        with urllib.request.urlopen(urllib.request.Request(url, method=method, headers=headers), timeout=30) as response:
            return response.status, response.read(), dict(response.headers)
    except urllib.error.HTTPError as error:
        return error.code, error.read(), {}

status, _, headers = request('HEAD', KEY)
print(json.dumps({'check': 'authenticated_object_head', 'status': status, 'bytes': headers.get('Content-Length')}))
status, body, _ = request('GET', query={'list-type': '2', 'prefix': f'images/2026/10/{UUID}'})
if status == 200:
    root = ET.fromstring(body)
    matches = [element.text for element in root.iter() if element.tag.split('}')[-1] == 'Key']
    print(json.dumps({'check': 'same_uuid_objects', 'matches': matches}))
else:
    print(json.dumps({'check': 'same_uuid_objects', 'status': status}))

# Only paths matching the incident UUID; never enumerate private files.
print(json.dumps({'check': 'server_file_copies', 'matches': [str(p.relative_to(ROOT)) for p in ROOT.rglob(f'*{UUID}*') if p.is_file()]}))
for path in sorted((ROOT / 'data').rglob('*.db')):
    try:
        connection = sqlite3.connect(f'file:{path}?mode=ro', uri=True)
        rows = connection.execute('SELECT id,title,updated_at FROM posts WHERE content LIKE ? OR cover_url LIKE ? OR post_images LIKE ?', (f'%{UUID}%',) * 3).fetchall()
        connection.close()
        print(json.dumps({'check': 'database_references', 'database': str(path.relative_to(ROOT)), 'matches': rows}, ensure_ascii=False))
    except sqlite3.Error:
        print(json.dumps({'check': 'database_references', 'database': path.name, 'status': 'unavailable_or_not_blog_schema'}))

logs = subprocess.run(['journalctl', '-u', 'blog-backend', '--since', '2026-10-06', '--until', '2026-10-09', '-o', 'short-iso', '--no-pager'], capture_output=True, text=True, timeout=30)
matches = [line for line in logs.stdout.splitlines() if UUID in line]
print(json.dumps({'check': 'target_asset_logs', 'count': len(matches), 'events': [{'time': line.split(' ', 1)[0], 'delete_failure': 'Failed to delete' in line} for line in matches[-20:]]}))
