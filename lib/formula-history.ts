import {env} from 'cloudflare:workers';

export type FormulaHistoryRow={formulaId:string;board:string;group:string;signature:string;rank?:string;label?:string;image?:string|null;href?:string;prediction?:Record<string,unknown>|null;score?:Record<string,unknown>;status:string;actual?:{number:number;animal:string;date:string}};
export type FormulaHistoryEntry=FormulaHistoryRow&{issue:number};
export type FormulaHistoryView={lotteryType:number;year:number;formulaId:string;label:string;signature:string;entries:FormulaHistoryEntry[]};
export type FormulaSnapshot={issue:number;formulaCount:number;formulas:FormulaHistoryRow[]};
type FormulaArchive={lotteryType:number;year:number;snapshots:FormulaSnapshot[]};
type AssetBinding={fetch(request:Request):Promise<Response>};

const folders:Record<string,string>={pingte:'pingte-all',pingte2:'pingte-two',tema:'tema-bundles',zodiac:'zodiac',fushi:'fushi',danshuang:'danshuang',wave:'wave',wuxing:'wuxing',jiaye:'jiaye',kill:'kill',size:'size',tail:'tail',head:'head'};

async function loadJson(path:string){
  const assets=(env as unknown as {ASSETS?:AssetBinding}).ASSETS;
  if(!assets)return null;
  try{const response=await assets.fetch(new Request('https://assets.local/'+path));return response.ok?await response.json() as any:null;}catch{return null;}
}

async function loadArchive(type:string){
  const safeType=['1','5','8'].includes(type)?type:'5';
  return await loadJson('generated/formula-history/type-'+safeType+'-2026.json') as FormulaArchive|null;
}

function predictionOf(method:Record<string,unknown>){
  const keys=['predictionAnimal','predictionNumber','predictionAnimals','predictionNumbers','numbers','nextAnimal','animals','next','values','outputs','output','prediction','result'];
  const result:Record<string,unknown>={};
  for(const key of keys)if(method[key]!==undefined)result[key]=method[key];
  const branches=Array.isArray(method.branches)?method.branches as Array<Record<string,unknown>>:[];
  if(branches.length){
    result.branches=branches;
    if(result.numbers===undefined){const numbers=branches.flatMap(branch=>Array.isArray(branch.number)?branch.number:branch.number===undefined?[]:[branch.number]);if(numbers.length)result.numbers=numbers;}
  }
  return Object.keys(result).length?result:null;
}

async function livePrediction(type:string,issue:number,row:FormulaHistoryRow){
  const folder=folders[row.board];if(!folder)return null;
  const payload=await loadJson('generated/'+folder+'/type-'+type+'-'+String(issue).padStart(3,'0')+'-manifest.json');
  if(!payload||Number(payload.issue??payload.nextPeriod)!==issue)return null;
  const methods=(row.group?payload.groups?.[row.group]?.methods:payload.methods)??[];
  const wanted=row.formulaId;
  const method=methods.find((item:any,index:number)=>item.formulaId===wanted)??null;
  return method?predictionOf(method):null;
}

export async function formulaHistory(type:string,path:string):Promise<FormulaHistoryView|null>{
  // history-shards-v1: fetch only the selected formula's bounded history shard.
  const safeType=['1','5','8'].includes(type)?type:'5';
  const prefix='generated/formula-history/type-'+safeType+'-2026/';
  const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,2);
  const index=await loadJson(prefix+'paths/'+await hash(path)+'.json');
  if(index){
    const id=index[path];
    if(!id)return null;
    const shard=await loadJson(prefix+'formulas/'+await hash(id)+'.json');
    const record=shard?.[id];
    if(!record)throw new Error('Formula history shard is missing: '+id);
    const current=record.entries.find((row:FormulaHistoryRow)=>row.href===path);
    if(!current)return null;
    const fallback=current.prediction?null:await livePrediction(safeType,current.issue,current);
    return {...record,label:current.label||current.signature,signature:current.signature,entries:record.entries.map((row:FormulaHistoryEntry)=>row.href===path&&!row.prediction?{...row,prediction:fallback}:row)} as FormulaHistoryView;
  }

  const archive=await loadArchive(type);
  if(!archive)return null;
  const current=[...archive.snapshots].reverse().flatMap(snapshot=>snapshot.formulas.map(row=>({snapshot,row}))).find(({row})=>row.href===path);
  if(!current)return null;
  const fallback=current.row.prediction?null:await livePrediction(type,current.snapshot.issue,current.row);
  const entries=archive.snapshots.flatMap(snapshot=>snapshot.formulas.filter(row=>row.formulaId===current.row.formulaId).map(row=>({issue:snapshot.issue,...row,prediction:row.href===path&&!row.prediction?fallback:row.prediction}))).sort((a,b)=>b.issue-a.issue);
  return {lotteryType:archive.lotteryType,year:archive.year,formulaId:current.row.formulaId,label:current.row.label||current.row.signature,signature:current.row.signature,entries};
}
