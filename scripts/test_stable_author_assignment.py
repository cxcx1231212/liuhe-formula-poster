"""A changing selected bundle must keep the published author's slot."""

from generate_home_board_data import (
    AUTHOR_SLOT_LIMIT,
    assign_authors,
    load_author_seeds,
)


seeds = load_author_seeds()
assert set(seeds) == {
    f'{kind}:{board}'
    for kind in (1, 5, 8)
    for board in (
        'zodiac:3', 'zodiac:6', 'zodiac:9',
        'fushi:22', 'fushi:33', 'fushi:2x', 'fushi:3x',
        'kill:code', 'kill:animal', 'kill:tail', 'kill:head', 'kill:wave',
    )
}
for kind in (1, 5, 8):
    slots = [slot for board, values in seeds.items() if board.startswith(f'{kind}:') for slot in values.values()]
    assert len(slots) == len(set(slots))
    assert all(0 <= slot < AUTHOR_SLOT_LIMIT for slot in slots)

source, published_slot = next(iter(seeds['5:zodiac:3'].items()))
author_map = {'version': 1, 'boards': {'5:zodiac:3': {}}}
first = [{'sourceKey': source, 'formulaId': 'old-branches', 'branches': [{'name': '甲'}]}]
second = [{'sourceKey': source, 'formulaId': 'new-branches', 'branches': [{'name': '乙'}]}]
assign_authors(author_map, 5, 'zodiac:3', first, seeds)
assign_authors(author_map, 5, 'zodiac:3', second, seeds)
assert first[0]['authorIndex'] == second[0]['authorIndex'] == published_slot
assert len(author_map['boards']['5:zodiac:3']) == 1

try:
    assign_authors(author_map, 5, 'zodiac:3', second * 2, seeds)
except RuntimeError as error:
    assert 'Duplicate stable author source' in str(error)
else:
    raise AssertionError('duplicate algorithm identity was accepted')

print('PASS changing selected branches keeps the published author')
