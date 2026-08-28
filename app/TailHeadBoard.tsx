import BoardPostList from './BoardPostList';
import {postAuthor} from '@/lib/post-authors';
type M={rank:string;label:string};export default function TailHeadBoard({type,issue,methods,kind}:{type:string;issue:number;methods:M[];kind:'tail'|'head'}){const board=kind==='tail'?'尾数':'头数';return <><div className="pingte-count">{board}连准榜 · 当前共 {methods.length} 条公式</div><BoardPostList posts={methods.map((m,index)=>({href:`/posts/${kind}/${issue}/${m.rank}?type=${type}`,issue:`${issue}期`,title:`${postAuthor(type,kind,index)}【${m.label}】连续命中规律公开`}))}/></>}
