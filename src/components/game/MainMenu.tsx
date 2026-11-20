import { useEffect, useRef, useState } from "react";
import menuArt from "@/assets/menu-background.jpg";
import vagabundoSrc from "@/assets/sprites/vagabundo-sheet.png";
import bugigangasSrc from "@/assets/sprites/bugigangas-sheet.png";
import yurindioSrc from "@/assets/sprites/yurindio-sheet.png";
import pingucoSrc from "@/assets/sprites/pinguco-sheet.png";
import { FRAMES } from "./spriteFrames";
import { CHARACTER_NAMES } from "./engine";
import { VolumeSlider } from "./VolumeSlider";

const HEROES = [
  { key: "vagabundo", src: vagabundoSrc, role: "Guerreiro" },
  { key: "bugigangas", src: bugigangasSrc, role: "Suporte" },
  { key: "yurindio", src: yurindioSrc, role: "Arqueiro" },
  { key: "pinguco", src: pingucoSrc, role: "Mago" },
];

/** Draws the hero's idle frame from its sprite sheet. */
export function HeroPortrait({ hero, className = "menu-portrait" }: { hero: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const h = HEROES[hero]!;
    const f = FRAMES[h.key]![0]!;
    const c = ref.current;
    if (!c) return;
    c.width = f[2];
    c.height = f[3];
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(img, f[0], f[1], f[2], f[3], 0, 0, f[2], f[3]);
    };
    img.src = h.src;
  }, [hero]);
  return <canvas ref={ref} className={className} aria-hidden />;
}

type Panel = null | "personagens" | "opcoes" | "creditos";

export function MainMenu({
  onPlay,
  onContinue,
  hasSave,
  volume,
  onVolume,
}: {
  onPlay: (hero: number) => void;
  onContinue: () => void;
  hasSave: boolean;
  volume: number;
  onVolume: (v: number) => void;
}) {
  const [hero, setHero] = useState(0);
  const [panel, setPanel] = useState<Panel>(null);
  const n = HEROES.length;
  const prev = () => setHero((h) => (h + n - 1) % n);
  const next = () => setHero((h) => (h + 1) % n);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (panel) {
        if (e.key === "Escape") setPanel(null);
        return;
      }
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Enter") onPlay(hero);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="menu-root" style={{ ["--menu-art" as string]: `url(${menuArt})` }}>
      <div className="menu-frame" data-save={hasSave}>
        <img src={menuArt} alt="RESENHAPG — Uma aventura nada normal" className="menu-art" width={1536} height={1024} />

        <div className="menu-credits-side" aria-hidden>
          CRÉDITOS · NICOTELAS E JVT
        </div>

        <button className="menu-hot menu-arrow-l" aria-label="Personagem anterior" onClick={prev}>
          ◀
        </button>
        <div className="menu-select">
          <HeroPortrait hero={hero} />
          <span className="menu-hero-name">{CHARACTER_NAMES[hero]}</span>
        </div>
        <button className="menu-hot menu-arrow-r" aria-label="Próximo personagem" onClick={next}>
          ▶
        </button>

        <button className="menu-hot menu-btn menu-play" onClick={() => onPlay(hero)}>
          JOGAR
        </button>
        {hasSave && (
          <button className="menu-hot menu-btn menu-continue" onClick={onContinue}>
            CONTINUAR
          </button>
        )}
        <button className="menu-hot menu-btn menu-chars" onClick={() => setPanel("personagens")}>
          PERSONAGENS
        </button>
        <button className="menu-hot menu-btn menu-opts" onClick={() => setPanel("opcoes")}>
          OPÇÕES
        </button>
        <button className="menu-hot menu-btn menu-creds" onClick={() => setPanel("creditos")}>
          CRÉDITOS
        </button>

        {panel && (
          <div className="menu-overlay" onClick={() => setPanel(null)}>
            <div className="rpg-panel" onClick={(e) => e.stopPropagation()}>
              {panel === "personagens" && (
                <>
                  <h2 className="menu-panel-title">PERSONAGENS</h2>
                  <div className="menu-roster">
                    {HEROES.map((h, i) => (
                      <button
                        key={h.key}
                        className="menu-roster-item"
                        data-active={hero === i}
                        onClick={() => {
                          setHero(i);
                          setPanel(null);
                        }}
                      >
                        <HeroPortrait hero={i} />
                        <strong>{CHARACTER_NAMES[i]}</strong>
                        <span>{h.role}</span>
                      </button>
                    ))}
                  </div>
                  <p className="rpg-hint">Toque em um herói para escolher quem comanda o grupo.</p>
                </>
              )}
              {panel === "opcoes" && (
                <>
                  <h2 className="menu-panel-title">OPÇÕES</h2>
                  <VolumeSlider volume={volume} onChange={onVolume} />
                </>
              )}
              {panel === "creditos" && (
                <>
                  <h2 className="menu-panel-title">CRÉDITOS</h2>
                  <p>Criado por NICOTELAS E JVT — somente pois seus amigos são vagabundos.</p>
                </>
              )}
              <button className="rpg-mainbtn" onClick={() => setPanel(null)}>
                VOLTAR
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
