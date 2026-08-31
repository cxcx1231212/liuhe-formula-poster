import BoardPostList from './BoardPostList';
import {postAuthor} from '@/lib/post-authors';

type Method={rank:string;next?:string;recentStreak?:number;label:string};
const slogans=['特码单双连准公开','简单加减清楚易懂','历史轨迹逐期验证','本期特单双重点参考','精选规律长期追踪'];

export default function DanshuangBoard({type,issue,methods}:{type:string;issue:number;methods:Method[]}){
  return <>
    <div className="pingte-count">单双全公式 · 当前共 {methods.length} 条公式</div>
    <BoardPostList posts={methods.map((method,index)=>({href:`/posts/danshuang/${issue}/${method.rank}?type=${type}`,issue:`${issue}期`,title:`${postAuthor(type,'danshuang',index)}【${method.label}】${slogans[index%slogans.length]}`}))}/>
  </>;
}
