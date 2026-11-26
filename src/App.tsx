import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onValue, push } from '@firebase/database';
import chProfile from '../img/ch.png';
import dryDog from '../img/dry.png';
import happyDog from '../img/happy.png';
import jumpDog from '../img/jump.png';
import titleLogo from '../img/logo.png';
import messDog from '../img/mess.png';
import wetDog from '../img/wet.png';
import { leaderboardRef } from './firebase';

type Screen = 'title' | 'ranking' | 'intro' | 'game' | 'result';
type LeaderboardEntry = {
  id: string;
  nickname: string;
  timeMs: number;
  createdAt: string;
};

type StageMeta = {
  label: string;
  title: string;
  subtitle: string;
  icon: string;
};

const STAGES: StageMeta[] = [
  { label: '01', title: '콩이 잡기', subtitle: '도망가는 콩이를 붙잡아 주세요!', icon: '🐾' },
  { label: '02', title: '물에 푹 적시기', subtitle: '타이밍에 맞춰 시원하게 찰박!', icon: '💦' },
  { label: '03', title: '샴푸질하기', subtitle: '거품이 몽글몽글 올라오도록 복복!', icon: '🫧' },
  { label: '04', title: '뽀송하게 말리기', subtitle: '움직이는 구간을 따라 바람을 쐬어 주세요!', icon: '🌬️' },
];

const TIMING_ZONE_SIZE = 14.4;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function formatTime(ms: number) {
  const safe = Math.max(0, ms);
  const minutes = Math.floor(safe / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  const hundredths = Math.floor((safe % 1000) / 10);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
}

function getResultShareCopy(timeMs: number, rank: number | null) {
  const ranking = rank ? `랭킹 ${rank}위` : '랭킹 도전 중';
  return {
    title: '🐶 콩이를 씻겼다!',
    subtitle: '나보다 빠르게 씻길 수 있을까?',
    record: `기록 (${formatTime(timeMs)}) · ${ranking}`,
    ranking,
    hashtag: '#콩아씻자',
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function useLeaderboard(enabled: boolean) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    return onValue(leaderboardRef, (snapshot) => {
      const value: unknown = snapshot.val();
      const nextEntries = isRecord(value)
        ? Object.entries(value).flatMap(([id, item]) => {
          if (!isRecord(item) || typeof item.nickname !== 'string' ||
            typeof item.timeMs !== 'number' || !Number.isFinite(item.timeMs) ||
            typeof item.createdAt !== 'string') return [];
          return [{ id, nickname: item.nickname, timeMs: item.timeMs, createdAt: item.createdAt }];
        })
        : [];
      setEntries(nextEntries.sort((a, b) => a.timeMs - b.timeMs || a.createdAt.localeCompare(b.createdAt)).slice(0, 100));
      setLoading(false);
      setError(null);
    }, (loadError) => {
      setError(loadError.message);
      setLoading(false);
    });
  }, [enabled]);

  return { entries, loading, error };
}

type LeaderboardState = ReturnType<typeof useLeaderboard>;

const STAGE_DOG_IMAGES = {
  jump: jumpDog,
  mess: messDog,
  wet: wetDog,
  dry: dryDog,
};

function StageDogImage({ state, className = '' }: { state: 'jump' | 'mess' | 'wet' | 'dry'; className?: string }) {
  return <img className={`stage-dog-image ${className}`} src={STAGE_DOG_IMAGES[state]} alt="콩이" draggable={false} />;
}

function LeaderboardRows({ entries, currentEntryId, maxEntries = 5 }: { entries: LeaderboardEntry[]; currentEntryId?: string; maxEntries?: number }) {
  return (
    <div className="leaderboard-list">
      {entries.slice(0, maxEntries).map((entry, index) => (
        <div className={`leaderboard-row ${currentEntryId === entry.id ? 'leaderboard-current' : ''}`} key={entry.id}>
          <span className={`leaderboard-place place-${index + 1}`}>{index + 1}</span>
          <strong>{entry.nickname}</strong>
          <time>{formatTime(entry.timeMs)}</time>
        </div>
      ))}
    </div>
  );
}

function LeaderboardContent({ state, maxEntries = 5, currentEntryId }: { state: LeaderboardState; maxEntries?: number; currentEntryId?: string }) {
  if (state.loading) return <p className="leaderboard-state" role="status">랭킹 불러오는 중…</p>;
  if (state.error) return <p className="leaderboard-state leaderboard-error" role="alert">랭킹을 불러오지 못했어요. {state.error}</p>;
  if (state.entries.length === 0) return <p className="leaderboard-state">아직 등록된 기록이 없어요.</p>;
  return <LeaderboardRows entries={state.entries} currentEntryId={currentEntryId} maxEntries={maxEntries} />;
}

