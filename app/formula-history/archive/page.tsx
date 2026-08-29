import ArchivedFormulaPost from '@/app/ArchivedFormulaPost';

export default async function FormulaArchivePage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const query=await searchParams;
  const type=typeof query.type==='string'?query.type:'5';
  const path=typeof query.path==='string'?query.path:'';
  return <ArchivedFormulaPost type={type} path={path} backHref={`/formula-history?type=${type}&path=${encodeURIComponent(path)}`} backLabel="返回公式历史"/>;
}
