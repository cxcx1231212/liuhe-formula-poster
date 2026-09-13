"""Lottery-number cycling used only by number-bound formula categories."""


def cycle49(value):
    return (int(value) - 1) % 49 + 1


def cycle_note(raw):
    value = int(raw)
    text = str(value)
    while value < 1:
        value += 49
        text += f"＋49＝{value:02d}" if 1 <= value <= 49 else f"＋49＝{value}"
    while value > 49:
        value -= 49
        text += f"－49＝{value:02d}" if 1 <= value <= 49 else f"－49＝{value}"
    return text