function TitleScreen({ onStart, onRanking, leaderboardState }: { onStart: () => void; onRanking: () => void; leaderboardState: LeaderboardState }) {

  return (
    <main className="title-screen">
      <section className="title-card" aria-label="콩이 목욕 대작전 메인 메뉴">
        <img className="title-logo" src={titleLogo} alt="콩이 목욕 대작전" draggable={false} />
        <section className="title-ranking" aria-label="랭킹 상위 5개">
          <div className="ranking-head">
            <h2>랭킹</h2>
            <button className="ranking-expand-button" onClick={onRanking} aria-label="전체 랭킹 보기">→</button>
          </div>
          <LeaderboardContent state={leaderboardState} />
        </section>
        <div className="title-actions">
          <button className="title-button title-button-primary" onClick={onStart}>시작하기</button>
        </div>
      </section>
    </main>
  );
}

function RankingScreen({ onBack, leaderboardState }: { onBack: () => void; leaderboardState: LeaderboardState }) {
  return (
    <main className="ranking-screen">
      <section className="ranking-page title-ranking" aria-label="전체 랭킹">
        <div className="ranking-page-title">
          <button className="ranking-back-button" onClick={onBack} aria-label="타이틀로 돌아가기">←</button>
          <h1>랭킹</h1>
        </div>
        <LeaderboardContent state={leaderboardState} maxEntries={100} />
      </section>
    </main>
  );
}

function MessageIntro({ onChoice }: { onChoice: (choice: 'yes' | 'smile') => void }) {
  const [reaction, setReaction] = useState<'yes' | 'smile' | null>(null);
  const [revealed, setRevealed] = useState(1);
  const [phonePressed, setPhonePressed] = useState(false);
  const [shakeCount, setShakeCount] = useState(0);

  const choose = (choice: 'yes' | 'smile') => {
    setPhonePressed(true);
    window.setTimeout(() => setPhonePressed(false), 120);
    setReaction(choice);
    window.setTimeout(() => onChoice(choice), 1500);
  };

  const revealMessage = (next: number) => {
    if (reaction || next <= revealed) return;
    setRevealed(next);
    setShakeCount((current) => current + 1);
  };

  const advanceMessage = () => {
    revealMessage(Math.min(4, revealed + 1));
  };

  return (
    <main className="message-screen">
      <section
        className={`phone-frame ${phonePressed ? 'phone-frame-pressed' : ''} ${shakeCount > 0 ? `phone-frame-message-shake-${shakeCount % 2 ? 'a' : 'b'}` : ''}`}
        aria-label="콩이 목욕을 부탁하는 메시지"
        onClick={advanceMessage}
      >
        <div className="phone-status"><span>9:41</span><span>● ● ●</span></div>
        <div className="message-topbar"><span className="message-back">‹</span><img className="message-avatar" src={chProfile} alt="채율" draggable={false} /><div><strong>채율</strong></div></div>
        <div className="message-thread">
          <span className="message-date">오늘</span>
          <button
            className="message-row received-row"
            onClick={(event) => { event.stopPropagation(); revealMessage(2); }}
            aria-label="다음 메시지 보기"
          >
            <img className="message-profile" src={chProfile} alt="" aria-hidden="true" draggable={false} />
            <span className="message-bubble received">형! 큰일났어요! ㅜㅜ</span>
          </button>
          {revealed >= 2 && (
            <button className="message-row received-row no-profile" onClick={(event) => { event.stopPropagation(); revealMessage(3); }} aria-label="다음 메시지 보기">
              <span className="message-profile-spacer" aria-hidden="true" />
              <span className="message-bubble received">그, 예능 촬영이요! 갑자기 일정이 바꼈다던데?</span>
            </button>
          )}
          {revealed >= 3 && (
            <div className="message-row received-row message-group-start">
              <img className="message-profile" src={chProfile} alt="" aria-hidden="true" draggable={false} />
              <span className="message-bubble received">형 진짜진짜 빨리 콩이 씻겨야 해요.</span>
            </div>
          )}
          {revealed >= 4 && (
            <div className="message-row received-row no-profile">
              <span className="message-profile-spacer" aria-hidden="true" />
              <span className="message-bubble received">꼬질꼬질한 콩이도 귀엽지만...😭😭</span>
            </div>
          )}
          {reaction && <div className="message-bubble sent">{reaction === 'yes' ? '알았어' : '^^'}</div>}
        </div>
        {reaction && <div className="message-wait">콩이를 데리러 가는 중…</div>}
      </section>
      {!reaction && revealed >= 4 && (
        <div className="message-choices" aria-label="답장 선택">
          <button onClick={() => choose('yes')}>알았어</button>
          <button onClick={() => choose('smile')}>^^</button>
        </div>
      )}
    </main>
  );
}

