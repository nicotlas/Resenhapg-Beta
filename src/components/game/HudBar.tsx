import type { CSSProperties } from "react";
import frameSrc from "@/assets/sprites/hud-frame.png";
import hpFillSrc from "@/assets/sprites/hud-hp-fill.png";
import manaFillSrc from "@/assets/sprites/hud-mana-fill.png";
import { HeroPortrait } from "./MainMenu";

/** Frame art is 1258x396 (source px); slots below are measured in that space. */
const FW = 1258;
const FH = 396;
const box = (x: number, y: number, w: number, h: number) => ({
  left: `${(x / FW) * 100}%`,
  top: `${(y / FH) * 100}%`,
  width: `${(w / FW) * 100}%`,
  height: `${(h / FH) * 100}%`,
});

const PORTRAIT = box(59, 72, 232, 232);
const HP_TRACK = box(436, 100, 726, 59);
const MANA_TRACK = box(434, 208, 686, 52);
const COIN_PLATE = box(398, 310, 240, 62);

const MAX_HP = 100;
const MAX_MANA = 100;

function Bar({
  value,
  max,
  fill,
  slot,
  kind,
}: {
  value: number;
  max: number;
  fill: string;
  slot: CSSProperties;
  kind: "hp" | "mana";
}) {
  const pct = Math.max(0, Math.min(1, value / max)) * 100;
  return (
    <div className={`hud-track hud-${kind}`} style={slot}>
      <div className="hud-fill" style={{ width: `${pct}%`, backgroundImage: `url(${fill})` }} />
      <span className="hud-text">
        {Math.round(value)} / {max}
      </span>
    </div>
  );
}

export function HudBar({ hp, mana, coins, hero }: { hp: number; mana: number; coins: number; hero: number }) {
  return (
    <div className="hud-frame" data-low={hp <= MAX_HP * 0.25}>
      <img src={frameSrc} alt="" className="hud-art" draggable={false} />
      <div className="hud-portrait" style={PORTRAIT}>
        <HeroPortrait hero={hero} className="hud-portrait-img" />
      </div>
      <Bar kind="hp" value={hp} max={MAX_HP} fill={hpFillSrc} slot={HP_TRACK} />
      <Bar kind="mana" value={mana} max={MAX_MANA} fill={manaFillSrc} slot={MANA_TRACK} />
      <div className="hud-coins" style={COIN_PLATE}>
        {coins}
      </div>
      <span className="sr-only">
        Vida {Math.round(hp)} de {MAX_HP}, mana {Math.round(mana)} de {MAX_MANA}, {coins} moedas
      </span>
    </div>
  );
}
