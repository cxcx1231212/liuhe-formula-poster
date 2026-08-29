import history1 from '@/public/generated/formula-history/type-1-2026.json';
import history5 from '@/public/generated/formula-history/type-5-2026.json';
import history8 from '@/public/generated/formula-history/type-8-2026.json';

export type FormulaHistoryRow={formulaId:string;board:string;group:string;signature:string;rank?:string;label?:string;image?:string|null;href?:string;prediction?:Record<string,unknown>|null;score?:Record<string,unknown>;status:string;actual?:{number:number;animal:string;date:string}};
export type FormulaSnapshot={issue:number;formulaCount:number;formulas:FormulaHistoryRow[]};
type FormulaArchive={lotteryType:number;year:number;snapshots:FormulaSnapshot[]};

const archives:Record<string,FormulaArchive>={'1':history1 as FormulaArchive,'5':history5 as FormulaArchive,'8':history8 as FormulaArchive};

export function formulaHistory(type:string,path:string){
  const archive=archives[type]??archives['5'];
  const current=[...archive.snapshots].reverse().flatMap(snapshot=>snapshot.formulas.map(row=>({snapshot,row}))).find(({row})=>row.href===path);
  if(!current)return null;
  const entries=archive.snapshots.flatMap(snapshot=>snapshot.formulas.filter(row=>row.formulaId===current.row.formulaId).map(row=>({issue:snapshot.issue,...row}))).sort((a,b)=>b.issue-a.issue);
  return {lotteryType:archive.lotteryType,year:archive.year,formulaId:current.row.formulaId,label:current.row.label||current.row.signature,signature:current.row.signature,entries};
}

export function archivedFormula(type:string,path:string){
  const history=formulaHistory(type,path);
  if(!history)return null;
  return history.entries.find(entry=>entry.href===path)??null;
}
