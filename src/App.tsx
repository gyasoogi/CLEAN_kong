import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Screen = 'title' | 'intro' | 'ranking' | 'game' | 'result';
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

const LEADERBOARD_KEY = 'kongsBathTimeLeaderboardV1';
const STAGES: StageMeta[] = [
  { label: '01', title: '콩이 잡기', subtitle: '도망가는 콩이를 붙잡아 주세요!', icon: '🐾' },
  { label: '02', title: '물 끼얹기', subtitle: '타이밍에 맞춰 시원하게 찰박!', icon: '💦' },
  { label: '03', title: '복복복 샴푸', subtitle: '거품이 몽글몽글 올라오도록 복복!', icon: '🫧' },
  { label: '04', title: '뽀송 드라이', subtitle: '움직이는 구간을 따라 바람을 쐬어 주세요!', icon: '🌬️' },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function formatTime(ms: number) {
  const safe = Math.max(0, ms);
  const minutes = Math.floor(safe / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  const hundredths = Math.floor((safe % 1000) / 10);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
}

function readLeaderboard(): LeaderboardEntry[] {
  try {
    const stored = localStorage.getItem(LEADERBOARD_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is LeaderboardEntry =>
        !!item && typeof item.id === 'string' && typeof item.nickname === 'string' &&
        typeof item.timeMs === 'number' && Number.isFinite(item.timeMs) && typeof item.createdAt === 'string',
      )
      .sort((a, b) => a.timeMs - b.timeMs || a.createdAt.localeCompare(b.createdAt));
  } catch {
    return [];
  }
}

function saveLeaderboard(entries: LeaderboardEntry[]) {
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries.slice(0, 100)));
    return true;
  } catch {
    return false;
  }
}

function makeId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function DogCharacter({ wet = 0, happy = false, grabbed = false, compact = false }: {
  wet?: number;
  happy?: boolean;
  grabbed?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`dog-character ${compact ? 'dog-compact' : ''} ${grabbed ? 'dog-grabbed' : ''} ${happy ? 'dog-happy' : ''}`} aria-label="귀여운 강아지 콩이">
      <span className="dog-shadow" />
      <span className="dog-tail" />
      <span className="dog-body"><i className="dog-belly" /></span>
      <span className="dog-paw paw-back" />
      <span className="dog-paw paw-front" />
      <span className="dog-ear ear-left" />
      <span className="dog-ear ear-right" />
      <span className="dog-head">
        <i className="dog-brow brow-left" />
        <i className="dog-brow brow-right" />
        <i className="dog-eye eye-left" />
        <i className="dog-eye eye-right" />
        <i className="dog-cheek cheek-left" />
        <i className="dog-cheek cheek-right" />
        <i className="dog-muzzle" />
        <i className="dog-nose" />
        <i className="dog-mouth" />
        {happy && <i className="dog-tongue" />}
      </span>
      {wet > 0 && <span className="wet-shine" style={{ opacity: clamp(wet / 100, 0, 0.9) }} />}
      {wet > 12 && <span className="wet-drop drop-one">💧</span>}
      {wet > 52 && <span className="wet-drop drop-two">💦</span>}
      {wet > 82 && <span className="dry-fluff">✦</span>}
    </div>
  );
}

function Bubble({ style, className = '' }: { style?: React.CSSProperties; className?: string }) {
  return <span className={`bubble ${className}`} style={style} />;
}

function StageDogImage({ state, className = '' }: { state: 'jump' | 'mess' | 'wet' | 'dry'; className?: string }) {
  return <img className={`stage-dog-image ${className}`} src={`/img/${state}.png`} alt="콩이" draggable={false} />;
}

