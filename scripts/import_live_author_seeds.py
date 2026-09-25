"""Capture the currently published author names before stabilizing bundle identities.

Run once for the published issues. The output is a compact, committed migration
map; future builds do not contact the live site to assign authors.
"""

import argparse
import json
from pathlib import Path
from urllib.request import Request, urlopen

from generate_home_board_data import AUTHOR_SEEDS_PATH, STABLE_SOURCE_BOARDS


def import_seeds(base_url, issues):
    boards = {}
    folders = {'zodiac': 'zodiac', 'fushi': 'fushi', 'kill': 'kill'}
    for lottery_type, issue in issues.items():
        for prefix, folder in folders.items():
            url = f'{base_url.rstrip("/")}/generated/{folder}/type-{lottery_type}-{issue}-manifest.json'
            with urlopen(Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json'}), timeout=60) as response:
                payload = json.load(response)
            if int(payload.get('issue', -1)) != issue:
                raise ValueError(f'Wrong published issue at {url}')
            for category, group in payload['groups'].items():
                key = f'{prefix}:{category}'
                if key not in STABLE_SOURCE_BOARDS:
                    continue
                board_key = f'{lottery_type}:{key}'
                registry = boards.setdefault(board_key, {})
                for method in group['methods']:
                    source = method.get('sourceKey')
                    slot = method.get('authorIndex')
                    if not isinstance(source, str) or not source or not isinstance(slot, int):
                        raise ValueError(f'Missing published author identity in {board_key}')
                    if source in registry or slot in registry.values():
                        raise ValueError(f'Duplicate published author identity in {board_key}: {source}')
                    registry[source] = slot
                print(f'{board_key}: preserved {len(registry)} authors', flush=True)
    AUTHOR_SEEDS_PATH.write_text(
        json.dumps({'version': 1, 'boards': boards}, ensure_ascii=False, separators=(',', ':')),
        encoding='utf-8',
    )
    print(f'Wrote {AUTHOR_SEEDS_PATH}', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--base-url', required=True)
    parser.add_argument('--issue', action='append', required=True, help='lotteryType:publishedIssue')
    args = parser.parse_args()
    import_seeds(args.base_url, dict(map(lambda pair: tuple(map(int, pair.split(':', 1))), args.issue)))
