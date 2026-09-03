import {headers} from 'next/headers';

export type FormulaHistoryRow={formulaId:string;board:string;group:string;signature:string;rank?:string;label?:string;image?:string|null;href?:string;prediction?:Record<string,unknown>|null;score?:Record<string,unknown>;status:string;actual?:{number:number;animal:string;date:string}};
export type FormulaSnapshot={issue:number;formulaCount:number;formulas:FormulaHistoryRow[]};
type FormulaArchive={lotteryType:number;year:number;snapshots:FormulaSnapshot[]};

async function loadArchive(type:string){
  const safeType=['1','5','8'].includes(type)?type:'5';
  const requestHeaders=await headers();
  const host=requestHeaders.get('x-forwarded-host')??requestHeaders.get('host');
  if(!host)return null;
  const protocol=requestHeaders.get('x-forwarded-proto')??'https';
  try{
    const response=await fetch(`${protocol}://${host}/generated/formula-history/type-${safeType}-2026.json`,{cache:'no-store'});
    if(!response.ok)return null;
    return await response.json() as FormulaArchive;
  }catch{return null;}
}

export async function formulaHistory(type:string,path:string){
  const archive=await loadArchive(type);
  if(!archive)return null;
  const current=[...archive.snapshots].reverse().flatMap(snapshot=>snapshot.formulas.map(row=>({snapshot,row}))).find(({row})=>row.href===path);
  if(!current)return null;
  const entries=archive.snapshots.flatMap(snapshot=>snapshot.formulas.filter(row=>row.formulaId===current.row.formulaId).map(row=>({issue:snapshot.issue,...row}))).sort((a,b)=>b.issue-a.issue);
  return {lotteryType:archive.lotteryType,year:archive.year,formulaId:current.row.formulaId,label:current.row.label||current.row.signature,signature:current.row.signature,entries};
}