function TitleScreen({ onStart, onRanking }: { onStart: () => void; onRanking: () => void }) {
  return (
    <main className="title-screen">
      <section className="title-card" aria-label="콩이 목욕 대작전 메인 메뉴">
        <div className="title-main">
          <div className="title-copy">
            <p>MINI WASHING MISSION</p>
            <h1>콩이 목욕<br />대작전</h1>
            <span>도망가는 콩이를 잡고<br />보송보송 목욕을 도와주세요.</span>
          </div>
          <div className="title-illustration" role="img" aria-label="목욕 전 콩이 일러스트">
            <Bubble className="title-bubble bubble-one" />
            <Bubble className="title-bubble bubble-two" />
            <Bubble className="title-bubble bubble-three" />
            <span className="title-sparkle sparkle-one">✦</span>
            <span className="title-sparkle sparkle-two">✧</span>
            <DogCharacter />
          </div>
        </div>
        <div className="title-actions">
          <button className="title-button title-button-primary" onClick={onStart}><span>시작하기</span><b>→</b></button>
          <button className="title-button" onClick={onRanking}><span>랭킹 보기</span><b>🏆</b></button>
        </div>
      </section>
    </main>
  );
}

function MessageIntro({ onChoice }: { onChoice: (choice: 'yes' | 'smile') => void }) {
  const [reaction, setReaction] = useState<'yes' | 'smile' | null>(null);
  const [revealed, setRevealed] = useState(1);

  const choose = (choice: 'yes' | 'smile') => {
    setReaction(choice);
    window.setTimeout(() => onChoice(choice), 1500);
  };

  const advanceMessage = () => {
    if (!reaction) setRevealed((current) => Math.min(3, current + 1));
  };

  return (
    <main className="message-screen">
      <section
        className="phone-frame"
        aria-label="콩이 목욕을 부탁하는 메시지"
        onClick={advanceMessage}
      >
        <div className="phone-status"><span>9:41</span><span>● ● ●</span></div>
        <div className="message-topbar"><span className="message-back">‹</span><span className="message-avatar">🐶</span><div><strong>채율</strong></div></div>
        <div className="message-thread">
          <span className="message-date">오늘</span>
          <button
            className="message-row received-row"
            onClick={(event) => { event.stopPropagation(); setRevealed((current) => Math.max(current, 2)); }}
            aria-label="다음 메시지 보기"
          >
            <span className="message-profile">🐶</span>
            <span className="message-bubble received">형!</span>
          </button>
          {revealed >= 2 && (
            <button className="message-row received-row no-profile" onClick={(event) => { event.stopPropagation(); setRevealed((current) => Math.max(current, 3)); }} aria-label="마지막 메시지 보기">
              <span className="message-profile-spacer" aria-hidden="true" />
              <span className="message-bubble received">한 시간 뒤에 매니저님 오신대요!</span>
            </button>
          )}
          {revealed >= 3 && (
            <div className="message-row received-row">
              <span className="message-profile">🐶</span>
              <span className="message-bubble received">콩이 얼른 씻겨야 해요!! ㅜㅜ</span>
            </div>
          )}
          {reaction && <div className="message-bubble sent">{reaction === 'yes' ? '알았어' : '^^'}</div>}
          {reaction && <div className="message-reaction">{reaction === 'yes' ? '감사합니다!! 🥹' : '…형 믿을게요 ^^'}</div>}
        </div>
        {reaction && <div className="message-wait">콩이를 데리러 가는 중…</div>}
      </section>
      {!reaction && revealed >= 3 && (
        <div className="message-choices" aria-label="답장 선택">
          <button onClick={() => choose('yes')}>알았어</button>
          <button onClick={() => choose('smile')}>^^</button>
        </div>
      )}
    </main>
  );
}

