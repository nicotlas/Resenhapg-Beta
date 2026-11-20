export function VolumeSlider({ volume, onChange }: { volume: number; onChange: (v: number) => void }) {
  return (
    <label className="rpg-volume">
      <span>Volume: {Math.round(volume * 100)}%</span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={Math.round(volume * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
      />
      <button className="rpg-mainbtn" onClick={() => onChange(volume === 0 ? 0.5 : 0)}>
        {volume === 0 ? "🔊 LIGAR SOM" : "🔇 SEM SOM"}
      </button>
    </label>
  );
}