function ProgressHeader({ stage, elapsed }: { stage: number; elapsed: number }) {
  return (
    <div className="game-hud">
      <div className="game-hud-progress">
        {STAGES.map((item, index) => (
          <span
            className={`hud-step ${index < stage ? 'hud-step-done' : ''} ${index === stage ? 'hud-step-current' : ''}`}
            key={item.label}
            title={item.title}
          >
            {index < stage ? '✓' : item.label}
          </span>
        ))}
        <span className="game-hud-stage-name" aria-live="polite">{STAGES[stage].title}</span>
      </div>
      <time className="game-hud-time">{formatTime(elapsed)}</time>
    </div>
  );
}

function Meter({ value, label, color = 'blue' }: { value: number; label: string; color?: 'blue' | 'foam' | 'yellow' }) {
  const clampedValue = clamp(value, 0, 100);
  return (
    <div className="meter-wrap" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={clampedValue}>
      <div className={`meter-track meter-${color}`}><span style={{ width: `${clampedValue}%` }} /></div>
      <strong className="meter-value">{Math.round(clampedValue)}%</strong>
    </div>
  );
}

function HoldingStage({ onSuccess, onTipDismiss }: { onSuccess: () => void; onTipDismiss: () => void }) {
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const arenaRef = useRef<HTMLDivElement>(null);
  const dogRef = useRef<HTMLDivElement>(null);
  const holdingRef = useRef(false);
  const holdingSinceRef = useRef<number | null>(null);
  const tipDismissedRef = useRef(false);
  const doneRef = useRef(false);

  useEffect(() => {
    const move = window.setInterval(() => {
      if (doneRef.current) return;
      const arena = arenaRef.current?.getBoundingClientRect();
      const dog = dogRef.current?.getBoundingClientRect();
      if (!arena || !dog || arena.width === 0 || arena.height === 0) return;

      const randomCenter = (sceneSize: number, dogSize: number) => {
        const availableRange = Math.max(0, sceneSize - dogSize);
        const offsetLimit = availableRange > 0 ? availableRange / 2 : sceneSize * 0.05;
        return 50 + (Math.random() * 2 - 1) * (offsetLimit / sceneSize) * 100;
      };

      setPosition({
        x: randomCenter(arena.width, dog.width),
        y: randomCenter(arena.height, dog.height),
      });
    }, 780);
    const meter = window.setInterval(() => {
      if (holdingSinceRef.current !== null && Date.now() - holdingSinceRef.current >= 5000 && !tipDismissedRef.current) {
        tipDismissedRef.current = true;
        onTipDismiss();
      }
      setProgress((current) => {
        const next = holdingRef.current ? Math.min(100, current + 1) : Math.max(0, current - 0.9);
        if (next >= 100 && !doneRef.current) {
          doneRef.current = true;
          onSuccess();
        }
        return next;
      });
    }, 50);
    return () => { window.clearInterval(move); window.clearInterval(meter); };
  }, [onSuccess, onTipDismiss]);

  const startHover = () => {
    if (doneRef.current) return;
    if (!holdingRef.current) holdingSinceRef.current = Date.now();
    holdingRef.current = true;
    setHolding(true);
  };

  const trackPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return;
    const bounds = dogRef.current?.getBoundingClientRect();
    if (!bounds) return;

    const isOverDog = event.clientX >= bounds.left && event.clientX <= bounds.right
      && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
    if (isOverDog) startHover();
    else stopHover();
  };

  const stopHover = () => {
    if (doneRef.current) return;
    holdingRef.current = false;
    holdingSinceRef.current = null;
    setHolding(false);
  };

  const startTouchHold = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') return;
    event.preventDefault();
    startHover();
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* pointer capture is optional */ }
  };

  const stopTouchHold = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') return;
    stopHover();
  };

  return (
    <div className="stage-content">
      <div className="stage-gauge"><Meter value={progress} label="HOLDING GAUGE" color="yellow" /></div>
      <div className="scene holding-scene" ref={arenaRef} onPointerMove={trackPointer}>
        <div className="bathroom-window"><span /><span /><span /><span /></div>
        <div className="bathroom-shelf"><i>🧴</i><i>🪴</i><i>🧼</i></div>
        <div className="scene-sparkle sparkle-a">✦</div><div className="scene-sparkle sparkle-b">✧</div>
        <div ref={dogRef} className={`moving-dog ${holding ? 'moving-dog-held' : ''}`} style={{ left: `${position.x}%`, top: `${position.y}%` }} onPointerEnter={startHover} onPointerLeave={stopHover} onPointerDown={startTouchHold} onPointerUp={stopTouchHold} onPointerCancel={stopTouchHold}>
          <StageDogImage state="jump" />
        </div>
        <div className="scene-caption"><span className="live-dot" />{holding ? '콩이를 꼭 붙잡고 있어요!' : '콩이가 이리저리 도망치는 중…'}</div>
      </div>
    </div>
  );
}