function RankingScreen({ onBack }: { onBack: () => void }) {
  const [leaderboard] = useState<LeaderboardEntry[]>(() => readLeaderboard());

  return (
    <main className="ranking-screen">
      <section className="ranking-page">
        <p className="ranking-page-kicker">KONG'S BATH TIME</p>
        <h1>랭킹</h1>
        {leaderboard.length > 0 ? (
          <div className="ranking-page-list">
            {leaderboard.slice(0, 20).map((entry, index) => (
              <div className="ranking-page-row" key={entry.id}>
                <span className="ranking-page-place">{String(index + 1).padStart(2, '0')}</span>
                <strong>{entry.nickname}</strong>
                <time>{formatTime(entry.timeMs)}</time>
              </div>
            ))}
          </div>
        ) : (
          <p className="ranking-page-empty">아직 등록된 기록이 없어요.</p>
        )}
        <button className="ranking-back-button" onClick={onBack}>돌아가기</button>
        <p className="ranking-page-note">기록은 현재 브라우저에 저장됩니다.</p>
      </section>
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
      </div>
      <time className="game-hud-time">{formatTime(elapsed)}</time>
    </div>
  );
}

function Meter({ value, label, color = 'blue' }: { value: number; label: string; color?: 'blue' | 'foam' | 'yellow' }) {
  return (
    <div className="meter-wrap">
      <div className="meter-caption"><span>{label}</span><strong>{Math.round(value)}%</strong></div>
      <div className={`meter-track meter-${color}`}><span style={{ width: `${clamp(value, 0, 100)}%` }} /></div>
    </div>
  );
}

function HoldingStage({ onSuccess }: { onSuccess: () => void }) {
  const [position, setPosition] = useState({ x: 18, y: 28 });
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const arenaRef = useRef<HTMLDivElement>(null);
  const dogRef = useRef<HTMLDivElement>(null);
  const holdingRef = useRef(false);
  const doneRef = useRef(false);

  useEffect(() => {
    const move = window.setInterval(() => {
      if (doneRef.current) return;
      setPosition({ x: 10 + Math.random() * 72, y: 12 + Math.random() * 35 });
    }, 780);
    const meter = window.setInterval(() => {
      setProgress((current) => {
        const next = holdingRef.current ? Math.min(100, current + 2.4) : Math.max(0, current - 0.9);
        if (next >= 100 && !doneRef.current) {
          doneRef.current = true;
          onSuccess();
        }
        return next;
      });
    }, 50);
    return () => { window.clearInterval(move); window.clearInterval(meter); };
  }, [onSuccess]);

  const startHover = () => {
    if (doneRef.current) return;
    holdingRef.current = true;
    setHolding(true);
  };

  const stopHover = () => {
    if (doneRef.current) return;
    holdingRef.current = false;
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
      <div className="scene holding-scene" ref={arenaRef}>
        <div className="bathroom-window"><span /><span /><span /><span /></div>
        <div className="bathroom-shelf"><i>🧴</i><i>🪴</i><i>🧼</i></div>
        <div className="scene-sparkle sparkle-a">✦</div><div className="scene-sparkle sparkle-b">✧</div>
        <div ref={dogRef} className={`moving-dog ${holding ? 'moving-dog-held' : ''}`} style={{ left: `${position.x}%`, top: `${position.y}%` }} onPointerEnter={startHover} onPointerLeave={stopHover} onPointerDown={startTouchHold} onPointerUp={stopTouchHold} onPointerCancel={stopTouchHold}>
          <StageDogImage state="jump" />
          {!holding && <span className="dog-exclaim">!</span>}
        </div>
        {holding && <div className="hold-ring" style={{ left: `${position.x}%`, top: `${position.y}%` }}>잡았다!</div>}
        <div className="scene-caption"><span className="live-dot" />{holding ? '콩이를 꼭 붙잡고 있어요!' : '콩이가 이리저리 도망치는 중…'}</div>
      </div>
      <div className="stage-controls holding-controls" />
    </div>
  );
}

