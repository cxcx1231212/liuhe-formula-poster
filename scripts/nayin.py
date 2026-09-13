"""Classify formula numbers by the 60-Jiazi NaYin element cycle."""

ELEMENTS_BY_PAIR = (
    "金", "火", "木", "土", "金", "火", "水", "土", "金", "木",
    "水", "土", "火", "木", "水", "金", "火", "木", "土", "金",
    "火", "水", "土", "金", "木", "水", "土", "火", "木", "水",
)


def element_for_year(year):
    """Return the NaYin element for a Gregorian birth year."""
    jiazi_index = (int(year) - 1984) % 60
    return ELEMENTS_BY_PAIR[jiazi_index // 2]


def element_for_formula_number(value, formula_year):
    """Treat the raw value as nominal age without changing that value."""
    birth_year = int(formula_year) - int(value) + 1
    return element_for_year(birth_year)
