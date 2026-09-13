from prepare_content_manifests import kill_branch


draw = {
    'period': 254,
    'numbers': [{'number': str(number)} for number in (1, 2, 3, 4, 5, 6, 7)],
}

assert kill_branch('平3码－平6码循环步长2', draw, 'code')['result'] == '1'
assert kill_branch('平1码不对称交替加3减4', draw, 'code')['result'] == '-3'
cycled_wave = kill_branch('平1码不对称交替加3减4', draw, 'wave')
assert cycled_wave['result'] == '红波'
assert '-3＋49＝46→杀红波（超出1～49，每次加/减49）' in cycled_wave['calculation']
print('PASS content manifest formula parsing')
