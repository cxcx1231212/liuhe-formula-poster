import type { ReactNode } from 'react';
import ViewCount from '@/app/ViewCount';

export default function PostsLayout({ children }: { children: ReactNode }) {
  return <>{children}<ViewCount /></>;
}
