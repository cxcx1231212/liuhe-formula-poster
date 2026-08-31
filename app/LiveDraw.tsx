'use client';

import { useEffect, useRef, useState } from 'react';
import type { LatestLottery, LotteryType } from '@/lib/lottery';

const ballColors = { 1: 'red', 2: 'blue', 3: 'green' } as const;

export default function LiveDraw({ initial, type }: { initial: LatestLottery; type: LotteryType }) {
  const [latest, setLatest] = useState(initial);
  const [updated, setUpdated] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const numberCount = useRef(initial.numberList.length);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const poll = async () => {
      try {
        const response = await fetch(`/api/latest?type=${type}`, { cache: 'no-store' });
        if (response.ok) {
          const incoming = await response.json() as LatestLottery;
          if (!stopped) {
            setLatest(current => {
              const changed = incoming.period !== current.period || incoming.numberList.length > current.numberList.length;
              if (changed) {
                setUpdated(true);
                window.setTimeout(() => setUpdated(false), 900);
              }
              numberCount.current = incoming.numberList.length;
              return incoming;
            });
          }
        }
      } finally {
        if (!stopped) timer = setTimeout(poll, numberCount.current < 7 ? 2000 : 10000);
      }
    };
    timer = setTimeout(poll, 1500);
    return () => { stopped = true; clearTimeout(timer); };
  }, [type]);

  useEffect(() => {
    if (!showPlayer || !videoRef.current) return;
    let disposed = false;
    let player: { attachMediaElement(element: HTMLMediaElement): void; load(): void; play(): void | Promise<void>; pause(): void; unload(): void; detachMediaElement(): void; destroy(): void } | undefined;
    const source = latest.videoUrlForH5 || latest.videoUrl;
    if (!source) return;
    void import('mpegts.js').then(module => {
      if (disposed || !videoRef.current) return;
      const mpegts = module.default;
      if (mpegts.isSupported()) {
        const createdPlayer = mpegts.createPlayer({ type: 'flv', isLive: true, url: source }, { enableWorker: true, enableStashBuffer: false });
        player = createdPlayer;
        createdPlayer.attachMediaElement(videoRef.current);
        createdPlayer.load();
        void Promise.resolve(createdPlayer.play()).catch(() => undefined);
      } else {
        videoRef.current.src = source;
      }
    });
    return () => {
      disposed = true;
      if (player) {
        player.pause();
        player.unload();
        player.detachMediaElement();
        player.destroy();
      }
    };
  }, [showPlayer, latest.videoUrlForH5, latest.videoUrl]);

  const timeMatch = latest.title.match(/(\d{1,2})点(\d{2})分/);
  const nextTime = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : '';
  const slots = Array.from({ length: 7 }, (_, index) => latest.numberList[index]);

  return <section className="live-draw-wrap"><div className={`draw-strip ${updated ? 'live-updated' : ''}`}>
    <div className="draw-issue"><span>{latest.numberList.length < 7 ? '正在开奖' : '最新开奖'}</span><strong>第{String(latest.period).padStart(3, '0')}期</strong><time>{latest.lotteryTime.replaceAll('-', '/')}</time></div>
    <div className="draw-center"><div className="draw-balls">
      {slots.map((item, index) => <span className="live-slot" key={index}>
        {index === 6 && <b>＋</b>}
        {item ? <div className={`draw-ball ${index === 6 ? 'special' : ''}`}><i className={ballColors[item.color]}>{item.number}</i><span>{item.shengXiao}</span>{index === 6 && <em>特码</em>}</div> : <div className={`draw-ball pending ${index === 6 ? 'special' : ''}`}><i>?</i><span>待开</span></div>}
      </span>)}
    </div><div className="next-draw"><span>下期开奖时间</span><strong>{latest.nextLotteryTime.replaceAll('-', '/')}{nextTime && ` · ${nextTime}`}</strong></div></div>
    <div className="draw-tools"><a href={`/history?type=${type}&year=${latest.year}`}>历史记录</a><a href="#picker">挑码助手</a><button type="button" className={showPlayer ? 'active' : ''} onClick={() => setShowPlayer(value => !value)}>{showPlayer ? '收起直播' : '开奖直播'}</button></div>
  </div>{showPlayer && <div className="live-player"><header><div><i></i><strong>开奖直播</strong><span>LIVE</span></div><button type="button" onClick={() => setShowPlayer(false)}>收起 ×</button></header><div className="live-screen">{latest.videoUrlForH5 || latest.videoUrl ? <video ref={videoRef} controls autoPlay muted playsInline/> : <p>当前暂无直播信号</p>}</div></div>}</section>;
}