function TimingStage({ onSuccess }: { onSuccess: () => void }) {
  const [needle, setNeedle] = useState(0);
  const [progress, setProgress] = useState(0);
  const [feedback, setFeedback] = useState<'PERFECT!' | 'MISS!' | null>(null);
  const [splashKey, setSplashKey] = useState(0);
  const [hits, setHits] = useState(0);
  const [zoneLeft, setZoneLeft] = useState(54);
  const direction = useRef(1);
  const locked = useRef(false);
  const done = useRef(false);
  const lastHitAt = useRef(0);
  const needleRef = useRef(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNeedle((value) => {
        let next = value + direction.current * 1.25;
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
    const zoneRight = zoneLeft + 18;
    const result = clickPosition >= zoneLeft && clickPosition <= zoneRight ? 'PERFECT!' : 'MISS!';
    const gain = result === 'PERFECT!' ? 30 : 0;
    setFeedback(result);
    setSplashKey((value) => value + 1);
    if (gain) {
      setProgress((value) => {
        const next = Math.min(100, value + gain);
        if (next >= 100) {
          done.current = true;
          window.queueMicrotask(onSuccess);
        }
        return next;
      });
      setHits((value) => value + 1);
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
        <div className="shower-head">🚿</div>
        <div className="water-stream" />
        <div className="wet-dog-wrap"><StageDogImage state={feedback === 'PERFECT!' ? 'wet' : 'mess'} /></div>
        {Array.from({ length: 6 }, (_, index) => <Bubble key={`${splashKey}-${index}`} className="splash-particle" style={{ left: `${35 + ((index * 13 + splashKey * 7) % 45)}%`, top: `${43 + ((index * 19 + splashKey * 5) % 26)}%`, animationDelay: `${index * 35}ms` }} />)}
        <div className={`judgement ${feedback ? 'judgement-show' : ''} ${feedback === 'MISS!' ? 'judgement-miss' : ''}`}>{feedback ?? 'READY?'}</div>
        <div className="scene-caption"><span className="live-dot" />찰박찰박! 콩이 털을 적시는 중</div>
      </div>
      <div className="stage-controls timing-controls">
        <div className="timing-action">
          <div className="timing-labels"><span>MISS</span><strong>PERFECT ZONE</strong><span>MISS</span></div>
          <div className="timing-track" onPointerDown={(event) => { event.stopPropagation(); hit(); }} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); hit(); } }} aria-label="타이밍 게이지를 눌러 물 뿌리기">
            <span className="timing-zone" style={{ left: `${zoneLeft}%` }} />
            <span className="timing-needle" style={{ left: `${needle}%` }} />
          </div>
          <button className="action-button splash-button" onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); hit(); }} disabled={!!feedback}>💧 물 끼얹기!</button>
        </div>
        <div className="under-note"><span>성공 {hits}회</span><span>파란 구간 중앙에 가까울수록 높은 점수!</span></div>
      </div>
    </div>
  );
}

type FoamParticle = { id: number; x: number; y: number; size: number };

function MashingStage({ onSuccess }: { onSuccess: () => void }) {
  const [progress, setProgress] = useState(0);
  const [taps, setTaps] = useState(0);
  const [particles, setParticles] = useState<FoamParticle[]>([]);
  const lastTap = useRef(Date.now());
  const done = useRef(false);
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
    setTaps((value) => value + 1);
    const angle = Math.random() * Math.PI * 2;
    const radius = 18 + Math.random() * 58;
    const newParticle = {
      id: Date.now() + particleId.current++,
      x: 50 + Math.cos(angle) * radius * 0.58,
      y: 50 + Math.sin(angle) * radius * 0.48,
      size: 24 + Math.random() * 36,
    };
    setParticles((items) => [...items.slice(-42), newParticle]);
    setProgress((value) => {
      const next = Math.min(100, value + 2.45);
      if (next >= 100 && !done.current) {
        done.current = true;
        onSuccess();
      }
      return next;
    });
  }, [onSuccess]);

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
        <div className="foam-bath-ring" />
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
        <span className="foam-label">BUBBLE BATH ✦</span>
        <div className="scene-caption"><span className="live-dot" />보글보글 거품이 쌓이고 있어요!</div>
      </div>
      <div className="stage-controls mash-controls">
        <div className="under-note"><span>연타 {taps}회</span><span>잠시 쉬면 거품이 조금씩 사라져요.</span></div>
      </div>
    </div>
  );
}

