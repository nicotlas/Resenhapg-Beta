import { useEffect, useRef, useState } from "react";
import comic from "@/assets/cutscene/opening-comic.jpg.asset.json";
import milosDance from "@/assets/video/milos-dance.mp4.asset.json";

/** Opening comic shown after JOGAR; tapping anywhere starts the game. */
export function OpeningComic({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
        e.preventDefault();
        onDone();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);
  return (
    <button className="cut-root cut-comic" onClick={onDone} aria-label="Toque para começar">
      <img src={comic.url} alt="Abertura: a professora Onilva cheira a pedra e destrói a escola" draggable={false} />
      <span className="cut-hint">TOQUE PARA CONTINUAR ▶</span>
    </button>
  );
}

/** The Milos dance video at the end of his magic-key quest. */
export function MilosVideo({ volume, onDone }: { volume: number; onDone: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.volume = volume;
    v.play().catch(() => setBlocked(true));
    // the volume only changes from the settings, never mid-video restarts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="cut-root cut-video">
      <video ref={ref} src={milosDance.url} playsInline onEnded={onDone} onClick={() => blocked && ref.current?.play().then(() => setBlocked(false))} />
      {blocked && (
        <button className="cut-hint cut-play" onClick={() => ref.current?.play().then(() => setBlocked(false))}>
          ▶ TOQUE PARA ASSISTIR
        </button>
      )}
      <button className="cut-skip" onClick={onDone}>
        PULAR ▶▶
      </button>
    </div>
  );
}
