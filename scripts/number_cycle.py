"""Lottery-number cycling used only by number-bound formula categories."""


def cycle49(value):
    return (int(value) - 1) % 49 + 1


def cycle_note(raw):
    result = cycle49(raw)
    return str(raw) if result == int(raw) else f"{raw}→回绕{result:02d}"
