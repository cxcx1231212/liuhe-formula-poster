export const cycle49=(value:number)=>((Math.trunc(value)-1)%49+49)%49+1;
export const cycle49Text=(raw:number)=>{
  const result=cycle49(raw);
  return result===Math.trunc(raw)?String(result):`${raw}→回绕${String(result).padStart(2,'0')}`;
};
