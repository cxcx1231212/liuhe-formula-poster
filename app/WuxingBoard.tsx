import BoardPostList from './BoardPostList';
import {postAuthor} from '@/lib/post-authors';
type Method={rank:string;label:string;next:string[]};
const slogans=['特五行连准公开','简单算法逐期验证','本期五行重点参考','精选规律长期追踪'];
export default function WuxingBoard({type,issue,methods}:{type:string;issue:number;methods:Method[]}){return <><div className="pingte-count">五行连准榜 · 当前共 {methods.length} 条公式</div><BoardPostList posts={methods.map((method,index)=>({href:`/posts/wuxing/${issue}/${method.rank}?type=${type}`,issue:`${issue}期`,title:`${postAuthor(type,'wuxing',index)}【${method.label}】${slogans[index%slogans.length]}`}))}/></>}
