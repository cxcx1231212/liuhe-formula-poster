"""Lottery-number cycling used only by number-bound formula categories."""


def cycle49(value):
    return (int(value) - 1) % 49 + 1


def cycle_note(raw):
    result = cycle49(raw)
    raw = int(raw)
    if result == raw:
        return str(raw)
    adjustment = result - raw
    symbol = "＋" if adjustment > 0 else "－"
    return f"{raw}{symbol}{abs(adjustment)}＝{result:02d}"