function TimingStage({ onSuccess, onTipDismiss }: { onSuccess: () => void; onTipDismiss: () => void }) {
  const [needle, setNeedle] = useState(0);
  const [progress, setProgress] = useState(0);
  const [feedback, setFeedback] = useState<'PERFECT!' | 'MISS!' | null>(null);
  const [zoneLeft, setZoneLeft] = useState(54);
  const [waterMarks, setWaterMarks] = useState<{ id: number; x: number; y: number; size: number; rotation: number }[]>([]);
  const direction = useRef(1);
  const locked = useRef(false);
  const done = useRef(false);
  const lastHitAt = useRef(0);
  const successfulHits = useRef(0);
  const needleRef = useRef(0);
  const waterMarkId = useRef(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNeedle((value) => {
        let next = value + direction.current * 1.375;
        if (next >= 100) { next = 100; direction.current = -1; }
        if (next <= 0) { next = 0; direction.current = 1; }
        needleRef.current = next;
        return next;
      });
    }, 16);
    return () => window.clearInterval(id);
  }, []);

  const hit = () => {
    const now = Date.now();
    if (locked.current || done.current || now - lastHitAt.current < 60) return;
    lastHitAt.current = now;
    locked.current = true;
    const clickPosition = needleRef.current;
    const zoneRight = zoneLeft + TIMING_ZONE_SIZE;
    const result = clickPosition >= zoneLeft && clickPosition <= zoneRight ? 'PERFECT!' : 'MISS!';
    const gain = result === 'PERFECT!' ? 20 : 0;
    setFeedback(result);
    if (gain) {
      const newWaterMarks = Array.from({ length: 4 }, () => {
        const leftSide = Math.random() < 0.5;
        return {
          id: Date.now() + waterMarkId.current++,
          x: leftSide ? 6 + Math.random() * 16 : 78 + Math.random() * 16,
          y: 10 + Math.random() * 78,
          size: 14 + Math.random() * 18,
          rotation: -30 + Math.random() * 60,
        };
      });
      setWaterMarks((marks) => [...marks, ...newWaterMarks]);
      successfulHits.current += 1;
      if (successfulHits.current >= 2) onTipDismiss();
      setProgress((value) => {
        const next = Math.min(100, value + gain);
        if (next >= 100) {
          done.current = true;
          window.queueMicrotask(onSuccess);
        }
        return next;
      });
      setZoneLeft((current) => {
        const choices = [8, 18, 28, 38, 48, 58, 68, 78];
        const nextChoices = choices.filter((choice) => Math.abs(choice - current) >= 18);
        return nextChoices[Math.floor(Math.random() * nextChoices.length)] ?? 54;
      });
    }
    window.setTimeout(() => {
      setFeedback(null);
      locked.current = false;
    }, result === 'MISS!' ? 220 : 500);
  };

  return (
    <div className="stage-content">
      <div className="stage-gauge"><Meter value={progress} label="WET GAUGE" /></div>
      <div className="scene splash-scene">
        <div
          className="wet-dog-wrap"
          onPointerDown={(event) => { event.preventDefault(); hit(); }}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); hit(); } }}
          role="button"
          tabIndex={0}
          aria-label="콩이를 눌러 물을 뿌리기"
          aria-disabled={!!feedback}
        >
          <StageDogImage state={feedback === 'PERFECT!' ? 'wet' : 'mess'} />
        </div>
        <div className="splash-wetness" aria-hidden="true">
          {waterMarks.map((mark) => (
            <span
              key={mark.id}
              className="splash-water-mark"
              style={{ left: `${mark.x}%`, top: `${mark.y}%`, width: mark.size, height: mark.size * 1.12, rotate: `${mark.rotation}deg` }}
            />
          ))}
        </div>
        <div className={`judgement ${feedback ? 'judgement-show' : ''} ${feedback === 'MISS!' ? 'judgement-miss' : ''}`}>{feedback ?? 'READY?'}</div>
        <div className="timing-game">
          <div className="dryer-track">
            <span className="dryer-target timing-zone" style={{ top: `${zoneLeft}%`, height: `${TIMING_ZONE_SIZE}%` }} />
            <span className="dryer-player" style={{ top: `${needle}%` }} />
          </div>
        </div>
        <div className="scene-caption"><span className="live-dot" />노란 구간 중앙에 맞춰 콩이를 눌러요</div>
      </div>
    </div>
  );
}

type FoamParticle = { id: number; x: number; y: number; size: number };

