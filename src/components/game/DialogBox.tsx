import boxSrc from "@/assets/sprites/dialog/dialog-box.png";
import cleydeSrc from "@/assets/sprites/dialog/dlg-cleyde.png";
import cleydeFelizSrc from "@/assets/sprites/dialog/dlg-cleyde-feliz.png";
import vagabundoSrc from "@/assets/sprites/dialog/dlg-vagabundo.png";
import bugigangasSrc from "@/assets/sprites/dialog/dlg-bugigangas.png";
import yurindioSrc from "@/assets/sprites/dialog/dlg-yurindio.png";
import pingucoSrc from "@/assets/sprites/dialog/dlg-pinguco.png";
import micheleSrc from "@/assets/sprites/dialog/dlg-michele.png";
import davidSrc from "@/assets/sprites/dialog/dlg-david.png";
import ricardoSrc from "@/assets/sprites/dialog/dlg-ricardo.png";
import paiSrc from "@/assets/sprites/dialog/dlg-pai.png";
import nelsonSrc from "@/assets/sprites/dialog/dlg-nelson.png";
import cleydeAnim1 from "@/assets/sprites/dialog/dlg-cleyde-anim1.png";
import cleydeAnim2 from "@/assets/sprites/dialog/dlg-cleyde-anim2.png";
import { useEffect, useState } from "react";
import type { DialogState, Speaker } from "./engine";

const PORTRAITS: Record<string, string> = {
  cleyde: cleydeSrc,
  cleydeFeliz: cleydeFelizSrc,
  cleydeAponta: cleydeAnim2,
  michele: micheleSrc,
  david: davidSrc,
  ricardo: ricardoSrc,
  pai: paiSrc,
  nelson: nelsonSrc,
  0: vagabundoSrc,
  1: bugigangasSrc,
  2: yurindioSrc,
  3: pingucoSrc,
};
const portraitOf = (w: Speaker) => PORTRAITS[String(w)]!;

/** Cleyde's welcome / goodbye lines swap between her two counter poses. */
const CLEYDE_ANIM = [cleydeAnim1, cleydeAnim2];
function usePortrait(who: Speaker) {
  const animated = who === "cleydeFeliz";
  const [f, setF] = useState(0);
  useEffect(() => {
    if (!animated) return;
    setF(0);
    const id = window.setInterval(() => setF((x) => (x + 1) % CLEYDE_ANIM.length), 450);
    return () => window.clearInterval(id);
  }, [animated]);
  return animated ? CLEYDE_ANIM[f]! : portraitOf(who);
}

/** The user's dialogue box art: portrait on the left, name in the tab, line in the paper. */
export function DialogBox({
  dialog,
  onAdvance,
  onChoose,
}: {
  dialog: DialogState;
  onAdvance: () => void;
  onChoose: (i: number) => void;
}) {
  const portrait = usePortrait(dialog.who);
  return (
    <div
      className="dlg-root"
      data-modal={dialog.modal}
      role="dialog"
      aria-label={dialog.name}
      onPointerDown={(e) => {
        if (!dialog.choices) {
          e.preventDefault();
          onAdvance();
        }
      }}
    >
      <img className="dlg-portrait" src={portrait} alt={dialog.name} draggable={false} />
      <div className="dlg-box">
        <img className="dlg-art" src={boxSrc} alt="" draggable={false} />
        <span className="dlg-name">{dialog.name}</span>
        <div className="dlg-body">
          <p className="dlg-text">{dialog.text}</p>
          {dialog.choices ? (
            <div className="dlg-choices">
              {dialog.choices.map((c, i) => (
                <button
                  key={c}
                  className="dlg-choice"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onChoose(i);
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          ) : (
            dialog.modal && <span className="dlg-next">▼</span>
          )}
        </div>
      </div>
    </div>
  );
}