function DryerStage({ onSuccess }: { onSuccess: () => void }) {
  const [player, setPlayer] = useState(92);
  const [target, setTarget] = useState(50);
  const [dry, setDry] = useState(0);
  const [air, setAir] = useState(0);
  const [aligned, setAligned] = useState(false);
  const holdingRef = useRef(false);
  const playerRef = useRef(92);
  const targetRef = useRef(50);
  const targetVelocityRef = useRef(0.9);
  const retargetAtRef = useRef(Date.now() + 520);
  const done = useRef(false);

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
      const desiredPlayer = clamp(playerRef.current + (holdingRef.current ? -10.4 : 6.0), 0, 100);
      const nextPlayer = clamp(playerRef.current + (desiredPlayer - playerRef.current) * 0.48, 0, 100);
      playerRef.current = nextPlayer;
      setPlayer(nextPlayer);
      setTarget(targetPosition);
      setAir((value) => (value + 1) % 4);
      setDry((value) => {
        const nextAligned = Math.abs(nextPlayer - targetPosition) <= 13;
        setAligned(nextAligned);
        const next = clamp(value + (nextAligned ? 0.53 : -0.105), 0, 100);
        if (next >= 100 && !done.current) {
          done.current = true;
          onSuccess();
        }
        return next;
      });
    }, 50);
    const resetHold = () => { holdingRef.current = false; };
    window.addEventListener('blur', resetHold);
    window.addEventListener('pointerup', resetHold);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('blur', resetHold);
      window.removeEventListener('pointerup', resetHold);
    };
  }, [onSuccess]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        holdingRef.current = true;
      }
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        holdingRef.current = false;
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const startHold = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    holdingRef.current = true;
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* optional */ }
  };
  const stopHold = () => { holdingRef.current = false; };

  return (
    <div className="stage-content">
      <div className="stage-gauge"><Meter value={dry} label="DRYING GAUGE" color="yellow" /></div>
      <div className="scene dryer-scene" onPointerDown={startHold} onPointerUp={stopHold} onPointerCancel={stopHold}>
        <div className={`wind-lines wind-${air}`}><i /><i /><i /></div>
        <div className="dryer-emoji">💨</div>
        <div className="dryer-dog-wrap"><StageDogImage state={aligned ? 'dry' : 'wet'} /></div>
        <div className="fur-sparkle sparkle-left">✧</div><div className="fur-sparkle sparkle-right">✦</div>
        <div className="dryer-game">
          <div className="dryer-track">
            <span className="dryer-target" style={{ top: `${target - 13}%` }} />
            <span className="dryer-player" style={{ top: `${player}%` }} />
          </div>
        </div>
        <div className="scene-caption"><span className="live-dot" />바람으로 털을 말리는 중…</div>
      </div>
      <div className="stage-controls dryer-controls">
        <div className="dryer-hold-hint"><span>누르는 동안 ↑</span><span>떼면 ↓</span></div>
      </div>
    </div>
  );
}

function ResultDogArt() {
  return (
    <div className="result-dog-art">
      <div className="result-halo" />
      <span className="result-star star-one">✦</span><span className="result-star star-two">✧</span><span className="result-star star-three">✦</span>
      <DogCharacter happy />
      <span className="result-ribbon">FRESH & FLUFFY!</span>
    </div>
  );
}