function MashingStage({ onSuccess, onTipDismiss }: { onSuccess: () => void; onTipDismiss: () => void }) {
  const [progress, setProgress] = useState(0);
  const [particles, setParticles] = useState<FoamParticle[]>([]);
  const lastTap = useRef(Date.now());
  const done = useRef(false);
  const successfulClicks = useRef(0);
  const particleId = useRef(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (done.current) return;
      if (Date.now() - lastTap.current > 900) {
        setProgress((value) => Math.max(0, value - 0.52));
      }
      setParticles((items) => items.filter((item) => Date.now() - item.id < 2400));
    }, 100);
    return () => window.clearInterval(id);
  }, []);

  const mash = useCallback(() => {
    if (done.current) return;
    lastTap.current = Date.now();
    successfulClicks.current += 1;
    if (successfulClicks.current >= 5) onTipDismiss();
    const newParticles = Array.from({ length: 3 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const radius = 8 + Math.random() * 32;
      return {
        id: Date.now() + particleId.current++,
        x: 50 + Math.cos(angle) * radius * 0.58,
        y: 50 + Math.sin(angle) * radius * 0.48,
        size: 24 + Math.random() * 36,
      };
    });
    setParticles((items) => [...items.slice(-42), ...newParticles]);
    setProgress((value) => {
      const next = Math.min(100, value + 2.45);
      if (next >= 100 && !done.current) {
        done.current = true;
        onSuccess();
      }
      return next;
    });
  }, [onSuccess, onTipDismiss]);

  useEffect(() => {
    const keyHandler = (event: KeyboardEvent) => {
      if ((event.code === 'Space' || event.code === 'Enter') && !event.repeat) {
        const tag = (event.target as HTMLElement | null)?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'BUTTON' && tag !== 'A') {
          event.preventDefault();
          mash();
        }
      }
    };
    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, [mash]);

  return (
    <div className="stage-content">
      <div className="stage-gauge"><Meter value={progress} label="FOAM GAUGE" color="foam" /></div>
      <div className="scene foam-scene">
        <div
          className="foam-dog-wrap"
          role="button"
          tabIndex={0}
          onPointerDown={(event) => { event.preventDefault(); mash(); }}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); mash(); } }}
          aria-label="콩이 이미지를 눌러 거품 만들기"
        >
          <StageDogImage state="wet" className="foam-dog-image" />
          {particles.map((particle) => <span key={particle.id} className="foam-particle" style={{ left: `${particle.x}%`, top: `${particle.y}%`, width: particle.size, height: particle.size }} />)}
        </div>
        <div className="foam-cloud cloud-left" /><div className="foam-cloud cloud-right" />
        <div className="scene-caption"><span className="live-dot" />보글보글 거품이 쌓이고 있어요!</div>
      </div>
    </div>
  );
}

function DryerStage({ onSuccess, onTipDismiss }: { onSuccess: () => void; onTipDismiss: () => void }) {
  const [player, setPlayer] = useState(92);
  const [target, setTarget] = useState(50);
  const [dry, setDry] = useState(0);
  const [aligned, setAligned] = useState(false);
  const holdingRef = useRef(false);
  const pressedAtRef = useRef(0);
  const releasedAtRef = useRef(0);
  const playerRef = useRef(92);
  const targetRef = useRef(50);
  const alignedSinceRef = useRef<number | null>(null);
  const tipDismissedRef = useRef(false);
  const targetVelocityRef = useRef(0.9);
  const retargetAtRef = useRef(Date.now() + 520);
  const done = useRef(false);
  const startHoldControl = useCallback(() => {
    if (!holdingRef.current) pressedAtRef.current = Date.now();
    holdingRef.current = true;
  }, []);
  const releaseHold = useCallback(() => {
    if (holdingRef.current) releasedAtRef.current = Date.now();
    holdingRef.current = false;
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (done.current) return;
      const now = Date.now();
      if (now >= retargetAtRef.current) {
        targetVelocityRef.current = (Math.random() < 0.5 ? -1 : 1) * (0.7 + Math.random() * 1.25);
        retargetAtRef.current = now + 380 + Math.random() * 620;
      }
      let targetPosition = targetRef.current + targetVelocityRef.current;
      if (targetPosition <= 13) {
        targetPosition = 13;
        targetVelocityRef.current = 0.7 + Math.random() * 1.25;
        retargetAtRef.current = now + 300 + Math.random() * 480;
      } else if (targetPosition >= 87) {
        targetPosition = 87;
        targetVelocityRef.current = -(0.7 + Math.random() * 1.25);
        retargetAtRef.current = now + 300 + Math.random() * 480;
      }
      targetRef.current = targetPosition;
      const riseSpeed = now - pressedAtRef.current < 250 ? 8.0 : 9.5;
      const fallSpeed = now - releasedAtRef.current < 250 ? 4.8 : 6.0;
      const desiredPlayer = clamp(playerRef.current + (holdingRef.current ? -riseSpeed : fallSpeed), 0, 100);
      const nextPlayer = clamp(playerRef.current + (desiredPlayer - playerRef.current) * 0.48, 0, 100);
      playerRef.current = nextPlayer;
      setPlayer(nextPlayer);
      setTarget(targetPosition);
      const nextAligned = Math.abs(nextPlayer - targetPosition) <= 13;
      if (nextAligned) {
        alignedSinceRef.current ??= now;
        if (now - alignedSinceRef.current >= 5000 && !tipDismissedRef.current) {
          tipDismissedRef.current = true;
          onTipDismiss();
        }
      } else {
        alignedSinceRef.current = null;
      }
      setAligned(nextAligned);
      setDry((value) => {
        const next = clamp(value + (nextAligned ? 0.53 : -0.105), 0, 100);
        if (next >= 100 && !done.current) {
          done.current = true;
          onSuccess();
        }
        return next;
      });
    }, 50);
    window.addEventListener('blur', releaseHold);
    window.addEventListener('pointerup', releaseHold);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('blur', releaseHold);
      window.removeEventListener('pointerup', releaseHold);
    };
  }, [onSuccess, onTipDismiss, releaseHold]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        startHoldControl();
      }
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        releaseHold();
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [releaseHold, startHoldControl]);

  const startHold = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    startHoldControl();
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* optional */ }
  };
  const stopHold = releaseHold;

  return (
    <div className="stage-content">
      <div className="stage-gauge"><Meter value={dry} label="DRYING GAUGE" color="yellow" /></div>
      <div className="scene dryer-scene" onPointerDown={startHold} onPointerUp={stopHold} onPointerCancel={stopHold}>
        <div className="dryer-dog-wrap">
          <StageDogImage state={aligned ? 'dry' : 'wet'} />
          <div className={`dryer-mist ${aligned ? 'dryer-mist-active' : ''}`} aria-hidden="true"><span /><span /><span /></div>
        </div>
        <div className="dryer-game">
          <div className="dryer-track">
            <span className="dryer-target" style={{ top: `${target - 13}%` }} />
            <span className="dryer-player" style={{ top: `${player}%` }} />
          </div>
        </div>
        <div className="scene-caption"><span className="live-dot" />바람으로 털을 말리는 중…</div>
      </div>
    </div>
  );
}

