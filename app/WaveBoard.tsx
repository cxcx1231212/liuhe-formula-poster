import BoardPostList from './BoardPostList';
import {postAuthor} from '@/lib/post-authors';

type Method={rank:string;next?:string;recentStreak?:number};
const slogans=['特码波色连准公开','红蓝绿波清楚展示','简单加减逐期验证','本期特波重点参考','精选规律长期追踪'];
export default function WaveBoard({type,issue,methods}:{type:string;issue:number;methods:Method[]}){
  return <><div className="pingte-count">波色全公式 · 当前共 {methods.length} 条公式</div><BoardPostList posts={methods.map((method,index)=>({href:`/posts/wave/${issue}/${method.rank}?type=${type}`,issue:`${issue}期`,title:`${postAuthor(type,'wave',index)}【特码波色】${slogans[index%slogans.length]}`}))}/></>;
}
