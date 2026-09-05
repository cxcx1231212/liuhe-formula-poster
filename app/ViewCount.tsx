'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';

export default function ViewCount() {
  const pathname = usePathname();
  const [count, setCount] = useState<number | null>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!pathname.startsWith('/posts/')) return;
    setHost(document.querySelector<HTMLElement>('.site-header nav'));
    const storageKey = 'formula-viewed:' + pathname;
    let method = 'POST';
    try {
      if (sessionStorage.getItem(storageKey)) method = 'GET';
      else sessionStorage.setItem(storageKey, '1');
    } catch {
      // A private browser may block session storage; count this page load once.
    }
    const controller = new AbortController();
    void fetch('/api/view-count?path=' + encodeURIComponent(pathname), {
      method,
      cache: 'no-store',
      signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error('view count unavailable');
      return response.json() as Promise<{ count?: number }>;
    }).then(result => {
      if (Number.isInteger(result.count) && Number(result.count) >= 0) setCount(Number(result.count));
    }).catch(() => undefined);
    return () => controller.abort();
  }, [pathname]);

  if (!pathname.startsWith('/posts/') || !host) return null;
  return createPortal(<aside className="post-view-count" aria-live="polite">查看 <strong>{count === null ? '—' : count.toLocaleString('zh-CN')}</strong></aside>, host);
}
