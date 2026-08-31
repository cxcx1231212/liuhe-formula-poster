import BoardPostList from './BoardPostList';
import {postAuthor} from '@/lib/post-authors';
type M={rank:string;name?:string};
export default function SizeBoard({type,issue,methods}:{type:string;issue:number;methods:M[]}){
  return <section data-board="size"><div className="pingte-count">大小全公式 · 当前共 {methods.length} 条</div><BoardPostList posts={methods.map((m,index)=>({href:`/posts/size/${issue}/${m.rank}?type=${type}`,issue:`${issue}期`,title:`${postAuthor(type,'size',index)}【特码大小】${m.name||'公式参考'}`}))}/></section>;
}
