// RESENHAPG — game engine (canvas). Runs only in the browser (called from useEffect).
import vagabundoSrc from "@/assets/sprites/vagabundo-sheet.png";
import bugigangasSrc from "@/assets/sprites/bugigangas-sheet.png";
import yurindioSrc from "@/assets/sprites/yurindio-sheet.png";
import pingucoSrc from "@/assets/sprites/pinguco-sheet.png";
import zombieSrc from "@/assets/sprites/zombie-sheet.png";
import spiderSrc from "@/assets/sprites/spider-sheet.png";
import skeletonSrc from "@/assets/sprites/skeleton-sheet.png";
import propsSrc from "@/assets/sprites/props-sheet.png";
import grassSrc from "@/assets/sprites/grass-tile.png";
import dirtSrc from "@/assets/sprites/dirt-tile.png";
import cleydeSrc from "@/assets/sprites/cleyde.png";
import cabareSrc from "@/assets/sprites/cabare.png";
import cabareInSrc from "@/assets/sprites/cabare-interior.png";
import micheleSrc from "@/assets/sprites/michele.png";
import davidSrc from "@/assets/sprites/david.png";
import rpgBookSrc from "@/assets/sprites/rpg-book.png";
import nelsonSrc from "@/assets/sprites/nelson-sheet.png";
import ricardoSrc from "@/assets/sprites/ricardo.png";
import paiSrc from "@/assets/sprites/pai.png";
import { milosGivesQuest, type KeyState, type SaveData } from "./quests";
import { NELSON_ANIM, NELSON_FRAMES } from "./nelsonFrames";
import { FRAMES, MONSTER_FRAMES } from "./spriteFrames";
import { PROP_FRAMES, type PropName } from "./propFrames";

// Environment props from the user's texture sheet. Props are anchored at their base (x, y).
interface Prop {
  name: PropName;
  x: number;
  y: number;
  s: number;
  flip: boolean;
  tree: boolean;
}
// Collision ellipses (feet-level) for solid props and ponds.
interface Solid {
  x: number;
  y: number;
  rx: number;
  ry: number;
}
// Dirt trail control points (two cubic bezier segments).
const TRAIL = [
  [0, 350], [450, 300], [600, 700], [1100, 610],
  [1400, 550], [1450, 380], [1800, 430],
] as const;
// Fase 2 (Mina Sombria): mine-cart track from the entrance to the boss arena.
const MINE_TRAIL = [
  [0, 600], [400, 520], [600, 820], [1000, 700],
  [1200, 620], [1350, 480], [1650, 600],
] as const;
const TRAIL_HALF = 37;
const ARENA = { x: 1580, y: 600, r: 250 };
export const PHASE_NAMES = ["", "TRILHA VERDE", "MINA SOMBRIA"];
// Phase 2 monsters hit harder, move faster and take more hits.
const PHASE_MULT = { 1: { hp: 35, dmg: 1, speed: 1, reward: 2 }, 2: { hp: 58, dmg: 1.6, speed: 1.15, reward: 3 } } as const;
const DAVID_REWARD = 50;
const BOSS = { hp: 420, dmg: 10, rate: 1.8, speed: 50, reach: 58, aggro: 300, scale: 1.5, reward: 30 };
const TREES: PropName[] = [
  "tree_big", "tree_big", "tree_dark", "tree_dark", "tree_round", "tree_lime", "tree_med",
  "tree_tall", "pine", "pine", "tree_s2", "tree_s3", "tree_small", "tree_pink", "tree_orange",
];
const SMALL_TREES = new Set<PropName>(["tree_s2", "tree_s3", "tree_small"]);
const BUSHES: PropName[] = ["bush1", "bush2", "bush3", "bush4", "tree_bush", "sapling"];
const ROCKS: PropName[] = ["rock1", "rock2"];
const LOGS: PropName[] = ["stump", "log"];
const FLOWERS: PropName[] = [
  "fl1", "fl2", "fl3", "fl4", "fl5", "fl6", "fl7", "fl8", "fl9", "fl10",
  "fs1", "fs2", "fs3", "fs4", "fs5", "fs6", "fs7", "fs8", "mush1", "mush2", "mush3", "mush4",
];
const GRASSES: PropName[] = ["gs1", "gs2", "gs3", "gs4", "gs5", "tuft1", "tuft2", "tuft_big", "fern"];
const STICKS: PropName[] = ["stick1", "stick2", "stick3", "stick4"];

// Monster sheet frame groups (see MONSTER_FRAMES). Right-facing frames are mirrored for left.
const MONSTER_ANIM = {
  down: [0, 1, 2],
  up: [3, 4, 5],
  side: [9, 10, 11],
  attack: [12, 13, 14],
  death: [15, 16, 17],
};
const MONSTER_SCALE = 0.72;
// Per-monster behaviour: speed while chasing, damage per hit, seconds between hits.
const MONSTER_STATS = {
  zombie: { speed: 42, dmg: 4, rate: 1.7 },
  skeleton: { speed: 58, dmg: 3, rate: 1.4 },
  spider: { speed: 78, dmg: 2, rate: 1.1 },
} as const;
const AGGRO_RANGE = 190;
const MELEE_RANGE = 34;
const MONSTER_ATTACK_TIME = 0.42;
const DEATH_TIME = 0.6;
const CORPSE_FADE = 0.6;
// Boss "Nelson Selvagem": drawn from his own sheet; his death plays slower and the body lingers.
const BOSS_NAME = "Nelson Selvagem";
const NELSON_SCALE = 1.0;
const BOSS_DEATH_TIME = 1.2;
const BOSS_CORPSE_TIME = BOSS_DEATH_TIME + 1.5 + CORPSE_FADE;

const SHEET_KEYS = ["vagabundo", "bugigangas", "yurindio", "pinguco"] as const;

// Which sheet frames each character uses per state (indices into FRAMES[key]).
// Side frames face right in the sheet; they are mirrored when walking left.
const ANIMS: Record<
  (typeof SHEET_KEYS)[number],
  { down: number[]; side: number[]; up: number[]; attack: number[]; special: number[] }
> = {
  vagabundo: { down: [0], side: [3, 4], up: [2], attack: [6, 7, 8], special: [9, 10, 11] },
  bugigangas: { down: [0, 1], side: [3, 4], up: [2, 5], attack: [6, 7, 8], special: [9, 10, 11] },
  yurindio: { down: [0, 1, 2], side: [3, 4, 5], up: [4, 5], attack: [6, 7, 8], special: [9, 10] },
  pinguco: { down: [0, 1, 2], side: [3, 4, 5], up: [4, 5], attack: [6, 7, 8], special: [9, 10, 11] },
};
const ACTION_TIME = { attack: 0.36, special: 0.55 };

// Ranged support shots: Yurindio (2) and Pin_guço (3) can fire from where they stand,
// even when they are not the hero being controlled.
export const ASSIST_HEROES = [0, 1, 2, 3] as const;
// Delay between the leader's normal attacks (seconds).
export const ATTACK_DELAY = 0.7;
const MELEE_ASSIST = {
  0: { range: 140, dmg: 20, cd: 2.5, name: "Vagabundo do Mar" },
  1: { range: 140, dmg: 17, cd: 2.2, name: "Dr. Bugigangas" },
} as const;
const ASSIST = {
  2: { range: 320, dmg: 14, cd: 1.2, speed: 520, kind: "arrow", name: "Yurindio" },
  3: { range: 280, dmg: 16, cd: 1.8, speed: 380, kind: "potion", name: "Pin_guço" },
} as const;
// Follower formation radius around the leader (wider = heroes stand further apart).
const FOLLOW_RX = 96;
const FOLLOW_RY = 70;

export const CHARACTER_NAMES = ["Vagabundo do Mar", "Dr. Bugigangas", "Yurindio", "Pin_guço"];
export const CHARACTER_SHORT = ["MAR", "DR", "YURI", "PIN"];

export type Dir = "up" | "down" | "left" | "right";

export interface HudState {
  hp: number;
  mana: number;
  coins: number;
  active: number;
  /** Cooldown left (0 = ready, 1 = just fired) for each ASSIST_HEROES entry. */
  assist: number[];
  /** Potions carried: [vida, dano]. */
  inv: [number, number];
  phase: number;
  /** Seconds left on Dona Cleyde's damage potion (0 = none). */
  boost: number;
  /** True while the party is inside the Cabaré da Cleyde. */
  inside: boolean;
  /** Michele's endless phunk disc: true once she has handed it over. */
  disc: boolean;
  /** David's lost RPG book: "hidden" in the forest, "carried" by the party, "delivered" to him. */
  rpg: RpgState;
  /** Ricardo Milos' magic key: "none" (no quest), "hidden" in the forest, "carried" to Nelson. */
  key: KeyState;
}
export type { KeyState, SaveData };
export type RpgState = "hidden" | "carried" | "delivered";

/** Who is talking in a dialogue box: a hero index, Dona Cleyde or Michele. */
export type Speaker = 0 | 1 | 2 | 3 | "cleyde" | "cleydeFeliz" | "cleydeAponta" | "michele" | "david" | "ricardo" | "pai" | "nelson";
export interface DialogState {
  who: Speaker;
  name: string;
  text: string;
  /** Options to pick from; the game waits while they are on screen. */
  choices?: string[] | undefined;
  /** Modal lines pause the game until the player taps / presses E. */
  modal: boolean;
}

export interface GameApi {
  /** Begins play with the hero picked in the menu (index into CHARACTER_NAMES). */
  start: (hero?: number, phase?: number, save?: SaveData | null) => void;
  /** Current progress, for the autosave. */
  snapshot: () => SaveData;
  /** Called when the Milos dance video ends (or is skipped). */
  finishVideo: () => void;
  attack: () => void;
  special: () => void;
  interact: () => void;
  /** Ranged shot from Yurindio (2) or Pin_guço (3), whoever is being controlled. */
  assist: (hero: number) => void;
  /** Drink a potion from the inventory: 0 = vida, 1 = dano. */
  useItem: (i: number) => void;
  /** Skip / close the current dialogue line. */
  advance: () => void;
  /** Pick option i of the current dialogue. */
  choose: (i: number) => void;
  setTouch: (d: Dir, v: boolean) => void;
  destroy: () => void;
}

interface Callbacks {
  onHud: (s: HudState) => void;
  onMessage: (text: string | null) => void;
  onDialog: (d: DialogState | null) => void;
  /** Plays a full-screen video; the game stays paused until finishVideo(). */
  onVideo: (kind: "milos") => void;
}

// Damage potion from Dona Cleyde: every hero hit is stronger for a while.
const BOOST_MULT = 1.5;
const BOOST_TIME = 30;
const SHOP_PRICE = 5;
// What the leader shouts when asking a support hero to shoot.
const HELP_LINE: Record<number, string> = {
  0: "Vagabundo, vem pro pau aqui!",
  1: "Doutor, me ajuda aqui!",
  2: "Yuri me ajuda aqui!",
  3: "Rayan me ajuda aqui!",
};

