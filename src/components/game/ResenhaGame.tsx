import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import {
  ASSIST_HEROES,
  CHARACTER_NAMES,
  PHASE_NAMES,
  createGame,
  type DialogState,
  type Dir,
  type GameApi,
  type HudState,
} from "./engine";
import { HeroPortrait, MainMenu } from "./MainMenu";
import { HudBar } from "./HudBar";
import { DialogBox } from "./DialogBox";
import { useMusic, useVolume } from "./useMusic";
import { MilosVideo, OpeningComic } from "./Cutscenes";
import { VolumeSlider } from "./VolumeSlider";
import { loadSave, writeSave, type SaveData } from "./quests";
const DIRS: { d: Dir; label: string; cls: string }[] = [
  { d: "up", label: "▲", cls: "rpg-dir-up" },
  { d: "down", label: "▼", cls: "rpg-dir-down" },
  { d: "left", label: "◀", cls: "rpg-dir-left" },
  { d: "right", label: "▶", cls: "rpg-dir-right" },
];

export function ResenhaGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const apiRef = useRef<GameApi | null>(null);
  const [hud, setHud] = useState<HudState>({ hp: 100, mana: 100, coins: 12, active: 0, assist: [0, 0, 0, 0], inv: [0, 0], phase: 1, boost: 0, inside: false, disc: false, rpg: "hidden", key: "none" });
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [invOpen, setInvOpen] = useState(false);
  const [optsOpen, setOptsOpen] = useState(false);
  const [comicHero, setComicHero] = useState<number | null>(null);
  const [video, setVideo] = useState<"milos" | null>(null);
  const [save, setSave] = useState<SaveData | null>(null);
  const [volume, setVolume] = useVolume();

  // the menu offers CONTINUAR only when this browser has a save
  useEffect(() => setSave(loadSave()), []);

  // Menu: Windmill Hut · Fase 1 forest: Kokiri Forest · inside the Cabaré only:
  // "Já que me ensinou a beber" · Fase 2 mine: its own theme.
  // the music stops while the Milos dance video plays
  useMusic(
  video
    ? null
    : !started
      ? "/audio/menuTheme.mp3"
      : hud.inside
        ? "/audio/cabareTheme.mp3"
        : hud.phase === 2
          ? "/audio/mineTheme.mp3"
          : "/audio/forestTheme.mp3",
  volume,
);

  useEffect(() => {
    if (!canvasRef.current) return;
    const api = createGame(canvasRef.current, {
      onHud: setHud,
      onMessage: setMsg,
      onDialog: setDialog,
      onVideo: setVideo,
    });
    apiRef.current = api;
    return () => api.destroy();
  }, []);

  // autosave every few seconds while playing, and when the page is hidden or closed
  useEffect(() => {
    if (!started) return;
    const store = () => apiRef.current && writeSave(apiRef.current.snapshot());
    const id = window.setInterval(store, 4000);
    const onHide = () => document.visibilityState === "hidden" && store();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", store);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", store);
    };
  }, [started]);

  const begin = (hero: number, from: SaveData | null) => {
    setStarted(true);
    // "?fase=2" in the address jumps straight to the mine (handy for testing)
    const fase = Number(new URLSearchParams(window.location.search).get("fase")) || 1;
    apiRef.current?.start(hero, fase, from);
    if (apiRef.current) writeSave(apiRef.current.snapshot());
  };
  const comicRef = useRef<number | null>(null);
  comicRef.current = comicHero;
  const track = !started
  ? "/audio/menuTheme.mp3"
  : hud.inside
    ? "/audio/cabareTheme.mp3"
    : hud.phase === 2
      ? "/audio/mineTheme.mp3"
      : "/audio/forestTheme.mp3";

  const endComic = useCallback(() => {
    const h = comicRef.current;
    if (h === null) return;
    comicRef.current = null;
    setComicHero(null);
    begin(h, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const endVideo = useCallback(() => {
    setVideo(null);
    apiRef.current?.finishVideo();
  }, []);

  const press = (d: Dir) => ({
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // synthetic events may lack an active pointer
      }
      apiRef.current?.setTouch(d, true);
    },
    onPointerUp: () => apiRef.current?.setTouch(d, false),
    onPointerCancel: () => apiRef.current?.setTouch(d, false),
    onLostPointerCapture: () => apiRef.current?.setTouch(d, false),
  });

  return (
    <div className="rpg-root">
      <div className="rpg-stage">
        <canvas ref={canvasRef} className="rpg-canvas" />

        <div className="rpg-hud">
          <HudBar hp={hud.hp} mana={hud.mana} coins={hud.coins} hero={hud.active} />
          <span className="rpg-pill rpg-pill-phase">
            FASE {hud.phase} — {PHASE_NAMES[hud.phase]}
          </span>
          {hud.boost > 0 && <span className="rpg-pill rpg-pill-boost">⚔ DANO x1.5 · {hud.boost}s</span>}
        </div>

        <button className="rpg-opts-btn" aria-label="Opções e volume" onClick={() => setOptsOpen(true)}>
          {volume === 0 ? "🔇" : "🔊"}
        </button>

        <div className="rpg-help">
          WASD/setas: mover · Espaço: ataque · Q: especial · E: falar · 1-4: pedir ajuda
        </div>

        {msg && <div className="rpg-msg">{msg}</div>}

        {dialog && (
          <DialogBox
            dialog={dialog}
            onAdvance={() => apiRef.current?.advance()}
            onChoose={(i) => apiRef.current?.choose(i)}
          />
        )}

        <div className="rpg-pad">
          {DIRS.map(({ d, label, cls }) => (
            <button key={d} className={`rpg-ctrl ${cls}`} aria-label={d} {...press(d)}>
              {label}
            </button>
          ))}
        </div>

        <div className="rpg-assist">
          {ASSIST_HEROES.map((h, i) => {
            // the hero you are playing as can't call himself for help
            if (h === hud.active) return null;
            const cd = hud.assist[i] ?? 0;
            return (
              <button
                key={h}
                className="rpg-assist-btn"
                data-ready={cd <= 0}
                aria-label={`Pedir ajuda a ${CHARACTER_NAMES[h]}`}
                onClick={() => apiRef.current?.assist(h)}
              >
                <HeroPortrait hero={h} className="rpg-assist-img" />
                <span className="rpg-assist-cd" style={{ height: `${cd * 100}%` }} />
                <span className="rpg-assist-label">{h === 0 ? "ESPADA" : h === 1 ? "SOCO" : h === 2 ? "FLECHA" : "POÇÃO"}</span>
              </button>
            );
          })}
        </div>

        <div className="rpg-actions">
          <button className="rpg-act" onClick={() => apiRef.current?.attack()}>
            ATAQUE
          </button>
          <button className="rpg-act" onClick={() => apiRef.current?.special()}>
            ESPECIAL
          </button>
          <button className="rpg-act" onClick={() => apiRef.current?.interact()}>
            FALAR
          </button>
          <button className="rpg-act" onClick={() => setInvOpen((o) => !o)}>
            ITENS
          </button>
        </div>

        {invOpen && (
          <div className="menu-overlay" onClick={() => setInvOpen(false)}>
            <div className="rpg-panel" onClick={(e) => e.stopPropagation()}>
              <h2 className="menu-panel-title">INVENTÁRIO</h2>
              <p>Moedas: {hud.coins}</p>
              {[
                ["Poção de vida", "+40 vida, +20 mana"],
                ["Poção de dano", "golpes 1.5x por 30s"],
              ].map(([name, desc], i) => (
                <button
                  key={name}
                  className="rpg-mainbtn"
                  disabled={hud.inv[i]! <= 0}
                  onClick={() => apiRef.current?.useItem(i)}
                >
                  {name} x{hud.inv[i]} — {desc}
                </button>
              ))}
              {hud.disc && (
                <>
                  <p>💿 Disco de Phunk x∞ — da Michele</p>
                  <p className="rpg-hint">Missão: entregar um disco em cada fase nova.</p>
                </>
              )}
              {hud.rpg === "carried" && (
                <>
                  <p>📕 Livro de RPG — do David</p>
                  <p className="rpg-hint">Leve para o David, numa mesa do Cabaré: 50 moedas.</p>
                </>
              )}
              {hud.key === "carried" && (
                <>
                  <p>🗝️ Chave mágica — do Ricardo Milos</p>
                  <p className="rpg-hint">Entregue ao Nelson Selvagem, no norte da Trilha Verde.</p>
                </>
              )}
              {hud.key === "hidden" && <p className="rpg-hint">Missão: achar a chave mágica na Trilha Verde.</p>}
              {hud.inv[0] + hud.inv[1] === 0 && !hud.disc && hud.rpg !== "carried" && hud.key !== "carried" && (
                <p className="rpg-hint">Vazio. Compre poções no Cabaré da Cleyde.</p>
              )}
              <button className="rpg-mainbtn" onClick={() => setInvOpen(false)}>
                FECHAR
              </button>
            </div>
          </div>
        )}

        {optsOpen && (
          <div className="menu-overlay" onClick={() => setOptsOpen(false)}>
            <div className="rpg-panel" onClick={(e) => e.stopPropagation()}>
              <h2 className="menu-panel-title">OPÇÕES</h2>
              <VolumeSlider volume={volume} onChange={setVolume} />
              <p className="rpg-hint">O jogo salva sozinho. No menu, CONTINUAR volta de onde parou.</p>
              <button className="rpg-mainbtn" onClick={() => setOptsOpen(false)}>
                FECHAR
              </button>
            </div>
          </div>
        )}

        {!started && comicHero === null && (
          <MainMenu
            hasSave={!!save}
            volume={volume}
            onVolume={setVolume}
            onPlay={(hero) => setComicHero(hero)}
            onContinue={() => save && begin(save.hero, save)}
          />
        )}

        {comicHero !== null && <OpeningComic onDone={endComic} />}
        {video && <MilosVideo volume={volume} onDone={endVideo} />}
      </div>
    </div>
  );
}

