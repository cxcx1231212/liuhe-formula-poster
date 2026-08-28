import { getLotteryYearHistory, isLotteryType, LOTTERY_TYPES, type LotteryType } from '@/lib/lottery';

const CURRENT_YEAR = 2026;
const years = Array.from({ length: CURRENT_YEAR - 1975 + 1 }, (_, index) => CURRENT_YEAR - index);
const colorName = { 1: 'red', 2: 'blue', 3: 'green' } as const;

export default async function History({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const requestedType = typeof query.type === 'string' ? query.type : '1';
  const type: LotteryType = isLotteryType(requestedType) ? requestedType : '1';
  const requestedYear = Number(typeof query.year === 'string' ? query.year : CURRENT_YEAR);
  const year = Number.isInteger(requestedYear) && requestedYear >= 1975 && requestedYear <= CURRENT_YEAR ? requestedYear : CURRENT_YEAR;
  const history = await getLotteryYearHistory(type, year);

  return <main>
    <header className="site-header"><a className="brand" href="/">六合公式库</a><nav><a href="/">返回首页</a></nav></header>
    <section className="history-page">
      <header className="history-heading"><div><span>LOTTERY ARCHIVE</span><h1>开奖历史记录</h1></div><strong>{year}年 · 共{history.total}期</strong></header>
      <nav className="history-types">{Object.entries(LOTTERY_TYPES).map(([value, name]) => <a className={value === type ? 'active' : ''} href={`/history?type=${value}&year=${year}`} key={value}>{name}</a>)}</nav>
      <form className="history-filter" action="/history" method="get"><input type="hidden" name="type" value={type}/><label>选择年份<select name="year" defaultValue={year}>{years.map(value => <option value={value} key={value}>{value}年</option>)}</select></label><button type="submit">查看记录</button></form>
      <div className="history-list">
        {history.records.map(record => <article className="history-row" key={record.id}>
          <div className="history-issue"><span>第{String(record.period).padStart(3, '0')}期</span><time>{record.lotteryTime}</time></div>
          <div className="history-balls">{record.numberList.map((item, index) => <div className={`history-ball ${index === 6 ? 'special' : ''}`} key={`${record.id}-${index}`}><i className={colorName[item.color]}>{item.number}</i><span>{item.shengXiao}</span>{index === 6 && <em>特码</em>}</div>)}</div>
        </article>)}
        {history.records.length === 0 && <div className="history-empty">该年份暂无开奖记录</div>}
      </div>
    </section>
    <footer className="site-footer"><strong>六合公式库</strong><span>LOTTERY ARCHIVE · 1975—2026</span></footer>
  </main>;
}
