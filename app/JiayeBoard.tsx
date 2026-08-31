import BoardPostList from './BoardPostList';
import {postAuthor} from '@/lib/post-authors';
type Method={rank:string};const slogans=['家野中特规律公开','生肖家野清楚展示','简单算法逐期验证','本期家野重点参考'];export default function JiayeBoard({type,issue,methods}:{type:string;issue:number;methods:Method[]}){return <><div className="pingte-count">家野全公式 · 当前共 {methods.length} 条公式</div><BoardPostList posts={methods.map((method,index)=>({href:`/posts/jiaye/${issue}/${method.rank}?type=${type}`,issue:`${issue}期`,title:`${postAuthor(type,'jiaye',index)}【家野中特】${slogans[index%slogans.length]}`}))}/></>}