function drawResultImage(timeMs: number, rank: number | null, nickname: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 675;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const gradient = ctx.createLinearGradient(0, 0, 1200, 675);
  gradient.addColorStop(0, '#eafaff');
  gradient.addColorStop(1, '#c9edff');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 675);

  ctx.fillStyle = 'rgba(255,255,255,.58)';
  for (let i = 0; i < 23; i++) {
    const x = (i * 197 + 43) % 1200;
    const y = (i * 113 + 31) % 675;
    ctx.beginPath();
    ctx.arc(x, y, 8 + (i % 4) * 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 65, 55, 1070, 565, 42);
  ctx.fill();
  ctx.fillStyle = '#6d9ab1';
  ctx.font = '700 22px Arial, sans-serif';
  ctx.fillText("KONG'S BATH TIME", 120, 125);
  ctx.fillStyle = '#2b536d';
  ctx.font = '900 58px Arial, sans-serif';
  ctx.fillText('MISSION COMPLETE!', 120, 205);
  ctx.fillStyle = '#6d9ab1';
  ctx.font = '600 27px Arial, sans-serif';
  ctx.fillText('콩이 목욕 대작전 성공!', 122, 252);

  // Vector corgi illustration, intentionally independent of external image assets.
  ctx.save();
  ctx.translate(780, 375);
  ctx.fillStyle = 'rgba(56,107,130,.12)';
  ctx.beginPath(); ctx.ellipse(0, 165, 180, 25, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#bd7b43';
  roundRect(ctx, -145, 12, 290, 148, 75); ctx.fill();
  ctx.fillStyle = '#fff0d6';
  ctx.beginPath(); ctx.ellipse(-5, 89, 95, 64, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#bd7b43';
  ctx.beginPath(); ctx.ellipse(0, -35, 132, 112, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-102, -95); ctx.lineTo(-151, -196); ctx.quadraticCurveTo(-73, -191, -47, -116); ctx.fill();
  ctx.beginPath(); ctx.moveTo(102, -95); ctx.lineTo(151, -196); ctx.quadraticCurveTo(73, -191, 47, -116); ctx.fill();
  ctx.fillStyle = '#e99b68';
  ctx.beginPath(); ctx.moveTo(-108, -113); ctx.lineTo(-137, -174); ctx.quadraticCurveTo(-84, -163, -65, -113); ctx.fill();
  ctx.beginPath(); ctx.moveTo(108, -113); ctx.lineTo(137, -174); ctx.quadraticCurveTo(84, -163, 65, -113); ctx.fill();
  ctx.fillStyle = '#fff0d6';
  ctx.beginPath(); ctx.ellipse(0, -2, 83, 58, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2b3034';
  ctx.beginPath(); ctx.arc(-48, -45, 9, 0, Math.PI * 2); ctx.arc(48, -45, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6a4230';
  ctx.beginPath(); ctx.ellipse(0, -9, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#6a4230'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 1); ctx.quadraticCurveTo(-8, 17, -20, 11); ctx.moveTo(0, 1); ctx.quadraticCurveTo(8, 17, 20, 11); ctx.stroke();
  ctx.fillStyle = '#e88991';
  ctx.beginPath(); ctx.ellipse(0, 28, 13, 18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff0d6';
  roundRect(ctx, -116, 111, 65, 66, 28); ctx.fill();
  roundRect(ctx, 51, 111, 65, 66, 28); ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#2d6985';
  ctx.font = '800 23px Arial, sans-serif';
  ctx.fillText('CLEAR TIME', 120, 360);
  ctx.fillStyle = '#237ca6';
  ctx.font = '900 72px monospace';
  ctx.fillText(formatTime(timeMs), 120, 445);
  ctx.fillStyle = '#6d9ab1';
  ctx.font = '600 22px Arial, sans-serif';
  ctx.fillText(nickname ? `PLAYER  ${nickname}` : 'PLAYER  KONG LOVER', 122, 495);
  ctx.fillStyle = '#f1b94d';
  roundRect(ctx, 120, 525, rank ? 260 : 330, 54, 27); ctx.fill();
  ctx.fillStyle = '#5a451f';
  ctx.font = '800 22px Arial, sans-serif';
  ctx.fillText(rank ? `LOCAL RANK  #${rank}` : 'BATH TIME CHAMPION', 145, 560);
  ctx.fillStyle = '#8aa9b9';
  ctx.font = '500 17px Arial, sans-serif';
  ctx.fillText('Wash fast, stay fluffy. 🐾', 820, 570);

  const imageUrl = canvas.toDataURL('image/png');
  const anchor = document.createElement('a');
  anchor.href = imageUrl;
  anchor.download = `kongs-bath-time-${formatTime(timeMs).replaceAll(':', '-').replace('.', '-')}.png`;
  anchor.click();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function ResultScreen({ timeMs, onRestart }: { timeMs: number; onRestart: () => void }) {
  const [consent, setConsent] = useState<boolean | null>(null);
  const [nickname, setNickname] = useState('');
  const [rank, setRank] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => readLeaderboard());

  const register = () => {
    const cleanName = nickname.trim().slice(0, 12) || '콩이 집사';
    const entry: LeaderboardEntry = { id: makeId(), nickname: cleanName, timeMs, createdAt: new Date().toISOString() };
    const updated = [...leaderboard, entry].sort((a, b) => a.timeMs - b.timeMs || a.createdAt.localeCompare(b.createdAt));
    const place = updated.findIndex((item) => item.id === entry.id) + 1;
    const ok = saveLeaderboard(updated);
    if (ok) {
      setLeaderboard(updated.slice(0, 100));
      setRank(place);
    }
    setSaved(ok);
    setSaveError(!ok);
    setConsent(true);
  };

  const share = () => {
    const rankText = rank ? `로컬 랭킹 ${rank}위` : '로컬 랭킹 도전 중';
    const text = `🐶 KONG'S BATH TIME 클리어!\n기록 ${formatTime(timeMs)} · ${rankText}\n콩이 목욕 대작전 성공! 나보다 빠르게 씻길 수 있을까? #KongsBathTime`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const currentRankEntry = rank ? leaderboard[rank - 1] : null;

  return (
    <main className="result-screen">
      <div className="result-card">
        <div className="result-topline"><span>🐾 KONG'S BATH TIME</span><span className="result-complete">MISSION COMPLETE</span></div>
        <div className="result-main">
          <section className="result-copy">
            <p className="result-eyebrow">ALL CLEAN, ALL FLUFFY!</p>
            <h1>목욕 완료<span>!</span></h1>
            <p className="result-description">콩이가 드디어 보송보송해졌어요.<br />매니저님 오시기 전에 임무 성공!</p>
            <div className="result-time-box"><small>YOUR CLEAR TIME</small><strong>{formatTime(timeMs)}</strong></div>
            {rank && <div className="rank-chip">🏆 LOCAL RANK <strong>#{rank}</strong></div>}
          </section>
          <ResultDogArt />
        </div>
        <div className="result-divider" />
        <section className="ranking-section">
          <div className="ranking-head"><div><p>HALL OF FLUFF</p><h2>로컬 랭킹</h2></div><span>이 브라우저에 기록돼요</span></div>
          {consent === null ? (
            <div className="consent-box">
              <div><strong>이번 기록을 랭킹에 등록할까요?</strong><small>닉네임과 클리어 시간이 이 기기에 저장됩니다.</small></div>
              <div className="consent-actions"><button className="primary-button" onClick={() => setConsent(true)}>등록할래요</button><button className="text-button" onClick={() => setConsent(false)}>괜찮아요</button></div>
            </div>
          ) : consent && !saved && !saveError ? (
            <div className="nickname-form">
              <label htmlFor="nickname">랭킹에 표시할 닉네임</label>
              <div><input id="nickname" value={nickname} maxLength={12} onChange={(event) => setNickname(event.target.value)} placeholder="예: 콩이 집사" onKeyDown={(event) => { if (event.key === 'Enter') register(); }} /><button className="primary-button" onClick={register}>기록 등록</button></div>
              <small>최대 12자 · 입력하지 않으면 ‘콩이 집사’로 등록돼요.</small>
            </div>
          ) : consent && saved ? (
            <div className="saved-message"><span>🎉</span><div><strong>{currentRankEntry?.nickname ?? nickname}님, {rank}위로 등록 완료!</strong><small>다음에는 더 빠른 기록에 도전해 보세요.</small></div></div>
          ) : consent && saveError ? (
            <div className="saved-message save-warning"><span>⚠️</span><div><strong>브라우저 저장 공간에 기록하지 못했어요.</strong><small>저장 공간 설정을 확인한 뒤 다시 시도해 주세요.</small></div></div>
          ) : (
            <div className="saved-message skipped-message"><span>💙</span><div><strong>이번 기록은 등록하지 않았어요.</strong><small>다음 플레이에서 다시 도전할 수 있어요.</small></div></div>
          )}
          {leaderboard.length > 0 ? (
            <div className="leaderboard-list">
              {leaderboard.slice(0, 5).map((entry, index) => (
                <div className={`leaderboard-row ${currentRankEntry?.id === entry.id ? 'leaderboard-current' : ''}`} key={entry.id}>
                  <span className={`leaderboard-place place-${index + 1}`}>{index + 1}</span>
                  <strong>{entry.nickname}</strong>
                  <time>{formatTime(entry.timeMs)}</time>
                </div>
              ))}
            </div>
          ) : <div className="empty-ranking">아직 등록된 기록이 없어요. 첫 번째 랭커가 되어 보세요!</div>}
        </section>
        <div className="result-actions">
          <button className="share-button" onClick={share}>𝕏 공유하기</button>
          <button className="download-button" onClick={() => drawResultImage(timeMs, rank, nickname.trim())}>↓ 결과 이미지 저장</button>
          <button className="restart-button" onClick={onRestart}>↻ 다시 하기</button>
        </div>
        <p className="result-footnote">LOCAL RANKING · 기록은 현재 브라우저에만 저장됩니다.</p>
      </div>
    </main>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('title');
  const [stage, setStage] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const startAt = useRef<number | null>(null);
  const transitionLock = useRef(false);
  const screenRef = useRef<Screen>(screen);
  const stageRef = useRef(stage);
  screenRef.current = screen;
  stageRef.current = stage;

  useEffect(() => {
    if (screen !== 'game' || startAt.current === null) return;
    const tick = window.setInterval(() => {
      if (startAt.current !== null) setElapsed(Date.now() - startAt.current);
    }, 20);
    return () => window.clearInterval(tick);
  }, [screen]);

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
      case 0: return <HoldingStage onSuccess={completeStage} />;
      case 1: return <TimingStage onSuccess={completeStage} />;
      case 2: return <MashingStage onSuccess={completeStage} />;
      default: return <DryerStage onSuccess={completeStage} />;
    }
  }, [completeStage, stage]);

  if (screen === 'title') return <TitleScreen onStart={() => setScreen('intro')} onRanking={() => setScreen('ranking')} />;
  if (screen === 'intro') return <MessageIntro onChoice={begin} />;
  if (screen === 'ranking') return <RankingScreen onBack={() => setScreen('title')} />;
  if (screen === 'result') return <ResultScreen timeMs={elapsed} onRestart={restart} />;

  const playTips = [
    '강아지 위로 마우스를 올리세요',
    '파란 구간에 바늘이 오면 클릭하세요',
    '강아지 이미지를 빠르게 클릭하세요',
    '누르면 위로, 떼면 아래로 움직입니다',
  ];

  return (
    <main className="game-screen">
      <div className="game-shell">
        <ProgressHeader stage={stage} elapsed={elapsed} />
        <section className={`game-card game-card-minimal ${transitioning ? 'game-card-transition' : ''}`} key={stage}>
          {activeStage}
        </section>
        <div className="game-tip"><span>TIP</span><strong>{playTips[stage]}</strong></div>
      </div>
      {transitioning && <div className="transition-overlay"><span className="transition-paw">🐾</span></div>}
    </main>
  );
}
