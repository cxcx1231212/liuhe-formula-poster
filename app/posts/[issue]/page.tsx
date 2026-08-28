const available = new Set(['091', '092', '093', '094']);
const issues = ['091', '092', '093', '094'];

export default async function Post({ params }: { params: Promise<{ issue: string }> }) {
  const { issue } = await params;
  if (!available.has(issue)) return <main className="not-found"><h1>帖子不存在</h1><a href="/">返回首页</a></main>;
  const index = issues.indexOf(issue);
  const previous = issues[index - 1];
  const next = issues[index + 1];
  return (
    <main className="post-page">
      <header className="site-header">
        <a className="brand" href="/">六合公式库</a>
        <nav><a href="/">首页</a><a href="/#board-绝杀公式">绝杀公式</a></nav>
      </header>
      <article className="detail">
        <div className="detail-topbar">
          <a className="detail-back" href="/"><i>←</i><span><small>BACK TO INDEX</small><strong>返回公式板块</strong></span></a>
        </div>
        <header className="detail-title">
          <span>绝杀公式</span>
          <h1>2026-{issue}期十大杀肖公式</h1>
        </header>
        <figure className="formula-frame">
          <img src={`/posts/2026-${issue}.png`} alt={`2026-${issue}期十大杀肖公式图`} draggable="false" />
        </figure>
        <nav className="post-pager">
          {previous ? <a href={`/posts/${previous}`}><small>上一期</small><strong>第{previous}期公式图</strong></a> : <span />}
          {next ? <a href={`/posts/${next}`}><small>下一期</small><strong>第{next}期公式图</strong></a> : <span />}
        </nav>
      </article>
      <footer className="site-footer"><strong>六合公式库</strong><span>FORMULA POSTS · 2026</span></footer>
    </main>
  );
}
