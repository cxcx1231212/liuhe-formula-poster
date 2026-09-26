// Shared numeric explanation for one- and two-animal pingte algorithms.
// Do not fall back to the algorithm name: unsupported names must be detected.
export function pingteCalculation(name, draw) {
  if (!draw || draw.numbers?.length !== 7) throw new Error('Incomplete pingte source draw');
  const ns = draw.numbers.map(row => Number(row.number));
  const digits = n => String(Math.abs(n)).split('').reduce((sum, digit) => sum + Number(digit), 0);
  const fmt = n => String(n).padStart(2, '0');
  const period = Number(draw.period);
  const normalized = name.replaceAll('特码码', '特码');
  const cell = label => ns[label === '特码' ? 6 : Number(label.match(/平([1-6])/)?.[1]) - 1];
  const details = base => {
    const single = base.match(/^(平[1-6]码|特码)(固定|合数|尾数)?$/);
    if (single) {
      const n = cell(single[1]), kind = single[2];
      const value = kind === '合数' ? digits(n) : kind === '尾数' ? n % 10 : n;
      return { value, text: `${single[1]}${fmt(n)}${kind === '合数' ? `合数${value}` : kind === '尾数' ? `尾数${value}` : ''}`, positions: [single[1] === '特码' ? 7 : Number(single[1][1])] };
    }
    const pair = base.match(/^(平[1-6](?:码)?|特码)(合数|尾数)?([＋－])(平[1-6](?:码)?|特码)(合数|尾数)?$/);
    if (pair) {
      const a = details(pair[1].replace(/^(平\d)$/, '$1码') + (pair[2] || ''));
      const b = details(pair[4].replace(/^(平\d)$/, '$1码') + (pair[5] || ''));
      return { value: a.value + (pair[3] === '＋' ? b.value : -b.value), text: `${a.text}${pair[3]}${b.text}`, positions: [...a.positions, ...b.positions] };
    }
    if (base === '最小平码' || base === '最大平码') {
      const value = (base === '最小平码' ? Math.min : Math.max)(...ns.slice(0, 6));
      return { value, text: `${base}＝${fmt(value)}`, positions: ns.slice(0, 6).flatMap((n, i) => n === value ? [i + 1] : []) };
    }
    if (base === '期数合数') return { value: digits(period), text: `${period}期合数：${String(period).split('').join('＋')}＝${digits(period)}`, positions: [] };
    if (base === '六个平码总分' || base === '七码总分') {
      const values = ns.slice(0, base === '七码总分' ? 7 : 6);
      return { value: values.reduce((a, b) => a + b, 0), text: `${values.map(fmt).join('＋')}`, positions: [] };
    }
    throw new Error('Unsupported pingte base: ' + base);
  };
  let base = normalized, delta = null, rule = '';
  let match = normalized.match(/^(.*?)不对称交替加(\d+)减(\d+)$/);
  if (match) { base = match[1]; delta = period % 2 ? Number(match[2]) : -Number(match[3]); rule = `${period}期${period % 2 ? '为单期，加' + match[2] : '为双期，减' + match[3]}`; }
  else if ((match = normalized.match(/^(.*?)循环步长(\d+)$/))) {
    base = match[1]; const step = (period - 1) % 3 + 1; delta = step * Number(match[2]); rule = `${period}期循环第${step}步：${step}×${match[2]}＝${delta}`;
  } else if ((match = normalized.match(/^(.*?)(双期|三期)?交替加减(\d+)$/))) {
    base = match[1]; const width = match[2] === '双期' ? 2 : match[2] === '三期' ? 3 : 1;
    const positive = width === 1 ? Boolean(period % 2) : Math.floor((period - 1) / width) % 2 === 0;
    delta = (positive ? 1 : -1) * Number(match[3]); rule = `${period}期${match[2] || '单双期'}交替，本期${positive ? '加' : '减'}${match[3]}`;
  } else if ((match = normalized.match(/^(.*?)(加|减)(\d+|期数合数)$/))) {
    base = match[1]; const amount = match[3] === '期数合数' ? digits(period) : Number(match[3]); delta = (match[2] === '加' ? 1 : -1) * amount;
    if (match[3] === '期数合数') rule = `${period}期合数：${String(period).split('').join('＋')}＝${amount}`;
  } else if ((match = normalized.match(/^(六个平码总分|七码总分)(个位|合数)$/))) {
    const source = details(match[1]), value = match[2] === '个位' ? source.value % 10 : digits(source.value);
    return { raw: value, calculation: `${source.text}＝${source.value}；${match[2] === '个位' ? '取个位' : '取合数'}＝${value}`, sourcePositions: source.positions };
  }
  const source = details(base);
  const raw = source.value + (delta || 0);
  const calculation = delta === null ? `${source.text}＝${raw}` : `${source.text}＝${source.value}；${rule ? rule + '；' : ''}${source.value}${delta < 0 ? '－' : '＋'}${Math.abs(delta)}＝${raw}`;
  return { raw, calculation, sourcePositions: source.positions };
}