function ResultDogArt() {
  return (
    <div className="result-dog-art">
      <img className="result-dog-image" src={happyDog} alt="목욕을 마친 콩이" draggable={false} />
    </div>
  );
}

async function drawResultImage(timeMs: number, rank: number | null, nickname: string) {
  const happyImage = new Image();
  happyImage.src = happyDog;
  try {
    await happyImage.decode();
  } catch {
    window.alert('콩이 이미지를 불러오지 못해 결과 이미지를 만들 수 없어요.');
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 700;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    window.alert('결과 이미지를 만들 수 없어요.');
    return;
  }

  await document.fonts.ready;
  ctx.scale(2, 2);
  ctx.fillStyle = '#ffe16b';
  ctx.fillRect(0, 0, 600, 350);
  ctx.fillStyle = '#fff8e4';
  ctx.beginPath();
  ctx.arc(300, 300, 317, 0, Math.PI * 2);
  ctx.fill();

  const createdAt = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date());
  ctx.textAlign = 'right';
  ctx.fillStyle = '#a18465';
  ctx.font = '11px "Jua", sans-serif';
  ctx.fillText(createdAt, 580, 24);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#a18465';
  ctx.font = '14px "Jua", sans-serif';
  ctx.fillText('콩이가 보송해졌어요', 300, 56);
  ctx.fillStyle = '#70452f';
  ctx.font = '800 42px "Nunito", monospace';
  ctx.fillText(formatTime(timeMs), 300, 100);

  const dogImageMaxWidth = 380;
  const dogImageMaxHeight = 210;
  const dogImageScale = Math.min(dogImageMaxWidth / happyImage.naturalWidth, dogImageMaxHeight / happyImage.naturalHeight);
  const dogImageWidth = happyImage.naturalWidth * dogImageScale;
  const dogImageHeight = happyImage.naturalHeight * dogImageScale;
  ctx.drawImage(happyImage, 300 - dogImageWidth / 2, 96 + (210 - dogImageHeight) / 2, dogImageWidth, dogImageHeight);

  const details = [
    { x: 190, value: nickname || '콩이 집사', font: '20px "Jua", sans-serif' },
    { x: 410, value: rank ? `${rank}위` : '랭킹 도전 중', font: '22px "Jua", sans-serif' },
  ];
  details.forEach(({ x, value, font }) => {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#70482f';
    ctx.font = font;
    ctx.fillText(value, x, 335, 190);
  });

  const imageUrl = canvas.toDataURL('image/png');
  const anchor = document.createElement('a');
  anchor.href = imageUrl;
  anchor.download = `kongs-bath-time-${formatTime(timeMs).replaceAll(':', '-').replace('.', '-')}.png`;
  anchor.click();
}

