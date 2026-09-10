from prepare_content_manifests import kill_branch


draw = {
    'period': 254,
    'numbers': [{'number': str(number)} for number in (1, 2, 3, 4, 5, 6, 7)],
}

assert kill_branch('平3码－平6码循环步长2', draw, 'code')['result'] == '1'
assert kill_branch('平1码不对称交替加3减4', draw, 'code')['result'] == '9'
print('PASS content manifest formula parsing')
