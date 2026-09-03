'use client';
import {usePathname,useSearchParams} from 'next/navigation';

export default function FormulaHistoryButton(){
  const pathname=usePathname();
  const query=useSearchParams();
  if(!pathname.startsWith('/posts/'))return null;
  const type=query.get('type')||'5';
  return <a className="formula-history-fab" href={`/formula-history?type=${type}&path=${encodeURIComponent(pathname)}`}><span>历</span><strong>公式历史</strong></a>;
}
