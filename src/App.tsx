import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Pause,
  Play,
  RotateCcw,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { DinoCanvas, DinoCanvasHandle } from './components/DinoCanvas';
import { soundEngine } from './game/sound';
import { Difficulty, GameState, RunRecord, RunSummary } from './game/types';

const BEST_SCORE_KEY = 'dino_jump_best_score_v1';
const RUN_HISTORY_KEY = 'dino_jump_history_v1';

function formatScore(value: number): string {
  return String(Math.max(0, Math.floor(value))).padStart(5, '0');
}

function loadBestScore(): number {
  try {
    const raw = localStorage.getItem(BEST_SCORE_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function loadRunHistory(): RunRecord[] {
  try {
    const raw = localStorage.getItem(RUN_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const canvasControlRef = useRef<DinoCanvasHandle | null>(null);

  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState<number>(loadBestScore);
  const [speedMult, setSpeedMult] = useState(1);
  const [isNight, setIsNight] = useState(false);
  const [milestoneActive, setMilestoneActive] = useState(false);
  const [isMuted, setIsMuted] = useState(() => soundEngine.isMuted());
  const [lastSummary, setLastSummary] = useState<RunSummary | null>(null);
  const [history, setHistory] = useState<RunRecord[]>(loadRunHistory);

  const milestoneTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (milestoneTimeoutRef.current !== null) {
        window.clearTimeout(milestoneTimeoutRef.current);
      }
    };
  }, []);

  const handleScoreUpdate = useCallback(
    (nextScore: number, nextSpeedMult: number, nextNight: boolean, milestoneHit: boolean) => {
      setScore(nextScore);
      setSpeedMult(nextSpeedMult);
      setIsNight(nextNight);

      if (milestoneHit) {
        setMilestoneActive(true);
        if (milestoneTimeoutRef.current !== null) {
          window.clearTimeout(milestoneTimeoutRef.current);
        }
        milestoneTimeoutRef.current = window.setTimeout(() => {
          setMilestoneActive(false);
        }, 650);
      }
    },
    []
  );

  const handleGameOver = useCallback(
    (summary: RunSummary) => {
      setLastSummary(summary);
      setScore(summary.score);

      if (summary.score > bestScore) {
        setBestScore(summary.score);
        try {
          localStorage.setItem(BEST_SCORE_KEY, String(summary.score));
        } catch {
          // Ignore storage errors
        }
      }

      if (summary.score > 0) {
        const entry: RunRecord = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          score: summary.score,
          difficulty,
          durationSec: summary.durationSec,
          timestamp: Date.now(),
        };

        setHistory((prev) => {
          const updated = [entry, ...prev]
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
          try {
            localStorage.setItem(RUN_HISTORY_KEY, JSON.stringify(updated));
          } catch {
            // Ignore storage errors
          }
          return updated;
        });
      }
    },
    [bestScore, difficulty]
  );

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    soundEngine.setMuted(nextMuted);
    setIsMuted(nextMuted);
  };

  const handleClearHistory = () => {
    setHistory([]);
    setBestScore(0);
    try {
      localStorage.removeItem(RUN_HISTORY_KEY);
      localStorage.removeItem(BEST_SCORE_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  const handleDifficultyChange = (next: Difficulty) => {
    if (gameState === 'PLAYING') return;
    setDifficulty(next);
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] text-slate-900 flex flex-col">
      {/* Compact Header */}
      <header className="w-full border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <span className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            다이노 점프
          </span>

          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600">
            <a
              href="#game-stage"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              게임 화면
            </a>
            <a
              href="#controls-guide"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              조작 안내
            </a>
            <a
              href="#records-board"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              최고 기록
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() =>
                gameState === 'PLAYING' || gameState === 'PAUSED'
                  ? canvasControlRef.current?.restartGame()
                  : canvasControlRef.current?.startGame()
              }
              className="px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            >
              {gameState === 'PLAYING' || gameState === 'PAUSED' ? '다시 시작' : '게임 시작'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        {/* Game Stage Frame */}
        <section
          id="game-stage"
          aria-label="공룡 점프 게임 스테이지"
          className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"
        >
          {/* Unobtrusive Top HUD */}
          <div className="px-4 sm:px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/70">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span className="font-medium text-slate-900">
                {difficulty === 'hard' ? '하드 모드' : '일반 모드'}
              </span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span className="font-mono-num text-slate-600">
                속도 {speedMult.toFixed(1)}x
              </span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span className="text-slate-600">{isNight ? '성운 구간' : '심우주 구간'}</span>
            </div>

            <div className="flex items-center gap-4 sm:gap-5">
              <div className="flex items-center gap-4 text-sm sm:text-base">
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="text-xs sm:text-sm">최고</span>
                  <span className="font-mono-num font-semibold text-slate-700">
                    {formatScore(bestScore)}
                  </span>
                </div>
                <span aria-hidden="true" className="text-slate-300">
                  /
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-slate-500">점수</span>
                  <span
                    className={`font-mono-num font-bold transition-transform duration-150 ${
                      milestoneActive
                        ? 'text-teal-700 scale-110'
                        : 'text-slate-900 scale-100'
                    }`}
                  >
                    {formatScore(score)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3 sm:pl-4">
                {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
                  <button
                    type="button"
                    onClick={() => canvasControlRef.current?.togglePause()}
                    aria-label={gameState === 'PAUSED' ? '계속하기' : '일시정지'}
                    className="min-h-[40px] px-3 py-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-teal-700"
                  >
                    {gameState === 'PAUSED' ? (
                      <>
                        <Play className="w-4 h-4" />
                        <span className="hidden sm:inline">계속</span>
                      </>
                    ) : (
                      <>
                        <Pause className="w-4 h-4" />
                        <span className="hidden sm:inline">일시정지</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleToggleMute}
                  aria-label={isMuted ? '소리 켜기' : '소리 끄기'}
                  className="min-h-[40px] px-3 py-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-teal-700"
                >
                  {isMuted ? (
                    <>
                      <VolumeX className="w-4 h-4 text-slate-500" />
                      <span className="hidden sm:inline">음소거</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4 text-teal-700" />
                      <span className="hidden sm:inline">소리 켜짐</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Canvas Container + State Machine Overlays */}
          <div className="relative bg-[#050816]">
            <DinoCanvas
              ref={canvasControlRef}
              gameState={gameState}
              difficulty={difficulty}
              bestScore={bestScore}
              onGameStateChange={setGameState}
              onScoreUpdate={handleScoreUpdate}
              onGameOver={handleGameOver}
            />

            {/* TITLE_MENU Overlay */}
            {gameState === 'TITLE_MENU' && (
              <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 sm:p-6 text-center">
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  공룡 우주 달리기
                </h1>
                <p className="mt-1.5 text-sm sm:text-base text-slate-300 max-w-md">
                  은하수 아래 달 표면을 달리며 장애물과 익룡을 피해 보세요.
                </p>

                <div className="mt-4 flex items-center gap-1 p-1 bg-slate-900/90 border border-slate-700 rounded-lg">
                  <button
                    type="button"
                    onClick={() => handleDifficultyChange('normal')}
                    className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      difficulty === 'normal'
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    일반 모드
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDifficultyChange('hard')}
                    className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      difficulty === 'hard'
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    하드 모드
                  </button>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => canvasControlRef.current?.startGame()}
                    className="min-h-[44px] px-6 py-2.5 text-sm sm:text-base font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
                  >
                    게임 시작
                  </button>
                </div>

                <p className="mt-3 text-xs text-slate-400">
                  스페이스바 또는 화면을 클릭해도 바로 시작합니다
                </p>
              </div>
            )}

            {/* PAUSED Overlay */}
            {gameState === 'PAUSED' && (
              <div className="absolute inset-0 bg-slate-900/55 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center">
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                  일시정지
                </h2>
                <p className="mt-1 text-sm text-slate-200">
                  현재 점수 {formatScore(score)} · 계속 달리려면 아래 버튼을 누르세요
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => canvasControlRef.current?.togglePause()}
                    className="min-h-[44px] px-5 py-2.5 inline-flex items-center gap-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-600 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Play className="w-4 h-4" />
                    계속하기
                  </button>
                  <button
                    type="button"
                    onClick={() => canvasControlRef.current?.returnToMenu()}
                    className="min-h-[44px] px-5 py-2.5 text-sm font-medium text-slate-100 bg-slate-800/90 hover:bg-slate-700 border border-slate-600 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    처음으로
                  </button>
                </div>
              </div>
            )}

            {/* GAME_OVER Overlay */}
            {gameState === 'GAME_OVER' && (
              <div className="absolute inset-0 bg-slate-950/82 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 sm:p-6 text-center">
                {lastSummary?.isNewBest && (
                  <p className="text-xs sm:text-sm font-bold text-teal-400 mb-1">
                    최고 기록 달성
                  </p>
                )}
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
                  게임 종료
                </h2>

                <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-slate-300">
                  <span>
                    최종 점수{' '}
                    <strong className="font-mono-num text-white">
                      {formatScore(lastSummary?.score ?? score)}
                    </strong>
                  </span>
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span>
                    점프{' '}
                    <strong className="font-mono-num text-white">
                      {lastSummary?.jumps ?? 0}회
                    </strong>
                  </span>
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span>
                    최고 속도{' '}
                    <strong className="font-mono-num text-white">
                      {(lastSummary?.maxSpeedMultiplier ?? 1).toFixed(1)}x
                    </strong>
                  </span>
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span>
                    생존 시간{' '}
                    <strong className="font-mono-num text-white">
                      {lastSummary?.durationSec ?? 0}초
                    </strong>
                  </span>
                </div>

                <div className="mt-5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => canvasControlRef.current?.restartGame()}
                    className="min-h-[44px] px-6 py-2.5 inline-flex items-center gap-2 text-sm sm:text-base font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
                  >
                    <RotateCcw className="w-4 h-4" />
                    다시 시작
                  </button>
                  <button
                    type="button"
                    onClick={() => canvasControlRef.current?.returnToMenu()}
                    className="min-h-[44px] px-4 py-2.5 text-sm font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    난이도 변경
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Touch & Mouse Action Controls Bar */}
          <div className="px-4 sm:px-6 py-3.5 border-t border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-1 sm:flex-initial">
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  canvasControlRef.current?.triggerJump();
                }}
                onPointerUp={() => canvasControlRef.current?.releaseJump()}
                onPointerLeave={() => canvasControlRef.current?.releaseJump()}
                onPointerCancel={() => canvasControlRef.current?.releaseJump()}
                className="flex-1 sm:flex-initial min-h-[48px] px-5 py-2.5 inline-flex items-center justify-center gap-2 text-sm font-semibold text-slate-900 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-300 rounded-lg transition-colors touch-none select-none whitespace-nowrap cursor-pointer"
              >
                <ArrowUp className="w-4 h-4 text-teal-700" />
                점프 (Space / ↑)
              </button>

              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  canvasControlRef.current?.setDucking(true);
                }}
                onPointerUp={() => canvasControlRef.current?.setDucking(false)}
                onPointerLeave={() => canvasControlRef.current?.setDucking(false)}
                onPointerCancel={() => canvasControlRef.current?.setDucking(false)}
                className="flex-1 sm:flex-initial min-h-[48px] px-5 py-2.5 inline-flex items-center justify-center gap-2 text-sm font-semibold text-slate-900 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-300 rounded-lg transition-colors touch-none select-none whitespace-nowrap cursor-pointer"
              >
                <ArrowDown className="w-4 h-4 text-slate-600" />
                숙이기 (↓)
              </button>
            </div>

            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
              <span>길게 눌러 높은 점프</span>
              <span aria-hidden="true">·</span>
              <span>공중에서 ↓ 입력 시 빠른 착지</span>
            </div>
          </div>
        </section>

        {/* Bottom Info Grid: Controls & Local Leaderboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Controls Guide */}
          <section
            id="controls-guide"
            className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col justify-between"
          >
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">조작 안내</h2>
              <p className="mt-1 text-sm text-slate-500">
                키보드, 마우스 클릭, 모바일 터치를 모두 지원합니다.
              </p>

              <dl className="mt-4 divide-y divide-slate-100 text-sm">
                <div className="py-2.5 flex items-center justify-between gap-4">
                  <dt className="text-slate-600">점프 / 게임 시작</dt>
                  <dd className="font-mono-num font-medium text-slate-900">
                    Space, ↑, W, 화면 터치
                  </dd>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-4">
                  <dt className="text-slate-600">숙이기 / 공중 급강하</dt>
                  <dd className="font-mono-num font-medium text-slate-900">↓, S, 숙이기 버튼</dd>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-4">
                  <dt className="text-slate-600">일시정지</dt>
                  <dd className="font-mono-num font-medium text-slate-900">P, Esc</dd>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-4">
                  <dt className="text-slate-600">심우주 · 성운 테마 전환</dt>
                  <dd className="font-mono-num font-medium text-slate-900">700점 간격 자동 전환</dd>
                </div>
              </dl>
            </div>
          </section>

          {/* Top 5 Local Runs */}
          <section
            id="records-board"
            className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-900">최고 기록</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    이 브라우저에 저장된 상위 5개 기록입니다.
                  </p>
                </div>

                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="min-h-[40px] px-3 py-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    기록 삭제
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="mt-6 py-8 text-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg">
                  아직 기록이 없습니다. 게임을 시작해 첫 기록을 세워보세요.
                </div>
              ) : (
                <ol className="mt-4 divide-y divide-slate-100 text-sm">
                  {history.map((item, idx) => (
                    <li
                      key={item.id}
                      className="py-2.5 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono-num w-5 text-slate-400 font-semibold">
                          {idx + 1}.
                        </span>
                        <span className="font-mono-num font-bold text-slate-900">
                          {formatScore(item.score)}
                        </span>
                        <span className="text-xs text-slate-500 truncate">
                          {item.difficulty === 'hard' ? '하드 모드' : '일반 모드'} ·{' '}
                          {item.durationSec}초
                        </span>
                      </div>
                      <span className="font-mono-num text-xs text-slate-400 shrink-0">
                        {new Date(item.timestamp).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
