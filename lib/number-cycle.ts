export const cycle49=(value:number)=>((Math.trunc(value)-1)%49+49)%49+1;
export const cycle49Text=(raw:number)=>{
  const result=cycle49(raw);
  const source=Math.trunc(raw);
  if(result===source)return String(result);
  const adjustment=result-source;
  return `${source}${adjustment>0?'＋':'－'}${Math.abs(adjustment)}＝${String(result).padStart(2,'0')}`;
};