const W = 960;
const H = 640;
const world = { w: 1800, h: 1200 };
const SPRITE_SCALE = 0.52;

type EnemyType = "skeleton" | "zombie" | "spider";
const ENEMY_LABEL: Record<EnemyType, string> = {
  skeleton: "esqueleto",
  zombie: "zumbi",
  spider: "aranha",
};

interface Enemy {
  x: number;
  y: number;
  type: EnemyType;
  label: string;
  hp: number;
  max: number;
  alive: boolean;
  hit: number;
  dir: number;
  anim: number;
  moving: boolean;
  homeX: number;
  homeY: number;
  wanderT: number;
  wx: number;
  wy: number;
  atkCd: number;
  atkT: number;
  deathT: number;
  inMelee: boolean;
  speed: number;
  dmg: number;
  rate: number;
  reach: number;
  aggro: number;
  scale: number;
  reward: number;
  boss: boolean;
  minion: boolean;
  summonT: number;
  awake: boolean;
}

export function createGame(canvas: HTMLCanvasElement, cb: Callbacks): GameApi {
  const ctx = canvas.getContext("2d")!;
  canvas.width = W;
  canvas.height = H;
  ctx.imageSmoothingEnabled = false;

  const sprites = [vagabundoSrc, bugigangasSrc, yurindioSrc, pingucoSrc].map((src) => {
    const i = new Image();
    i.src = src;
    return i;
  });

  let started = false;
  let active = 0;
  let hp = 100;
  let mana = 100;
  let coins = 12;
  let last = 0;
  let toastTimer = 0;
  let raf = 0;
  let hudTimer = 0;
  let boostT = 0;
  // dialogue box state; `after` runs when a modal line is closed
  let dialog: (DialogState & { t: number; after?: (() => void) | undefined; pick?: ((i: number) => void) | undefined }) | null = null;
  let metCleyde = false;

  const keys: Record<string, boolean> = {};
  const touch: Record<Dir, boolean> = { up: false, down: false, left: false, right: false };
  const party = CHARACTER_NAMES.map((_, i) => ({
    x: 280 - i * 44,
    y: 290 + i * 34,
    dir: 2,
    cd: 0,
    anim: 0,
    moving: false,
    action: null as null | { kind: "attack" | "special"; t: number },
  }));

  const rng = (a: number, b: number) => Math.random() * (b - a) + a;
  let phase = 1;
  const cleyde = { x: 430, y: 770 };
  const cleydeImg = Object.assign(new Image(), { src: cleydeSrc });
  const cabareImg = Object.assign(new Image(), { src: cabareSrc });
  // Cabaré da Cleide (fase 1): the building sits behind Cleyde's spot, door facing the trail
  const CABARE_SCALE = 0.9;
  const cabare = { x: cleyde.x + 40, base: cleyde.y - 20 };

  // ---------- inside the Cabaré: a single fixed screen drawn from the user's picture ----------
  // Room coordinates below are pixels of the 375x369 interior picture; rX/rY map them to the canvas.
  const cabareInImg = Object.assign(new Image(), { src: cabareInSrc });
  const ROOM_S = H / 369;
  const ROOM_OX = Math.round((W - 375 * ROOM_S) / 2);
  const ROOM_CHAR = 0.85;
  const rX = (x: number) => ROOM_OX + x * ROOM_S;
  const rY = (y: number) => y * ROOM_S;
  // table centres (with their chairs) in the interior picture
  const ROOM_TABLES = [
    [85, 190],
    [213, 190],
    [146, 246],
    [243, 246],
  ] as const;
  const roomCleyde = { x: rX(105), y: rY(100) };
  const roomBar = { x: rX(105), y: rY(150) };
  const roomDoor = { x: rX(171), y: rY(318) };
  // Michele waits in the corner between the stage and the bathroom wall
  const roomMichele = { x: rX(326), y: rY(180) };
  const micheleImg = Object.assign(new Image(), { src: micheleSrc });
  let hasDisc = false;
  // David sits on the back chair of the lower-left table; his lost RPG book hides behind a tree in Fase 1
  const roomDavid = { x: rX(146), y: rY(233) };
  const davidImg = Object.assign(new Image(), { src: davidSrc });
  const rpgBookImg = Object.assign(new Image(), { src: rpgBookSrc });
  const rpgBook = { x: 1290, y: 1050 };
  let rpg: RpgState = "hidden";
  let metDavid = false;
  // Ricardo Milos dances on the stage; Pai de Família sits on the left chair of the upper-right table
  const roomRicardo = { x: rX(262), y: rY(122) };
  const ricardoImg = Object.assign(new Image(), { src: ricardoSrc });
  const roomPai = { x: rX(185), y: rY(207) };
  const paiImg = Object.assign(new Image(), { src: paiSrc });
  // Milos' pointless quest: a magic key hidden in the forest, handed to Nelson Selvagem
  const magicKey = { x: 560, y: 1100 };
  const nelsonNpc = { x: 760, y: 150 };
  let key: KeyState = "none";
  let cutscene = false;
  let deadT = 0;
  let inside = false;
  let outsidePos: { x: number; y: number }[] = [];
  const roomBlocked = (x: number, y: number) => {
    if (x < rX(15) + 10 || x > rX(360) - 10 || y < rY(148)) return true;
    // only the door gap is open in the bottom wall
    if (y > rY(314)) return x < rX(150) || x > rX(192) || y > rY(345);
    if (x > rX(284) && y > rY(186)) return true; // bathroom
    if (((x - rX(28)) / 22) ** 2 + ((y - rY(296)) / 14) ** 2 < 1) return true; // plant
    if (((x - roomMichele.x) / 16) ** 2 + ((y - roomMichele.y) / 10) ** 2 < 1) return true; // Michele
    return ROOM_TABLES.some(
      ([cx, cy]) => ((x - rX(cx)) / (40 * ROOM_S)) ** 2 + ((y - rY(cy)) / (15 * ROOM_S)) ** 2 < 1,
    );
  };
  const assistCd: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  const inv: [number, number] = [0, 0];
  let attackCd = 0;
  const shots: {
    x: number;
    y: number;
    target: { x: number; y: number; alive: boolean };
    hero: 2 | 3;
    t: number;
  }[] = [];
  const exit = { x: 1660, y: 560 };
  const chest = { x: -999, y: -999, unlocked: false, opened: false };
  let boss: Enemy | null = null;
  let fadeT = 0;

  // ---------- world layout (seeded so each phase's map is the same every visit) ----------
  const propsImg = Object.assign(new Image(), { src: propsSrc });
  const grassImg = Object.assign(new Image(), { src: grassSrc });
  const dirtImg = Object.assign(new Image(), { src: dirtSrc });
  let grassPat: CanvasPattern | null = null;
  let dirtPat: CanvasPattern | null = null;
  let stonePat: CanvasPattern | null = null;
  // darkness layer for the mine; light holes are cut around heroes and lamps
  const dark = document.createElement("canvas");
  dark.width = W;
  dark.height = H;
  const dctx = dark.getContext("2d")!;

  let seed = 20261107;
  const srng = (a: number, b: number) => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed / 4294967296) * (b - a) + a;
  };
  const pick = <T>(arr: readonly T[]) => arr[Math.floor(srng(0, arr.length))]!;

  const bez = (a: number, b: number, c: number, d: number, t: number) =>
    (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d;
  let trail: readonly (readonly [number, number])[] = TRAIL;
  const trailPts: { x: number; y: number }[] = [];
  const nearTrail = (x: number, y: number, m: number) =>
    trailPts.some((p) => Math.hypot(p.x - x, p.y - y) < m + TRAIL_HALF);

  const solids: Solid[] = [];
  const standing: Prop[] = [];
  const flat: Prop[] = [];
  const ponds: Prop[] = [];
  const lights: { x: number; y: number; r: number }[] = [];
  const blocked = (x: number, y: number, pad: number) =>
    solids.some(
      (o) => ((x - o.x) / (o.rx + pad)) ** 2 + ((y - o.y) / (o.ry + pad * 0.6)) ** 2 < 1,
    );
  const inStartZone = (x: number, y: number) =>
    phase === 1 ? x < 470 && y < 470 : x < 340 && Math.abs(y - 600) < 190;
  const free = (x: number, y: number, m: number) =>
    !nearTrail(x, y, m) &&
    !inStartZone(x, y) &&
    Math.hypot(x - cleyde.x, y - cleyde.y) > 165 &&
    Math.hypot(x - exit.x, y - exit.y) > 120 &&
    !(phase === 2 && Math.hypot(x - ARENA.x, y - ARENA.y) < ARENA.r - 25) &&
    !(phase === 1 && (Math.hypot(x - magicKey.x, y - magicKey.y) < 80 || Math.hypot(x - nelsonNpc.x, y - nelsonNpc.y) < 90)) &&
    !blocked(x, y, m);
  const addSolid = (name: PropName, x: number, y: number, s: number, rx: number, ry: number) => {
    standing.push({ name, x, y, s, flip: srng(0, 1) < 0.5, tree: TREES.includes(name) });
    solids.push({ x, y: y - 4, rx, ry });
  };
  const addPond = (name: PropName, cx: number, cy: number, s: number) => {
    const [, , w, h] = PROP_FRAMES[name];
    ponds.push({ name, x: cx, y: cy + (h * s) / 2, s, flip: false, tree: false });
    solids.push({ x: cx, y: cy, rx: (w * s) / 2 - 14, ry: (h * s) / 2 - 14 });
  };
  const scatter = (count: number, m: number, fn: (x: number, y: number) => void) => {
    for (let n = 0, tries = 0; n < count && tries < count * 25; tries++) {
      const x = srng(40, world.w - 40);
      const y = srng(60, world.h - 20);
      if (!free(x, y, m)) continue;
      fn(x, y);
      n++;
    }
  };
  const addLamp = (i: number) => {
    const p = trailPts[i]!;
    addSolid("lamp", p.x + 10, p.y - TRAIL_HALF - 8, 0.6, 7, 5);
    lights.push({ x: p.x + 10, y: p.y - TRAIL_HALF - 70, r: 150 });
  };

  function layoutForest() {
    // ponds and fixed landmarks first
    addPond("pond", 780, 1000, 1);
    addPond("pond2", 1420, 900, 1);
    addPond("pond_s", 1230, 190, 1);
    addSolid("well", 250, 1040, 0.6, 30, 14);
    addSolid("fence_l", 150, 1120, 0.55, 40, 6);
    addSolid("fence_l", 240, 1120, 0.55, 40, 6);
    addSolid("statue", 1000, 330, 0.6, 18, 9);
    addSolid("barrel", 494, 788, 0.55, 14, 8);
    addSolid("bench", 420, 862, 0.5, 32, 7);
    // Cabaré building blocks movement (the door step in front stays walkable)
    solids.push({ x: cabare.x, y: cabare.base - 28, rx: 100, ry: 26 });
    addSolid("signpost", 1590, 620, 0.6, 8, 5);
    addSolid("sign", 175, 425, 0.55, 12, 5);
    // the tree that hides David's RPG book (the book lies just behind its trunk)
    addSolid("tree_big", rpgBook.x, rpgBook.y + 20, 0.68, 13, 8);
    // a bush half-hides the magic key
    addSolid("bush2", magicKey.x + 26, magicKey.y + 10, 0.55, 11, 6);
    for (const i of [14, 34, 62, 84]) addLamp(i);
    // forest border along the top and bottom edges
    for (let x = 30; x < world.w; x += srng(70, 110)) {
      if (free(x, 40, 20)) addSolid(pick(TREES), x, srng(40, 70), srng(0.6, 0.7), 13, 8);
      if (free(x, world.h - 10, 20))
        addSolid(pick(TREES), x, world.h - srng(0, 20), srng(0.6, 0.7), 13, 8);
    }
    scatter(48, 34, (x, y) => {
      const name = pick(TREES);
      const small = SMALL_TREES.has(name);
      addSolid(name, x, y, small ? 0.7 : srng(0.55, 0.68), small ? 9 : 13, small ? 6 : 8);
    });
    scatter(12, 22, (x, y) => addSolid(pick(ROCKS), x, y, 0.6, 14, 8));
    scatter(20, 18, (x, y) => addSolid(pick(BUSHES), x, y, 0.55, 11, 6));
    scatter(5, 26, (x, y) => {
      const name = pick(LOGS);
      addSolid(name, x, y, 0.55, name === "log" ? 20 : 15, 7);
    });
    // flat ground decoration: flowers, mushrooms, grass tufts, and sticks on the trail
    for (let n = 0; n < 260; n++) {
      const x = srng(20, world.w - 20);
      const y = srng(30, world.h - 10);
      if (blocked(x, y, 6) || nearTrail(x, y, 4)) continue;
      const name = srng(0, 1) < 0.55 ? pick(FLOWERS) : pick(GRASSES);
      flat.push({ name, x, y, s: 0.45, flip: srng(0, 1) < 0.5, tree: false });
    }
    for (let n = 0; n < 14; n++) {
      const p = pick(trailPts);
      flat.push({
        name: pick(STICKS),
        x: p.x + srng(-25, 25),
        y: p.y + srng(-20, 25),
        s: 0.4,
        flip: srng(0, 1) < 0.5,
        tree: false,
      });
    }
  }

  // Placeholder mine built from the forest sheet's rocks, logs and lamps until the cave art arrives.
  function layoutMine() {
    addPond("pond_s", 760, 220, 0.9);
    addPond("pond_s", 1120, 1010, 0.8);
    addSolid("barrel", cleyde.x + 64, cleyde.y + 18, 0.55, 14, 8);
    addSolid("barrel", cleyde.x + 92, cleyde.y + 30, 0.5, 13, 7);
    addSolid("signpost", 300, 470, 0.6, 8, 5);
    addSolid("chest", chest.x, chest.y, 0.7, 26, 10);
    for (const i of [8, 26, 44, 62, 80, 96]) addLamp(i);
    // rock walls along the top and bottom of the tunnel
    for (let x = 20; x < world.w; x += srng(38, 58)) {
      addSolid(pick(ROCKS), x, srng(40, 90), srng(0.95, 1.3), 24, 14);
      addSolid(pick(ROCKS), x, world.h - srng(0, 40), srng(0.95, 1.3), 24, 14);
    }
    // boss arena: a ring of boulders with a gap where the track enters
    for (let a = 0; a < Math.PI * 2; a += 0.15) {
      const x = ARENA.x + Math.cos(a) * ARENA.r;
      const y = ARENA.y + Math.sin(a) * (ARENA.r - 20);
      if (x > world.w - 20) continue;
      if (free(x, y, 14)) addSolid(pick(ROCKS), x, y, srng(0.85, 1.1), 20, 11);
    }
    scatter(62, 26, (x, y) => addSolid(pick(ROCKS), x, y, srng(0.7, 1.1), 17, 10));
    scatter(12, 26, (x, y) => {
      const name = pick(LOGS);
      addSolid(name, x, y, 0.55, name === "log" ? 20 : 15, 7);
    });
    scatter(6, 20, (x, y) => addSolid("barrel", x, y, 0.5, 13, 7));
    scatter(6, 30, (x, y) => addSolid("fence", x, y, 0.55, 28, 6));
    const CAVE_FLAT: PropName[] = ["mush1", "mush2", "mush3", "mush4", "mush1", "mush3"];
    for (let n = 0; n < 150; n++) {
      const x = srng(20, world.w - 20);
      const y = srng(30, world.h - 10);
      if (blocked(x, y, 6) || nearTrail(x, y, 4)) continue;
      const name = srng(0, 1) < 0.5 ? pick(CAVE_FLAT) : pick(STICKS);
      flat.push({ name, x, y, s: 0.42, flip: srng(0, 1) < 0.5, tree: false });
    }
  }

  const enemies: Enemy[] = [];
  const monsterImgs: Record<EnemyType, HTMLImageElement> = {
    zombie: Object.assign(new Image(), { src: zombieSrc }),
    spider: Object.assign(new Image(), { src: spiderSrc }),
    skeleton: Object.assign(new Image(), { src: skeletonSrc }),
  };

  function makeEnemy(type: EnemyType, x: number, y: number, minion = false): Enemy {
    const m = PHASE_MULT[phase as 1 | 2];
    const st = MONSTER_STATS[type];
    return {
      x,
      y,
      type,
      label: ENEMY_LABEL[type],
      hp: m.hp,
      max: m.hp,
      alive: true,
      hit: 0,
      dir: 2,
      anim: rng(0, 6),
      moving: false,
      homeX: x,
      homeY: y,
      wanderT: rng(0.5, 2.5),
      wx: 0,
      wy: 0,
      atkCd: 0,
      atkT: -1,
      deathT: -1,
      inMelee: false,
      speed: st.speed * m.speed,
      dmg: Math.round(st.dmg * m.dmg),
      rate: st.rate,
      reach: MELEE_RANGE,
      aggro: minion ? 420 : AGGRO_RANGE,
      scale: MONSTER_SCALE,
      reward: minion ? 1 : m.reward,
      boss: false,
      minion,
      summonT: 0,
      awake: false,
    };
  }

  const types: EnemyType[] = ["skeleton", "zombie", "spider"];
  function spawnEnemies() {
    const count = phase === 1 ? 13 : 16;
    const [x0, x1] = phase === 1 ? [430, world.w - 180] : [450, ARENA.x - ARENA.r - 40];
    for (let i = 0; i < count; i++) {
      let x = 0;
      let y = 0;
      for (let tries = 0; tries < 40; tries++) {
        x = rng(x0, x1);
        y = rng(130, world.h - 150);
        if (!blocked(x, y + 8, 16) && Math.hypot(x - cleyde.x, y - cleyde.y) > 110) break;
      }
      enemies.push(makeEnemy(types[i % 3]!, x, y));
    }
    if (phase === 2) {
      const b = makeEnemy("skeleton", ARENA.x + 20, ARENA.y + 10);
      Object.assign(b, {
        label: BOSS_NAME,
        hp: BOSS.hp,
        max: BOSS.hp,
        speed: BOSS.speed,
        dmg: BOSS.dmg,
        rate: BOSS.rate,
        reach: BOSS.reach,
        aggro: BOSS.aggro,
        scale: BOSS.scale,
        reward: BOSS.reward,
        boss: true,
        summonT: 3,
      });
      enemies.push(b);
      boss = b;
    }
  }

  let startPositions = party.map((c) => ({ x: c.x, y: c.y }));
  // the hero being controlled takes the front spot, the others line up behind
  function placeParty(sx: number, sy: number) {
    const order = [active, ...[0, 1, 2, 3].filter((i) => i !== active)];
    order.forEach((i, slot) => {
      const c = party[i]!;
      c.x = sx - slot * 44;
      c.y = sy + slot * 34;
      c.dir = phase === 1 ? 2 : 1;
      c.action = null;
      c.moving = false;
    });
    startPositions = party.map((c) => ({ x: c.x, y: c.y }));
  }

  function buildPhase(n: number) {
    phase = n;
    inside = false;
    seed = n === 1 ? 20261107 : 20261209;
    for (const arr of [solids, standing, flat, ponds, lights, enemies, shots] as unknown[][])
      arr.length = 0;
    boss = null;
    trail = n === 1 ? TRAIL : MINE_TRAIL;
    if (n === 1) {
      Object.assign(cleyde, { x: 430, y: 770 });
      Object.assign(exit, { x: 1660, y: 560 });
      Object.assign(chest, { x: -999, y: -999, unlocked: false, opened: false });
    } else {
      Object.assign(cleyde, { x: 380, y: 860 });
      Object.assign(exit, { x: -999, y: -999 });
      Object.assign(chest, { x: 1700, y: 560, unlocked: false, opened: false });
    }
    trailPts.length = 0;
    for (const o of [0, 3]) {
      for (let t = 0; t <= 1; t += 0.02) {
        const P = (i: number) => trail[o + i]!;
        trailPts.push({
          x: bez(P(0)[0], P(1)[0], P(2)[0], P(3)[0], t),
          y: bez(P(0)[1], P(1)[1], P(2)[1], P(3)[1], t),
        });
      }
    }
    if (n === 1) layoutForest();
    else layoutMine();
    flat.sort((a, b) => a.y - b.y);
    spawnEnemies();
    if (n === 1) placeParty(280, 290);
    else placeParty(190, 560);
  }
  buildPhase(1);

  const pushHud = () =>
    cb.onHud({
      hp,
      mana,
      coins,
      active,
      assist: ASSIST_HEROES.map((h) => assistCd[h]! / (h === 2 || h === 3 ? ASSIST[h].cd : MELEE_ASSIST[h].cd)),
      inv: [inv[0], inv[1]],
      phase,
      boost: Math.ceil(boostT),
      inside,
      disc: hasDisc,
      rpg,
      key,
    });
  const speakerName = (w: Speaker) =>
    w === "cleyde" || w === "cleydeFeliz" || w === "cleydeAponta"
      ? "Dona Cleyde"
      : w === "michele"
        ? "Michele"
        : w === "david"
          ? "David"
          : w === "ricardo"
            ? "Ricardo Milos"
            : w === "pai"
              ? "Pai de Família"
              : w === "nelson"
                ? BOSS_NAME
                : CHARACTER_NAMES[w]!;
  function talk(
    who: Speaker,
    text: string,
    opts: { modal?: boolean; choices?: string[]; pick?: (i: number) => void; after?: () => void } = {},
  ) {
    const modal = opts.modal ?? true;
    const name = speakerName(who);
    dialog = { who, name, text, choices: opts.choices, modal, t: 0, pick: opts.pick, after: opts.after };
    if (modal) for (const d in touch) touch[d as Dir] = false;
    cb.onDialog({ who, name, text, choices: opts.choices, modal });
  }
  function closeDialog() {
    const after = dialog?.after;
    dialog = null;
    cb.onDialog(null);
    after?.();
  }
  const paused = () => !!dialog?.modal || cutscene;
  function advance() {
    if (!dialog || dialog.choices) return;
    closeDialog();
  }
  function choose(i: number) {
    if (!dialog?.choices || i < 0 || i >= dialog.choices.length) return;
    const pick = dialog.pick;
    dialog = null;
    cb.onDialog(null);
    pick?.(i);
  }
  function cleydeTalk() {
    const onivla = "Bem-vindos ao Cabaré da Cleyde, meus amores! Aqui tem poção boa e preço justo. Vão levar alguma coisa?";
    const shop = () => {
      if (coins < SHOP_PRICE) return talk("cleyde", "TU não tem dinheiro nn peste");
      talk("cleyde", "Oq vocês vão querer?", {
        choices: [`Vida (${SHOP_PRICE} moedas)`, `Dano (${SHOP_PRICE} moedas)`, "Nada não"],
        pick: (i) => {
          if (i === 0) {
            coins -= SHOP_PRICE;
            inv[0]++;
            say(`Poção de vida guardada no inventário (-${SHOP_PRICE} moedas)`);
          } else if (i === 1) {
            coins -= SHOP_PRICE;
            inv[1]++;
            say(`Poção de dano guardada no inventário (-${SHOP_PRICE} moedas)`);
          } else talk("cleydeAponta", "Volta sempre, viu? E não some não!");
          pushHud();
        },
      });
    };
    // the first chat in each phase opens with the Onivla warning, then the shop
    if (!metCleyde) {
      metCleyde = true;
      talk("cleydeFeliz", onivla, { after: shop });
    } else shop();
  }
  // Michele's mission: she hands over an endless phunk disc to deliver in every new phase
  function micheleTalk() {
    const me = active as Speaker;
    if (hasDisc) return talk("michele", "Ainda tão aqui? Vai, entrega esses discos por aí!");
    talk("michele", "Oq querem?", {
      after: () =>
        talk(me, "sla so segue o roteiro", {
          after: () =>
            talk("michele", "ah sim.... eu quero ser a maiora phunk do Brasil, peguem esses discos e saiam entregando por ai", {
              after: () =>
                talk(me, "ta", {
                  after: () => {
                    hasDisc = true;
                    say("Disco de Phunk (infinito) guardado no inventário! Entregue um em cada fase.");
                    pushHud();
                  },
                }),
            }),
        }),
    });
  }
  // David lost his RPG book: the user's scripted chat, then 50 coins when the party brings it back
  function davidTalk() {
    const me = active as Speaker;
    if (rpg === "delivered") return talk("david", "Valeu demais, galerinha! Agora a sessão de RPG sai.");
    if (rpg === "carried") {
      return talk("david", "MEU RPG! Vocês acharam!", {
        after: () =>
          talk("david", "Como prometido: 50 moedas!", {
            after: () => {
              rpg = "delivered";
              metDavid = true;
              coins += DAVID_REWARD;
              say(`Livro de RPG entregue ao David! +${DAVID_REWARD} moedas`);
              pushHud();
            },
          }),
      });
    }
    if (metDavid) return talk("david", "E aí, acharam meu RPG? Procura por aí na trilha!");
    const lines: [Speaker, string][] = [
      ["david", "Opa galerinha"],
      [me, "Oba bom?"],
      ["david", "Não, eu perdi meu rpg por ai"],
      [me, "Como tu conseguiu perder isso?"],
      ["david", "IRMÃO ROTEIRO"],
      [me, "ata kkkkk"],
      ["david", "Então se acharem tragam pra mim, irei recompensados com 50 moedas"],
    ];
    const next = (i: number) => {
      if (i >= lines.length) {
        metDavid = true;
        return say("Missão: achar o livro de RPG do David na Trilha Verde.");
      }
      const [who, text] = lines[i]!;
      talk(who, text, { after: () => next(i + 1) });
    };
    next(0);
  }
  // Ricardo Milos: his classic line, and now and then (MILOS_QUEST_CHANCE) the magic-key quest
  function ricardoTalk() {
    if (milosGivesQuest(Math.random(), key)) {
      return talk("ricardo", "Procure uma chave mágica e entregue para o Nelson selvagem", {
        after: () => {
          key = "hidden";
          say("Missão: achar a chave mágica na Trilha Verde e entregar ao Nelson Selvagem.");
          pushHud();
        },
      });
    }
    talk("ricardo", "Você já viu o Ricardo Milos?");
  }
  function paiTalk() {
    talk("pai", "AI QUE DELÍCIA");
  }
  function nelsonTalk() {
    if (key === "hidden") return talk("nelson", "Cadê a chave mágica? Sem chave, sem segredo.");
    talk("nelson", "Ora, ora... a chave mágica! Agora vocês vão ver o segredo...", {
      after: () => {
        key = "none";
        cutscene = true;
        for (const d in touch) touch[d as Dir] = false;
        pushHud();
        cb.onVideo("milos");
      },
    });
  }
  function pickUpKey() {
    key = "carried";
    say("Vocês acharam a chave mágica! Entregue ao Nelson Selvagem, lá no norte da trilha.");
    pushHud();
  }
  // after the dance the whole group "dies of second-hand embarrassment" and respawns at the start
  function finishVideo() {
    if (!cutscene) return;
    cutscene = false;
    if (inside) leaveCabare();
    faint();
    deadT = 3.5;
    fadeT = 1;
    say("Vocês morreram de vergonha alheia... e renasceram no começo da trilha.");
    pushHud();
  }
  function snapshot(): SaveData {
    return {
      v: 1,
      hero: active,
      phase,
      hp: Math.round(hp),
      mana: Math.round(mana),
      coins,
      inv: [inv[0], inv[1]],
      disc: hasDisc,
      rpg,
      metDavid,
      key,
    };
  }
  function pickUpRpg() {
    rpg = "carried";
    say("Vocês acharam um livro de RPG! Guardado no inventário. Leve para o David no Cabaré.");
    pushHud();
  }
  const say = (t: string) => {
    cb.onMessage(t);
    toastTimer = 2.8;
  };
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  const lead = () => party[active]!;
  const nearest = (range: number) => {
    if (inside) return undefined;
    const p = lead();
    return enemies
      .filter((e) => e.alive && dist(p, e) < range)
      .sort((a, b) => dist(p, a) - dist(p, b))[0];
  };
  const damage = (t: Enemy, amount: number, flash: number) => {
    t.hp -= boostT > 0 ? Math.round(amount * BOOST_MULT) : amount;
    t.hit = flash;
    if (t.hp <= 0 && t.alive) {
      t.alive = false;
      t.deathT = 0;
      t.atkT = -1;
      coins += t.reward;
      if (t.boss) {
        chest.unlocked = true;
        // his skeleton guards crumble with him
        for (const e of enemies) if (e.minion && e.alive) Object.assign(e, { alive: false, deathT: 0 });
        say(`Vocês derrotaram o ${BOSS_NAME}! +${t.reward} moedas. O baú do tesouro destrancou!`);
      } else say(`Monstro derrotado! +${t.reward} moedas`);
      pushHud();
      return true;
    }
    return false;
  };

  function goToPhase(n: number) {
    if (dialog) {
      dialog = null;
      cb.onDialog(null);
    }
    metCleyde = false;
    buildPhase(n);
    fadeT = 1;
    hp = Math.max(hp, 60);
    for (const c of party) c.cd = 0;
    say(
      n === 2
        ? "Vocês entraram na Mina Sombria! Os monstros aqui são mais fortes. Lá no fundo mora o " + BOSS_NAME + "..."
        : "De volta à Trilha Verde.",
    );
    pushHud();
  }


  function move(dt: number) {
    const p = lead();
    const k = (...names: string[]) => names.some((n) => keys[n]);
    let dx =
      (k("ArrowRight", "d", "D") || touch.right ? 1 : 0) -
      (k("ArrowLeft", "a", "A") || touch.left ? 1 : 0);
    let dy =
      (k("ArrowDown", "s", "S") || touch.down ? 1 : 0) -
      (k("ArrowUp", "w", "W") || touch.up ? 1 : 0);
    const l = Math.hypot(dx, dy) || 1;
    dx /= l;
    dy /= l;
    p.moving = !!(dx || dy);
    if (dx || dy) {
      // move each axis separately so the hero slides along trees instead of sticking
      const nx = clamp(p.x + dx * 175 * dt, 25, world.w - 25);
      if (!(inside ? roomBlocked(nx, p.y + 8) : blocked(nx, p.y + 8, 10))) p.x = nx;
      const ny = clamp(p.y + dy * 175 * dt, 25, world.h - 25);
      if (!(inside ? roomBlocked(p.x, ny + 8) : blocked(p.x, ny + 8, 10))) p.y = ny;
      p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0;
      p.anim += dt * 8;
    }
    for (let i = 0; i < 4; i++) {
      if (i === active) continue;
      const f = party[i]!;
      const ld = party[active]!;
      const angle = (i - active) * 1.5 + Math.PI;
      // indoors the group stays close and on the floor
      const k2 = inside ? 0.45 : 1;
      let tx = ld.x + Math.cos(angle) * FOLLOW_RX * k2;
      let ty = ld.y + Math.sin(angle) * FOLLOW_RY * k2;
      if (inside) {
        tx = clamp(tx, rX(15) + 14, rX(284) - 14);
        ty = clamp(ty, rY(148), rY(306));
      }
      const d = Math.hypot(tx - f.x, ty - f.y);
      f.moving = d > 12;
      if (f.moving) {
        const mx = (tx - f.x) / d;
        const my = (ty - f.y) / d;
        f.x += mx * Math.min(d, 145 * dt);
        f.y += my * Math.min(d, 145 * dt);
        f.dir = Math.abs(mx) > Math.abs(my) ? (mx > 0 ? 1 : 3) : my > 0 ? 2 : 0;
        f.anim += dt * 8;
      }
    }
  }

  function useItem(i: number) {
    if (!started || paused() || (i !== 0 && i !== 1)) return;
    if (inv[i]! <= 0) return say("Você não tem essa poção.");
    inv[i]!--;
    if (i === 0) {
      hp = Math.min(100, hp + 40);
      mana = Math.min(100, mana + 20);
      say("Poção de vida! +40 vida, +20 mana");
    } else {
      boostT = BOOST_TIME;
      say(`Poção de dano! Golpes ${BOOST_MULT}x mais fortes por ${BOOST_TIME}s`);
    }
    pushHud();
  }

  function attack() {
    if (!started || paused()) return;
    if (attackCd > 0) return;
    attackCd = ATTACK_DELAY;
    const t = nearest(82);
    faceAndAct(lead(), "attack", t);
    if (t) {
      if (!damage(t, 18, 0.18)) say(t.boss ? `Acertou o ${BOSS_NAME}!` : "Acertou o " + t.label + "!");
    } else say("Nenhum inimigo perto.");
    pushHud();
  }

  function special() {
    if (!started || paused()) return;
    const p = lead();
    if (p.cd > 0) {
      say("Habilidade recarregando: " + p.cd.toFixed(1) + "s");
      return;
    }
    if (active === 0) {
      const t = nearest(150);
      if (t) {
        say("Lâminas flamejantes!");
        damage(t, 48, 0.25);
      } else say("As lâminas cortaram o ar!");
      p.cd = 10;
    } else if (active === 1) {
      if (mana < 20) return say("Mana insuficiente!");
      mana -= 20;
      const t = nearest(190);
      say("Dr. Bugigangas: bugiganga surpresa!");
      if (t) damage(t, 40, 0.25);
      p.cd = 5;
    } else if (active === 2) {
      if (mana < 8) return say("Mana insuficiente!");
      mana -= 8;
      const t = nearest(Infinity);
      say("Flecha encantada disparada!");
      if (t) damage(t, 28, 0.2);
      p.cd = 2;
    } else if (active === 3) {
      if (mana < 12) return say("Mana insuficiente!");
      mana -= 12;
      const t = nearest(220);
      if (t) {
        say("Poção mágica arremessada!");
        damage(t, 32, 0.2);
      } else {
        hp = Math.min(100, hp + 22);
        say("Poção de cura! +22 vida");
      }
      p.cd = 7;
    }
    faceAndAct(p, "special", nearest(220));
    pushHud();
  }

  function faceAndAct(
    c: (typeof party)[number],
    kind: "attack" | "special",
    target?: { x: number; y: number },
  ) {
    if (target && Math.abs(target.x - c.x) > 6) c.dir = target.x > c.x ? 1 : 3;
    c.action = { kind, t: 0 };
  }

  function assist(hero: number) {
    if (!started || paused() || hero === active) return;
    if (inside) return say("Aqui dentro não tem monstro!");
    if (hero === 0 || hero === 1) {
      const m = MELEE_ASSIST[hero];
      if (assistCd[hero]! > 0) return;
      const c = party[hero]!;
      const t = enemies
        .filter((e) => e.alive && dist(lead(), e) < m.range + 60)
        .sort((a, b) => dist(c, a) - dist(c, b))[0];
      if (!t) return say(m.name + ": nenhum monstro perto!");
      assistCd[hero] = m.cd;
      // dashes up to the monster and hits it up close
      c.x = t.x + (c.x < t.x ? -30 : 30);
      c.y = t.y;
      faceAndAct(c, "attack", t);
      damage(t, m.dmg, 0.2);
      talk(active as Speaker, HELP_LINE[hero]!, { modal: false });
      pushHud();
      return;
    }
    if (hero !== 2 && hero !== 3) return;
    const cfg = ASSIST[hero];
    if (assistCd[hero]! > 0) return;
    const c = party[hero]!;
    const t = enemies
      .filter((e) => e.alive && dist(c, e) < cfg.range)
      .sort((a, b) => dist(c, a) - dist(c, b))[0];
    if (!t) return say(cfg.name + ": nenhum monstro no alcance!");
    assistCd[hero] = cfg.cd;
    faceAndAct(c, "attack", t);
    shots.push({ x: c.x, y: c.y - 20, target: t, hero, t: 0 });
    // the hero in command calls the support for help
    talk(active as Speaker, HELP_LINE[hero]!, { modal: false });
    pushHud();
  }

  function updateShots(dt: number) {
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i]!;
      s.t += dt;
      const tgt = s.target as Enemy;
      if (!tgt.alive || s.t > 2) {
        shots.splice(i, 1);
        continue;
      }
      const dx = tgt.x - s.x;
      const dy = tgt.y - 18 - s.y;
      const d = Math.hypot(dx, dy);
      const step = ASSIST[s.hero].speed * dt;
      if (d <= step + 6) {
        shots.splice(i, 1);
        damage(tgt, ASSIST[s.hero].dmg, 0.18);
        pushHud();
        continue;
      }
      s.x += (dx / d) * step;
      s.y += (dy / d) * step;
    }
  }

  function drawShots(camX: number, camY: number) {
    for (const s of shots) {
      const x = s.x - camX;
      const y = s.y - camY;
      const tgt = s.target;
      const a = Math.atan2(tgt.y - 18 - s.y, tgt.x - s.x);
      ctx.save();
      ctx.translate(x, y);
      if (s.hero === 2) {
        ctx.rotate(a);
        ctx.fillStyle = "#6b4426";
        ctx.fillRect(-12, -1, 20, 2);
        ctx.fillStyle = "#e8e2d0";
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(6, -4);
        ctx.lineTo(6, 4);
        ctx.fill();
        ctx.fillStyle = "#7fd36a";
        ctx.fillRect(-14, -3, 4, 6);
      } else {
        ctx.rotate(s.t * 14);
        ctx.fillStyle = "#b46be6aa";
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, 7);
        ctx.fill();
        ctx.fillStyle = "#8d2c66";
        ctx.fillRect(-4, -3, 8, 8);
        ctx.fillStyle = "#e6c3ff";
        ctx.fillRect(-2, -6, 4, 3);
      }
      ctx.restore();
    }
  }

  function enterCabare() {
    outsidePos = party.map((c) => ({ x: c.x, y: c.y }));
    inside = true;
    shots.length = 0;
    const lx = roomDoor.x;
    const ly = rY(298);
    const order = [active, ...[0, 1, 2, 3].filter((i) => i !== active)];
    const spots = [[0, 0], [-55, -6], [55, -6], [-110, -6]] as const;
    order.forEach((i, slot) => {
      const c = party[i]!;
      c.x = lx + spots[slot]![0];
      c.y = ly + spots[slot]![1];
      c.dir = 0;
      c.action = null;
      c.moving = false;
    });
    fadeT = 1;
    say("Você entrou no Cabaré da Cleyde! Fale com ela no balcão.");
    pushHud();
  }

  function leaveCabare() {
    inside = false;
    party.forEach((c, i) => {
      const o = outsidePos[i];
      if (o) Object.assign(c, { x: o.x, y: o.y });
      c.dir = 2;
      c.action = null;
      c.moving = false;
    });
    fadeT = 1;
    say("Você saiu do Cabaré.");
    pushHud();
  }

  function drawRoom() {
    ctx.fillStyle = "#0d0a0c";
    ctx.fillRect(0, 0, W, H);
    if (cabareInImg.complete && cabareInImg.naturalWidth) {
      // the picture is a photo-quality image, so smooth it when scaling up
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(cabareInImg, ROOM_OX, 0, 375 * ROOM_S, 369 * ROOM_S);
      ctx.imageSmoothingEnabled = false;
    }
    // Dona Cleyde stands behind the counter: clip her at the counter top
    if (cleydeImg.complete && cleydeImg.naturalWidth) {
      const w = cleydeImg.naturalWidth * ROOM_CHAR * 1.5;
      const h = cleydeImg.naturalHeight * ROOM_CHAR * 1.5;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, rY(90));
      ctx.clip();
      ctx.drawImage(cleydeImg, Math.round(roomCleyde.x - w / 2), Math.round(roomCleyde.y - h), w, h);
      ctx.restore();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px 'Pixelify Sans', system-ui";
      ctx.textAlign = "center";
      ctx.fillText("DONA CLEYDE", roomCleyde.x, roomCleyde.y - h - 6);
    }
    const drawMichele = () => {
      if (!micheleImg.complete || !micheleImg.naturalWidth) return;
      const w = micheleImg.naturalWidth * ROOM_CHAR;
      const h = micheleImg.naturalHeight * ROOM_CHAR;
      const mx = roomMichele.x;
      const my = roomMichele.y + 10;
      ctx.fillStyle = "#20351e88";
      ctx.beginPath();
      ctx.ellipse(mx, my - 1, 12, 4, 0, 0, 7);
      ctx.fill();
      ctx.drawImage(micheleImg, Math.round(mx - w / 2), Math.round(my - h), w, h);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px 'Pixelify Sans', system-ui";
      ctx.textAlign = "center";
      ctx.fillText("MICHELE", mx, my - h - 6);
    };
    // David sits behind his table: only what is above the table top shows (clip out the table ellipse)
    const drawDavid = () => {
      if (!davidImg.complete || !davidImg.naturalWidth) return;
      const w = davidImg.naturalWidth * ROOM_CHAR;
      const h = davidImg.naturalHeight * ROOM_CHAR;
      const top = Math.round(roomDavid.y - h * 0.58);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.ellipse(rX(146), rY(245), 23 * ROOM_S, 13.5 * ROOM_S, 0, 0, Math.PI * 2);
      ctx.clip("evenodd");
      ctx.beginPath();
      ctx.rect(0, 0, W, rY(240));
      ctx.clip();
      ctx.drawImage(davidImg, Math.round(roomDavid.x - w / 2), top, w, h);
      ctx.restore();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px 'Pixelify Sans', system-ui";
      ctx.textAlign = "center";
      ctx.fillText("DAVID", roomDavid.x, top - 6);
    };
    const drawStanding = (img: HTMLImageElement, at: { x: number; y: number }, label: string, bob = 0) => {
      if (!img.complete || !img.naturalWidth) return;
      const w = img.naturalWidth * ROOM_CHAR;
      const h = img.naturalHeight * ROOM_CHAR;
      ctx.fillStyle = "#1a0d1a88";
      ctx.beginPath();
      ctx.ellipse(at.x, at.y - 1, 13, 4, 0, 0, 7);
      ctx.fill();
      ctx.drawImage(img, Math.round(at.x - w / 2), Math.round(at.y - h + bob), w, h);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px 'Pixelify Sans', system-ui";
      ctx.textAlign = "center";
      ctx.fillText(label, at.x, at.y - h - 6);
    };
    // Ricardo sways a little to the music
    const sway = Math.round(Math.sin(performance.now() / 260) * 1.5);
    [
      { y: roomRicardo.y, draw: () => drawStanding(ricardoImg, roomRicardo, "RICARDO MILOS", sway) },
      { y: roomPai.y, draw: () => drawStanding(paiImg, roomPai, "PAI DE FAMÍLIA") },
      { y: roomMichele.y, draw: drawMichele },
      { y: roomDavid.y, draw: drawDavid },
      ...party.map((c, i) => ({ y: c.y, draw: () => drawChar(c, i, c.x, c.y) })),
    ]
      .sort((a, b) => a.y - b.y)
      .forEach((d) => d.draw());
    ctx.fillStyle = "#fff1c4";
    ctx.font = "bold 13px 'Pixelify Sans', system-ui";
    ctx.textAlign = "center";
    ctx.fillText("SAIR ▼", roomDoor.x, rY(342));
    ctx.textAlign = "left";
    ctx.font = "14px 'Pixelify Sans', system-ui";
    ctx.fillText("Cabaré da Cleyde", 18, H - 18);
    if (fadeT > 0) {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(1, fadeT)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function interact() {
    if (!started) return;
    if (dialog?.modal) return advance();
    const p = lead();
    if (inside) {
      const npcs: [{ x: number; y: number }, number, () => void][] = [
        [roomMichele, 90, micheleTalk],
        [roomDavid, 85, davidTalk],
        [roomPai, 85, paiTalk],
        [roomRicardo, 110, ricardoTalk],
      ];
      const near = npcs
        .filter(([o, r]) => dist(p, o) < r)
        .sort((a, b) => dist(p, a[0]) - dist(p, b[0]))[0];
      if (near) near[2]();
      else if (dist(p, roomBar) < 120) cleydeTalk();
      else if (dist(p, roomDoor) < 80) leaveCabare();
      else say("Cleyde no balcão, Ricardo no palco, Michele no canto, David e o Pai de Família nas mesas. Para sair, FALAR na porta.");
      return pushHud();
    }
    const door = { x: cabare.x, y: cabare.base + 14 };
    if (phase === 1 && rpg === "hidden" && dist(p, rpgBook) < 60) pickUpRpg();
    else if (phase === 1 && key === "hidden" && dist(p, magicKey) < 60) pickUpKey();
    else if (phase === 1 && key !== "none" && dist(p, nelsonNpc) < 90) nelsonTalk();
    else if (phase === 1 && dist(p, door) < 110) enterCabare();
    else if (phase !== 1 && dist(p, cleyde) < 95) cleydeTalk();
    else if (dist(p, exit) < 100) goToPhase(2);
    else if (dist(p, chest) < 90) {
      if (chest.opened) say("O baú já está vazio.");
      else if (!chest.unlocked) say(`O baú está trancado... derrote o ${BOSS_NAME}!`);
      else {
        chest.opened = true;
        coins += 50;
        say("Baú aberto! +50 moedas. Fase 2 completa — a Fase 3 vem aí!");
      }
    } else say("Nada para interagir por aqui.");
    pushHud();
  }

  // ---------- drawing ----------
  function drawGround(camX: number, camY: number) {
    if (!grassPat && grassImg.complete && grassImg.naturalWidth)
      grassPat = ctx.createPattern(grassImg, "repeat");
    if (!dirtPat && dirtImg.complete && dirtImg.naturalWidth)
      dirtPat = ctx.createPattern(dirtImg, "repeat");
    if (!stonePat) stonePat = makeStonePattern();
    const mine = phase === 2;
    const T = trail;
    ctx.save();
    // draw in world coordinates so the textures scroll with the camera
    ctx.translate(-camX, -camY);
    ctx.fillStyle = (mine ? stonePat : grassPat) ?? (mine ? "#2c2730" : "#5a9b4c");
    ctx.fillRect(camX, camY, W, H);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(T[0]![0], T[0]![1]);
    ctx.bezierCurveTo(T[1]![0], T[1]![1], T[2]![0], T[2]![1], T[3]![0], T[3]![1]);
    ctx.bezierCurveTo(T[4]![0], T[4]![1], T[5]![0], T[5]![1], T[6]![0], T[6]![1]);
    ctx.strokeStyle = mine ? "#1a161d" : "#3f7a34";
    ctx.lineWidth = TRAIL_HALF * 2 + 8;
    ctx.stroke();
    ctx.strokeStyle = dirtPat ?? "#c99a55";
    ctx.lineWidth = TRAIL_HALF * 2;
    ctx.stroke();
    if (mine) {
      // darken the dirt and lay a mine-cart track on it
      ctx.strokeStyle = "rgba(20,12,24,0.45)";
      ctx.stroke();
      ctx.strokeStyle = "#8e9099";
      ctx.lineWidth = 26;
      ctx.stroke();
      ctx.strokeStyle = "#5b4636";
      ctx.lineWidth = 21;
      ctx.stroke();
      ctx.setLineDash([5, 13]);
      ctx.strokeStyle = "#3b2a1e";
      ctx.lineWidth = 34;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  function makeStonePattern() {
    const c = document.createElement("canvas");
    c.width = c.height = 96;
    const g = c.getContext("2d")!;
    g.fillStyle = "#2c2730";
    g.fillRect(0, 0, 96, 96);
    let sd = 77;
    const r = () => (sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296;
    const tones = ["#37313d", "#241f28", "#3f3845", "#2f2a33"];
    for (let i = 0; i < 70; i++) {
      const x = Math.floor(r() * 96);
      const y = Math.floor(r() * 96);
      const w = 4 + Math.floor(r() * 10);
      const h = 3 + Math.floor(r() * 7);
      g.fillStyle = tones[Math.floor(r() * tones.length)]!;
      for (const ox of [0, -96]) for (const oy of [0, -96]) g.fillRect(x + ox, y + oy, w, h);
    }
    g.fillStyle = "#1a161d";
    for (let i = 0; i < 18; i++) g.fillRect(Math.floor(r() * 96), Math.floor(r() * 96), 1 + Math.floor(r() * 6), 1);
    return ctx.createPattern(c, "repeat");
  }

  function drawDarkness(camX: number, camY: number, time: number) {
    dctx.globalCompositeOperation = "source-over";
    dctx.clearRect(0, 0, W, H);
    dctx.fillStyle = "rgba(6,4,12,0.86)";
    dctx.fillRect(0, 0, W, H);
    dctx.globalCompositeOperation = "destination-out";
    const hole = (x: number, y: number, r: number) => {
      if (x < -r || x > W + r || y < -r || y > H + r) return;
      const g = dctx.createRadialGradient(x, y, r * 0.15, x, y, r);
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      dctx.fillStyle = g;
      dctx.beginPath();
      dctx.arc(x, y, r, 0, 7);
      dctx.fill();
    };
    party.forEach((c, i) => hole(c.x - camX, c.y - camY - 14, i === active ? 250 : 110));
    const flick = Math.sin(time * 9) * 5;
    for (const l of lights) hole(l.x - camX, l.y - camY, l.r + flick);
    if (boss && (boss.alive || boss.deathT < BOSS_CORPSE_TIME))
      hole(boss.x - camX, boss.y - camY - 30, 150);
    hole(cleyde.x - camX - 20, cleyde.y - camY, 120);
    for (const s of shots) hole(s.x - camX, s.y - camY, 60);
    ctx.drawImage(dark, 0, 0);
    // warm lamp glow on top
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const l of lights) {
      const x = l.x - camX;
      const y = l.y - camY;
      if (x < -200 || x > W + 200 || y < -200 || y > H + 200) continue;
      const g = ctx.createRadialGradient(x, y, 4, x, y, 110 + flick);
      g.addColorStop(0, "rgba(255,170,70,0.35)");
      g.addColorStop(1, "rgba(255,120,40,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - 120, y - 120, 240, 240);
    }
    ctx.restore();
  }

  function drawBossBar() {
    if (!boss || !boss.alive || !boss.awake) return;
    const w = 360;
    const x = (W - w) / 2;
    const y = H - 46;
    ctx.fillStyle = "#120d10cc";
    ctx.fillRect(x - 6, y - 22, w + 12, 40);
    ctx.fillStyle = "#3a1f1f";
    ctx.fillRect(x, y, w, 10);
    ctx.fillStyle = "#c63b2f";
    ctx.fillRect(x, y, w * Math.max(0, boss.hp / boss.max), 10);
    ctx.strokeStyle = "#e0b866";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, 10);
    ctx.fillStyle = "#ffe7a8";
    ctx.font = "bold 14px 'Pixelify Sans', system-ui";
    ctx.textAlign = "center";
    ctx.fillText(BOSS_NAME.toUpperCase(), W / 2, y - 6);
  }

  function drawProp(o: Prop, camX: number, camY: number, alpha = 1) {
    if (!propsImg.complete || !propsImg.naturalWidth) return;
    const [sx, sy, sw, sh] = PROP_FRAMES[o.name];
    const w = Math.round(sw * o.s);
    const h = Math.round(sh * o.s);
    const x = Math.round(o.x - camX);
    const y = Math.round(o.y - camY);
    if (x + w / 2 < 0 || x - w / 2 > W || y < 0 || y - h > H) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    if (o.flip) ctx.scale(-1, 1);
    ctx.drawImage(propsImg, sx, sy, sw, sh, -Math.round(w / 2), -h, w, h);
    ctx.restore();
  }

  // trees fade a little when the active hero walks behind their canopy
  function treeAlpha(o: Prop) {
    if (!o.tree) return 1;
    const p = lead();
    const [, , sw, sh] = PROP_FRAMES[o.name];
    const feet = p.y + 10;
    const behind =
      Math.abs(p.x - o.x) < sw * o.s * 0.42 && feet < o.y - 4 && feet > o.y - sh * o.s + 10;
    return behind ? 0.55 : 1;
  }

  function pickFrame(c: (typeof party)[number], i: number) {
    const a = ANIMS[SHEET_KEYS[i]!];
    if (c.action) {
      const seq = a[c.action.kind];
      const f = Math.floor((c.action.t / ACTION_TIME[c.action.kind]) * seq.length);
      return { idx: seq[Math.min(seq.length - 1, f)]!, flip: c.dir === 3 };
    }
    const seq = c.dir === 0 ? a.up : c.dir === 2 ? a.down : a.side;
    const idx = c.moving ? seq[Math.floor(c.anim / 1.6) % seq.length]! : seq[0]!;
    return { idx, flip: c.dir === 3 };
  }

  function drawChar(c: (typeof party)[number], i: number, cx: number, cy: number) {
    const img = sprites[i]!;
    const bob = c.moving && !c.action ? Math.abs(Math.sin(c.anim * 1.2)) * -2 : 0;
    ctx.fillStyle = "#20351e88";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 9, 13, 5, 0, 0, 7);
    ctx.fill();
    if (i === active) {
      ctx.strokeStyle = "#ffe28a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 10, 17, 6, 0, 0, 7);
      ctx.stroke();
    }
    const rects = FRAMES[SHEET_KEYS[i]!];
    if (img.complete && img.naturalWidth && rects) {
      const { idx, flip } = pickFrame(c, i);
      const r = rects[idx] ?? rects[0]!;
      const [sx, sy, sw, sh, ax, ay] = r;
      // shared scale keeps the characters' relative sizes from the sprite sheet;
      // frames are anchored at the feet so poses with effects don't jump around
      const s = SPRITE_SCALE * (inside ? ROOM_CHAR : 1);
      ctx.save();
      ctx.translate(cx, cy + 10 + bob);
      if (flip) ctx.scale(-1, 1);
      ctx.drawImage(img, sx, sy, sw, sh, -ax * s, -ay * s, sw * s, sh * s);
      ctx.restore();
    } else {
      ctx.fillStyle = ["#b33", "#aaa", "#4a4", "#222"][i]!;
      ctx.fillRect(cx - 9, cy - 30, 18, 28);
    }
  }

  function updateEnemies(dt: number) {
    const p = lead();
    for (const e of enemies) {
      e.hit = Math.max(0, e.hit - dt);
      if (!e.alive) {
        if (e.deathT >= 0) e.deathT += dt;
        continue;
      }
      e.atkCd = Math.max(0, e.atkCd - dt);
      if (e.atkT >= 0) {
        e.atkT += dt;
        if (e.atkT >= MONSTER_ATTACK_TIME) e.atkT = -1;
      }
      const d = dist(p, e);
      let vx = 0;
      let vy = 0;
      let speed = 0;
      if (e.boss && d < e.aggro) {
        if (!e.awake) {
          e.awake = true;
          say(`O ${BOSS_NAME} acordou! Cuidado com os guardas dele.`);
        }
        // calls skeleton guards every few seconds (max 3 at a time)
        e.summonT -= dt;
        if (e.summonT <= 0) {
          e.summonT = 7;
          const guards = enemies.filter((m) => m.minion && m.alive).length;
          for (let n = 0; n < Math.min(2, 3 - guards); n++) {
            const a = rng(0, Math.PI * 2);
            enemies.push(makeEnemy("skeleton", e.x + Math.cos(a) * 60, e.y + Math.sin(a) * 40, true));
          }
        }
      }
      // while asleep the boss stays on his spot
      if (e.boss && !e.awake) {
        e.moving = false;
        continue;
      }
      if (d < e.reach && !e.inMelee) {
        // brief wind-up so contact doesn't hit instantly
        e.inMelee = true;
        e.atkCd = Math.max(e.atkCd, 0.6);
      } else if (d >= e.reach + 8) e.inMelee = false;
      if (d < e.reach) {
        if (Math.abs(p.x - e.x) > 4) e.dir = p.x > e.x ? 1 : 3;
        if (e.atkCd <= 0) {
          e.atkCd = e.rate;
          e.atkT = 0;
          hp = Math.max(0, hp - e.dmg);
          if (hp <= 0) faint();
          pushHud();
        }
      } else if (d < e.aggro && e.atkT < 0) {
        vx = (p.x - e.x) / d;
        vy = (p.y - e.y) / d;
        speed = e.speed;
      } else {
        e.wanderT -= dt;
        if (e.wanderT <= 0) {
          e.wanderT = rng(1, 3);
          const back = Math.hypot(e.x - e.homeX, e.y - e.homeY) > 120;
          if (back) {
            const hd = Math.hypot(e.homeX - e.x, e.homeY - e.y) || 1;
            e.wx = (e.homeX - e.x) / hd;
            e.wy = (e.homeY - e.y) / hd;
          } else if (Math.random() < 0.35) {
            e.wx = 0;
            e.wy = 0;
          } else {
            const a = rng(0, Math.PI * 2);
            e.wx = Math.cos(a);
            e.wy = Math.sin(a);
          }
        }
        vx = e.wx;
        vy = e.wy;
        speed = 26;
      }
      e.moving = speed > 0 && (vx !== 0 || vy !== 0);
      if (e.moving) {
        const ox = e.x;
        const oy = e.y;
        e.x = clamp(e.x + vx * speed * dt, 25, world.w - 25);
        e.y = clamp(e.y + vy * speed * dt, 25, world.h - 25);
        if (blocked(e.x, e.y + 8, 10)) {
          e.x = ox;
          e.y = oy;
          e.wanderT = 0;
        }
        e.dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 1 : 3) : vy > 0 ? 2 : 0;
        e.anim += dt * 7;
      }
    }
  }

  function faint() {
    hp = 100;
    party.forEach((c, i) => {
      c.x = startPositions[i]!.x;
      c.y = startPositions[i]!.y;
      c.action = null;
    });
    for (const e of enemies) {
      e.atkCd = 1.5;
      if (e.minion) Object.assign(e, { alive: false, deathT: -1 });
    }
    if (boss && boss.alive) {
      // the boss heals and goes back to his throne
      Object.assign(boss, { hp: boss.max, x: boss.homeX, y: boss.homeY, awake: false, summonT: 3 });
    }
    say(
      phase === 1
        ? "O grupo desmaiou! Vocês acordaram no começo da trilha."
        : "O grupo desmaiou! Vocês acordaram na entrada da mina.",
    );
  }

  const nelsonImg = Object.assign(new Image(), { src: nelsonSrc });
  function drawNelson(e: Enemy, x: number, y: number) {
    const A = NELSON_ANIM;
    const at = (seq: readonly number[], t: number, dur: number) =>
      seq[clamp(Math.floor((t / dur) * seq.length), 0, seq.length - 1)]!;
    let fade = 1;
    let idx: number;
    if (!e.alive) {
      idx = at(A.death, e.deathT, BOSS_DEATH_TIME);
      const fadeStart = BOSS_CORPSE_TIME - CORPSE_FADE;
      fade = e.deathT > fadeStart ? 1 - (e.deathT - fadeStart) / CORPSE_FADE : 1;
      if (fade <= 0) return;
    } else if (e.hit > 0) idx = at(A.hurt, 0.18 - e.hit, 0.18);
    else if (e.atkT >= 0) idx = at(A.jump, e.atkT, MONSTER_ATTACK_TIME);
    else if (!e.awake) idx = A.wait[1];
    else if (e.moving) {
      const seq = dist(lead(), e) < e.aggro ? A.run : A.walk;
      idx = seq[Math.floor(e.anim) % seq.length]!;
    } else idx = A.idle[Math.floor(performance.now() / 160) % A.idle.length]!;
    ctx.save();
    ctx.globalAlpha = fade;
    if (e.alive && e.awake) {
      const g = ctx.createRadialGradient(x, y + 4, 4, x, y + 4, 50);
      g.addColorStop(0, "rgba(230,90,30,0.45)");
      g.addColorStop(1, "rgba(230,90,30,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y + 6, 50, 20, 0, 0, 7);
      ctx.fill();
    }
    const r = NELSON_FRAMES[idx];
    if (nelsonImg.complete && nelsonImg.naturalWidth && r) {
      const [sx, sy, sw, sh, ax, ay] = r;
      const s = NELSON_SCALE;
      ctx.translate(x, y + 8);
      if (e.dir === 3) ctx.scale(-1, 1);
      ctx.drawImage(nelsonImg, sx, sy, sw, sh, -ax * s, -ay * s, sw * s, sh * s);
    }
    ctx.restore();
  }

  function drawEnemy(e: Enemy, x: number, y: number) {
    if (e.boss) {
      drawNelson(e, x, y);
      return;
    }
    const img = monsterImgs[e.type];
    const rects = MONSTER_FRAMES[e.type];
    let fade = 1;
    let idx: number;
    if (!e.alive) {
      const seq = MONSTER_ANIM.death;
      idx = seq[Math.min(seq.length - 1, Math.floor((e.deathT / DEATH_TIME) * seq.length))]!;
      fade = e.deathT > DEATH_TIME ? 1 - (e.deathT - DEATH_TIME) / CORPSE_FADE : 1;
      if (fade <= 0) return;
    } else if (e.atkT >= 0) {
      const seq = MONSTER_ANIM.attack;
      idx = seq[Math.min(seq.length - 1, Math.floor((e.atkT / MONSTER_ATTACK_TIME) * seq.length))]!;
    } else {
      const seq = e.dir === 0 ? MONSTER_ANIM.up : e.dir === 2 ? MONSTER_ANIM.down : MONSTER_ANIM.side;
      idx = e.moving ? seq[Math.floor(e.anim) % seq.length]! : seq[1]!;
    }
    const flip = e.dir === 3;
    ctx.save();
    ctx.globalAlpha = fade * (e.hit > 0 ? 0.5 : 1);
    const s = e.scale;
    ctx.fillStyle = "#20351e88";
    ctx.beginPath();
    ctx.ellipse(x, y + 7, 14 * (s / MONSTER_SCALE), 5 * (s / MONSTER_SCALE), 0, 0, 7);
    ctx.fill();
    const r = rects[idx];
    let top = y - 40;
    if (img.complete && img.naturalWidth && r) {
      const [sx, sy, sw, sh, ax, ay] = r;
      ctx.save();
      ctx.translate(x, y + 8);
      if (flip) ctx.scale(-1, 1);
      ctx.drawImage(img, sx, sy, sw, sh, -ax * s, -ay * s, sw * s, sh * s);
      ctx.restore();
      top = y + 8 - ay * s;
    }
    if (e.alive) {
      ctx.fillStyle = "#261c18";
      ctx.fillRect(x - 16, top - 8, 32, 4);
      ctx.fillStyle = "#b74b3d";
      ctx.fillRect(x - 16, top - 8, 32 * Math.max(0, e.hp / e.max), 4);
    }
    ctx.restore();
  }

  const flatTop: { y: number; draw: () => void }[] = [];
  // a short 4-point sparkle every ~2.5s so the hidden book can be spotted through the leaves
  function drawGlint(x: number, y: number, time: number) {
    const t = (time / 1000) % 2.5;
    if (t > 0.6) return;
    const k = Math.sin((t / 0.6) * Math.PI);
    const r = 3 + k * 9;
    ctx.save();
    ctx.globalAlpha = k;
    ctx.fillStyle = "#fff8d0";
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r * 0.22, y - r * 0.22);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x + r * 0.22, y + r * 0.22);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r * 0.22, y + r * 0.22);
    ctx.lineTo(x - r, y);
    ctx.lineTo(x - r * 0.22, y - r * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // a small golden key drawn with shapes (lying on the grass)
  function drawMagicKey(x: number, y: number) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y - 6));
    ctx.rotate(-0.35);
    ctx.fillStyle = "#6b4a12";
    ctx.fillRect(-12, -3, 26, 7);
    ctx.fillStyle = "#f3c74a";
    ctx.beginPath();
    ctx.arc(-9, 0, 6, 0, 7);
    ctx.fill();
    ctx.fillRect(-4, -2, 17, 4);
    ctx.fillRect(8, 2, 3, 4);
    ctx.fillRect(12, 2, 2, 3);
    ctx.fillStyle = "#6b4a12";
    ctx.beginPath();
    ctx.arc(-9, 0, 2.4, 0, 7);
    ctx.fill();
    ctx.fillStyle = "#fff3b0";
    ctx.fillRect(-12, -4, 3, 2);
    ctx.restore();
  }
  function drawNelsonNpc(x: number, y: number) {
    const A = NELSON_ANIM;
    const idx = A.idle[Math.floor(performance.now() / 180) % A.idle.length]!;
    const r = NELSON_FRAMES[idx];
    ctx.fillStyle = "#20351e88";
    ctx.beginPath();
    ctx.ellipse(x, y + 8, 22, 7, 0, 0, 7);
    ctx.fill();
    if (nelsonImg.complete && nelsonImg.naturalWidth && r) {
      const [sx, sy, sw, sh, ax, ay] = r;
      ctx.save();
      ctx.translate(x, y + 8);
      if (lead().x < nelsonNpc.x) ctx.scale(-1, 1);
      ctx.drawImage(nelsonImg, sx, sy, sw, sh, -ax, -ay, sw, sh);
      ctx.restore();
    }
    ctx.fillStyle = "#fff";
    ctx.font = "bold 13px 'Pixelify Sans', system-ui";
    ctx.textAlign = "center";
    ctx.fillText("NELSON SELVAGEM", x, y - 90);
  }
  // after the Milos dance the screen stays black and white for a moment
  function drawDeadTint() {
    if (deadT <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "saturation";
    ctx.fillStyle = `rgba(128,128,128,${Math.min(1, deadT)})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  function draw(time: number) {
    draw2(time);
    drawDeadTint();
  }
  function draw2(time: number) {
    if (inside) return drawRoom();
    const p = lead();
    const camX = Math.round(clamp(p.x - W / 2, 0, world.w - W));
    const camY = Math.round(clamp(p.y - H / 2, 0, world.h - H));
    drawGround(camX, camY);
    for (const o of ponds) drawProp(o, camX, camY);
    for (const o of flat) drawProp(o, camX, camY);

    // Dona Cleyde's potion stand (mine only — in the forest the Cabaré takes its place)
    if (phase === 2) {
      const cx = cleyde.x - camX;
      const cy = cleyde.y - camY;
      ctx.fillStyle = "#69442a";
      ctx.fillRect(cx - 35, cy - 22, 70, 42);
      ctx.fillStyle = "#d4b16c";
      ctx.fillRect(cx - 38, cy - 28, 76, 10);
      ctx.fillStyle = "#8d2c66";
      ctx.fillRect(cx - 19, cy - 16, 10, 17);
      ctx.fillStyle = "#65b6bd";
      ctx.fillRect(cx + 8, cy - 15, 10, 16);
    }


    // Phase exit: the mine entrance that leads to Fase 2
    if (phase === 1) {
      const ex = exit.x - camX;
      const ey = exit.y - camY;
      ctx.fillStyle = "#513b2a";
      ctx.fillRect(ex - 30, ey - 42, 60, 55);
      ctx.fillStyle = "#c8a55d";
      ctx.fillRect(ex - 24, ey - 36, 48, 49);
      ctx.fillStyle = "#120d10";
      ctx.fillRect(ex - 15, ey - 27, 30, 40);
      ctx.fillStyle = "#fff1c4";
      ctx.font = "bold 13px 'Pixelify Sans', system-ui";
      ctx.textAlign = "center";
      ctx.fillText("MINA ▶", ex, ey - 49);
    }

    // David's RPG book lies behind its tree: y-sorted so the trunk covers it, with a glint now and then
    if (phase === 1 && rpg === "hidden" && rpgBookImg.complete && rpgBookImg.naturalWidth) {
      const bw = rpgBookImg.naturalWidth * 0.6;
      const bh = rpgBookImg.naturalHeight * 0.6;
      flatTop.push({
        y: rpgBook.y,
        draw: () =>
          ctx.drawImage(rpgBookImg, Math.round(rpgBook.x - camX - bw / 2), Math.round(rpgBook.y - camY - bh), bw, bh),
      });
    }
    // Milos' magic key (half behind a bush) and Nelson Selvagem waiting for it
    if (phase === 1 && key === "hidden") {
      const kx = magicKey.x - camX;
      const ky = magicKey.y - camY;
      flatTop.push({ y: magicKey.y, draw: () => drawMagicKey(kx, ky) });
    }
    if (phase === 1 && key !== "none") {
      const nx = nelsonNpc.x - camX;
      const ny = nelsonNpc.y - camY;
      flatTop.push({ y: nelsonNpc.y + 8, draw: () => drawNelsonNpc(nx, ny) });
    }
    // monsters, heroes, trees and objects share one y-sorted pass (by feet) so they overlap correctly
    const actors: { y: number; draw: () => void }[] = flatTop.splice(0);
    for (const o of standing) {
      if (o.x - camX < -100 || o.x - camX > W + 100 || o.y - camY < -10 || o.y - camY > H + 230)
        continue;
      actors.push({ y: o.y, draw: () => drawProp(o, camX, camY, treeAlpha(o)) });
    }
    for (const e of enemies) {
      if (!e.alive && e.deathT < 0) continue;
      if (!e.alive && e.deathT > (e.boss ? BOSS_CORPSE_TIME : DEATH_TIME + CORPSE_FADE)) continue;
      actors.push({ y: e.y + 8, draw: () => drawEnemy(e, e.x - camX, e.y - camY) });
    }
    party.forEach((c, i) =>
      actors.push({ y: c.y + 10, draw: () => drawChar(c, i, c.x - camX, c.y - camY) }),
    );
    // Dona Cleyde (the user's skin), y-sorted with everyone else. In the forest she
    // stands at the Cabaré door; in the mine she stands beside her old stand.
    if (phase === 1) {
      const bx = cabare.x - camX;
      const bBase = cabare.base - camY;
      actors.push({
        y: cabare.base,
        draw: () => {
          if (cabareImg.complete && cabareImg.naturalWidth) {
            const w = cabareImg.naturalWidth * CABARE_SCALE;
            const h = cabareImg.naturalHeight * CABARE_SCALE;
            ctx.drawImage(cabareImg, Math.round(bx - w / 2), Math.round(bBase - h), w, h);
          }
        },
      });
    }
    // in the forest Cleyde stays inside the Cabaré; only the mine shows her outside
    if (phase !== 1) {
    const cdx = (phase === 1 ? cabare.x : cleyde.x - 56) - camX;
    const cdy = (phase === 1 ? cabare.base + 14 : cleyde.y + 16) - camY;
    actors.push({
      y: phase === 1 ? cabare.base + 14 : cleyde.y + 16,
      draw: () => {
        if (cleydeImg.complete && cleydeImg.naturalWidth) {
          const w = cleydeImg.naturalWidth * 1.5;
          const h = cleydeImg.naturalHeight * 1.5;
          ctx.drawImage(cleydeImg, Math.round(cdx - w / 2), Math.round(cdy - h), w, h);
        }
        ctx.fillStyle = "#fff";
        ctx.font = "bold 13px 'Pixelify Sans', system-ui";
        ctx.textAlign = "center";
        ctx.fillText("DONA CLEYDE", cdx, cdy - cleydeImg.naturalHeight * 1.5 - 6);
      },
    });
    }
    actors.sort((a, b) => a.y - b.y).forEach((a) => a.draw());
    if (phase === 1 && rpg === "hidden") drawGlint(rpgBook.x - camX + 6, rpgBook.y - camY - 18, time);
    if (phase === 1 && key === "hidden") drawGlint(magicKey.x - camX, magicKey.y - camY - 12, time + 1200);
    drawShots(camX, camY);
    if (phase === 2) drawDarkness(camX, camY, time);
    drawBossBar();

    ctx.fillStyle = "#fff";
    ctx.font = "14px 'Pixelify Sans', system-ui";
    ctx.textAlign = "left";
    ctx.fillText(phase === 1 ? "Trilha Verde" : "Mina Sombria", 18, H - 18);
    if (fadeT > 0) {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(1, fadeT)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function loop(t: number) {
    const dt = Math.min(0.04, (t - last) / 1000 || 0);
    last = t;
    fadeT = Math.max(0, fadeT - dt * 0.9);
    if (!cutscene) deadT = Math.max(0, deadT - dt);
    if (dialog && !dialog.modal) {
      dialog.t += dt;
      if (dialog.t > 1.8) closeDialog();
    }
    if (started && !paused()) {
      boostT = Math.max(0, boostT - dt);
      move(dt);
      if (!inside && phase === 1 && dist(lead(), exit) < 46) goToPhase(2);
      if (!inside && phase === 1 && rpg === "hidden" && dist(lead(), rpgBook) < 36) pickUpRpg();
      if (!inside && phase === 1 && key === "hidden" && dist(lead(), magicKey) < 36) pickUpKey();
      for (const p of party) {
        p.cd = Math.max(0, p.cd - dt);
        if (p.action) {
          p.action.t += dt;
          if (p.action.t >= ACTION_TIME[p.action.kind]) p.action = null;
        }
      }
      if (!inside) updateEnemies(dt);
      for (const h of ASSIST_HEROES) assistCd[h] = Math.max(0, assistCd[h]! - dt);
      attackCd = Math.max(0, attackCd - dt);
      updateShots(dt);
      mana = Math.min(100, mana + dt * 1.3);
      if (toastTimer > 0) {
        toastTimer -= dt;
        if (toastTimer <= 0) cb.onMessage(null);
      }
      hudTimer += dt;
      if (hudTimer > 0.25) {
        hudTimer = 0;
        pushHud();
      }
    }
    draw(t / 1000);
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  const onKeyDown = (e: KeyboardEvent) => {
    keys[e.key] = true;
    if (!started) return;
    if (dialog?.modal) {
      // dialogue open: E / Enter / Space close it, 1-3 pick an option
      if (e.code === "Space" || e.key.startsWith("Arrow")) e.preventDefault();
      if (dialog.choices) {
        const n = Number(e.key);
        if (n >= 1 && n <= dialog.choices.length) choose(n - 1);
      } else if (e.key === "Enter" || e.code === "Space" || e.key.toLowerCase() === "e") advance();
      return;
    }
    if (e.code === "Space") {
      e.preventDefault();
      attack();
    }
    if (e.key.startsWith("Arrow")) e.preventDefault();
    if (e.key.toLowerCase() === "q") special();
    if (e.key.toLowerCase() === "e") interact();
    if (e.key.toLowerCase() === "r") assist(2);
    if (e.key.toLowerCase() === "f") assist(3);
    if (!dialog && ["1", "2", "3", "4"].includes(e.key)) assist(Number(e.key) - 1);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    keys[e.key] = false;
  };
  const onBlur = () => {
    for (const k in keys) keys[k] = false;
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  pushHud();
  // dev-only helper so automated checks can jump the group around the map
  if (import.meta.env.DEV)
    (window as unknown as { __resenha?: unknown }).__resenha = {
      milosQuest() {
        key = "hidden";
        pushHud();
      },
      teleport(x: number, y: number) {
        placeParty(x, y);
      },
      state: () => ({ phase, inside, rpg, metDavid, key, cutscene, deadT, lead: { x: lead().x, y: lead().y }, hp, coins, boss: boss && { hp: boss.hp, alive: boss.alive, awake: boss.awake }, chest }),
    };

  return {
    start(hero = 0, startPhase = 1, save = null) {
      started = true;
      active = Math.max(0, Math.min(party.length - 1, save?.hero ?? hero));
      if (save) {
        hp = save.hp;
        mana = save.mana;
        coins = save.coins;
        inv[0] = save.inv[0];
        inv[1] = save.inv[1];
        hasDisc = save.disc;
        rpg = save.rpg;
        metDavid = save.metDavid;
        key = save.key;
        startPhase = save.phase;
      }
      if (startPhase === 2) return goToPhase(2);
      // rebuild so the chosen hero takes the front spot of the group
      buildPhase(1);
      pushHud();
      say(
        save
          ? "Jogo carregado! " + CHARACTER_NAMES[active]! + " no comando."
          : CHARACTER_NAMES[active]! + " no comando! Encontre Cleyde e explore a trilha.",
      );
    },
    snapshot,
    finishVideo,
    attack,
    special,
    interact,
    assist,
    useItem,
    advance,
    choose,
    setTouch(d, v) {
      touch[d] = v;
    },
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    },
  };
}