function ResultScreen({ timeMs, onRestart, leaderboardState }: { timeMs: number; onRestart: () => void; leaderboardState: LeaderboardState }) {
  const { entries: leaderboard, loading: leaderboardLoading, error: leaderboardError } = leaderboardState;
  const defaultNickname = `콩이의 ${leaderboard.length + 1}번째 어머니`;
  const nicknameLimit = Math.max(12, defaultNickname.length);
  const [nickname, setNickname] = useState('콩이의 1번째 어머니');
  const [nicknameEdited, setNicknameEdited] = useState(false);
  const [rank, setRank] = useState<number | null>(null);
  const [registeredEntry, setRegisteredEntry] = useState<LeaderboardEntry | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!nicknameEdited && !saved) setNickname(defaultNickname);
  }, [defaultNickname, nicknameEdited, saved]);

  const register = async () => {
    if (saving || leaderboardLoading) return;
    const cleanName = (nicknameEdited ? nickname : defaultNickname).trim().slice(0, nicknameLimit) || defaultNickname;
    if (cleanName === '콩이의 1번째 아버지' || cleanName === '콩의의 1번째 아버지') {
      window.alert('우상의 화신이 당신을 바라봅니다');
      return;
    }
    const createdAt = new Date().toISOString();
    setSaving(true);
    setSaveError(false);
    setSaveErrorMessage('');
    try {
      const savedReference = await push(leaderboardRef, { nickname: cleanName, timeMs, createdAt });
      if (!savedReference.key) throw new Error('Firebase가 기록 ID를 반환하지 않았습니다.');
      const entry: LeaderboardEntry = { id: savedReference.key, nickname: cleanName, timeMs, createdAt };
      const updated = [...leaderboard, entry].sort((a, b) => a.timeMs - b.timeMs || a.createdAt.localeCompare(b.createdAt));
      setRegisteredEntry(entry);
      setRank(leaderboardError ? null : updated.findIndex((item) => item.id === entry.id) + 1);
      setSaved(true);
    } catch (error) {
      setSaveErrorMessage(error instanceof Error ? error.message : String(error));
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  const share = () => {
    const copy = getResultShareCopy(timeMs, rank);
    const text = `${copy.title} ${copy.subtitle}\n${copy.record}\n\n${copy.hashtag}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const currentRankEntry = registeredEntry;

  return (
    <main className="result-screen">
      <div className="result-card">
        <div className="result-main">
          <section className="result-copy">
            <h1>목욕 완료<span>!</span></h1>
            <p className="result-description">콩이가 보송해졌어요</p>
            <div className="result-time-box"><strong>{formatTime(timeMs)}</strong></div>
          </section>
          <ResultDogArt />
          {rank && <div className="rank-chip">🏆 GLOBAL RANK <strong>#{rank}</strong></div>}
        </div>
        <div className="result-divider" />
        <section className="ranking-section">
          <div className="ranking-head"><h2>랭킹</h2></div>
          <LeaderboardContent state={leaderboardState} currentEntryId={currentRankEntry?.id} />
        </section>
        <section className="registration-section">
          {!saved && !saveError ? (
            <div className="nickname-form">
              <label htmlFor="nickname">랭킹에 표시할 닉네임</label>
              <div><input id="nickname" value={nickname} maxLength={nicknameLimit} onChange={(event) => { setNicknameEdited(true); setNickname(event.target.value); }} placeholder="닉네임을 입력해주세요" onKeyDown={(event) => { if (event.key === 'Enter') void register(); }} /><button className="primary-button" onClick={() => { void register(); }} disabled={saving || leaderboardLoading}>{saving ? '저장 중…' : '기록 등록'}</button></div>
              <small>최대 {nicknameLimit}자</small>
            </div>
          ) : saved ? (
            <div className="saved-message"><span>🎉</span><div><strong>{currentRankEntry?.nickname ?? nickname}님{rank ? `, ${rank}위로` : ''} 등록 완료!</strong><small>다음에는 더 빠른 기록에 도전해 보세요.</small></div></div>
          ) : saveError ? (
            <div className="saved-message save-warning"><span>⚠️</span><div><strong>Firebase에 기록을 저장하지 못했어요.</strong><small>{saveErrorMessage}</small></div></div>
          ) : null}
        </section>
        <div className="result-actions">
          <button className="share-button" onClick={share}>↗ 공유하기</button>
          <button className="restart-button" onClick={onRestart}>↻ 다시 하기</button>
          <button className="download-button" onClick={() => { void drawResultImage(timeMs, rank, currentRankEntry?.nickname ?? (nickname.trim() || defaultNickname)); }}>↓ 이미지 저장</button>
        </div>
      </div>
    </main>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('title');
  const leaderboardState = useLeaderboard(screen === 'title' || screen === 'ranking' || screen === 'result');
  const [stage, setStage] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const startAt = useRef<number | null>(null);
  const transitionLock = useRef(false);
  const tipDismissed = useRef(false);
  const screenRef = useRef<Screen>(screen);
  const stageRef = useRef(stage);
  screenRef.current = screen;
  stageRef.current = stage;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (screen !== 'title' || event.key !== 'F2' || event.repeat) return;
      event.preventDefault();
      void drawResultImage(12_340, 3, '테스트 집사');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen]);

  useEffect(() => {
    if (screen !== 'game' || startAt.current === null) return;
    const tick = window.setInterval(() => {
      if (startAt.current !== null) setElapsed(Date.now() - startAt.current);
    }, 20);
    return () => window.clearInterval(tick);
  }, [screen]);

  useEffect(() => {
    setShowTip(false);
    tipDismissed.current = false;
    if (screen !== 'game') return;

    const tipDelay = stage === STAGES.length - 1 ? 20_000 : 10_000;
    const timeout = window.setTimeout(() => {
      if (!tipDismissed.current) setShowTip(true);
    }, tipDelay);
    return () => window.clearTimeout(timeout);
  }, [screen, stage]);

  const dismissTip = useCallback(() => {
    tipDismissed.current = true;
    setShowTip(false);
  }, []);

  const begin = useCallback(() => {
    startAt.current = Date.now();
    setElapsed(0);
    setStage(0);
    transitionLock.current = false;
    setTransitioning(false);
    screenRef.current = 'game';
    stageRef.current = 0;
    setScreen('game');
  }, []);

  const completeStage = useCallback(() => {
    if (transitionLock.current || screenRef.current !== 'game') return;
    transitionLock.current = true;
    setTransitioning(true);
    if (stageRef.current === STAGES.length - 1 && startAt.current !== null) {
      setElapsed(Date.now() - startAt.current);
      startAt.current = null;
    }
    window.setTimeout(() => {
      if (stageRef.current < STAGES.length - 1) {
        const nextStage = stageRef.current + 1;
        stageRef.current = nextStage;
        setShowTip(false);
        setStage(nextStage);
        transitionLock.current = false;
        setTransitioning(false);
      } else {
        screenRef.current = 'result';
        setScreen('result');
        setTransitioning(false);
        transitionLock.current = false;
      }
    }, 520);
  }, []);

  const restart = useCallback(() => {
    startAt.current = null;
    setElapsed(0);
    setStage(0);
    setTransitioning(false);
    transitionLock.current = false;
    screenRef.current = 'title';
    stageRef.current = 0;
    setScreen('title');
  }, []);

  const activeStage = useMemo(() => {
    switch (stage) {
      case 0: return <HoldingStage onSuccess={completeStage} onTipDismiss={dismissTip} />;
      case 1: return <TimingStage onSuccess={completeStage} onTipDismiss={dismissTip} />;
      case 2: return <MashingStage onSuccess={completeStage} onTipDismiss={dismissTip} />;
      default: return <DryerStage onSuccess={completeStage} onTipDismiss={dismissTip} />;
    }
  }, [completeStage, dismissTip, stage]);

  if (screen === 'title' || screen === 'ranking') {
    return (
      <div className={`home-carousel ${screen === 'ranking' ? 'show-ranking' : ''}`}>
        <div className="home-carousel-track">
          <div className="home-carousel-panel">
            <TitleScreen onStart={() => setScreen('intro')} onRanking={() => setScreen('ranking')} leaderboardState={leaderboardState} />
          </div>
          <div className="home-carousel-panel">
            <RankingScreen onBack={() => setScreen('title')} leaderboardState={leaderboardState} />
          </div>
        </div>
      </div>
    );
  }
  if (screen === 'intro') return <MessageIntro onChoice={begin} />;
  if (screen === 'result') return <ResultScreen timeMs={elapsed} onRestart={restart} leaderboardState={leaderboardState} />;

  const playTips = [
    '콩이 위에 마우스를 올려보세요',
    '바늘이 파란 구간에 오면 눌러보세요',
    '콩이를 빠르게 눌러보세요',
    '화면을 홀드해 바를 올리고, 놓아보세요',
  ];

  return (
    <main className="game-screen">
      <div className="game-shell">
        <ProgressHeader stage={stage} elapsed={elapsed} />
        <section className={`game-card game-card-minimal ${transitioning ? 'game-card-transition' : ''}`} key={stage}>
          {activeStage}
        </section>
        {showTip && !transitioning && <div className="game-tip"><span>TIP</span><strong>{playTips[stage]}</strong></div>}
      </div>
      {transitioning && <div className="transition-overlay"><span className="transition-paw">🐾</span></div>}
    </main>
  );
}
