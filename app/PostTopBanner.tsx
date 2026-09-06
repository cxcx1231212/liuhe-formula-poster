'use client';

import {usePathname} from 'next/navigation';
import BoardBanner from './BoardBanner';

export default function PostTopBanner(){
  const pathname=usePathname();
  if(!pathname.startsWith('/posts/'))return null;
  return <div style={{maxWidth:1120,margin:'12px auto 0',padding:'0 12px'}}><BoardBanner index={0}/></div>;
}
