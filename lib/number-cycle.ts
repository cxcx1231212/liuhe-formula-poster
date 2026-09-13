export const cycle49=(value:number)=>((Math.trunc(value)-1)%49+49)%49+1;
export const cycle49Text=(raw:number)=>{
  let value=Math.trunc(raw),text=String(value);
  while(value<1){value+=49;text+=`＋49＝${value>=1?String(value).padStart(2,'0'):value}`;}
  while(value>49){value-=49;text+=`－49＝${value<=49?String(value).padStart(2,'0'):value}`;}
  return text;
};
export const CYCLE49_NOTE='（超出1～49，每次加/减49）';
