import { describe, expect, it } from "vitest";
import { milosGivesQuest, parseSave } from "@/components/game/quests";

describe("Ricardo Milos magic-key quest", () => {
  it("gives the quest on a roll under 35%", () => {
    expect(milosGivesQuest(0.34, "none")).toBe(true);
  });
  it("says his classic line on a roll of 35% or more", () => {
    expect(milosGivesQuest(0.35, "none")).toBe(false);
  });
  it("never gives a second quest while the key is still out", () => {
    expect(milosGivesQuest(0, "hidden")).toBe(false);
    expect(milosGivesQuest(0, "carried")).toBe(false);
  });
});

describe("save data", () => {
  it("reads back a saved game", () => {
    const save = parseSave(
      JSON.stringify({ v: 1, hero: 2, phase: 2, hp: 70, mana: 40, coins: 62, inv: [1, 0], disc: true, rpg: "delivered", metDavid: true, key: "carried" }),
    );
    expect(save?.coins).toBe(62);
    expect(save?.phase).toBe(2);
    expect(save?.key).toBe("carried");
  });
  it("ignores broken saves", () => {
    expect(parseSave("not json")).toBeNull();
    expect(parseSave(JSON.stringify({ v: 9 }))).toBeNull();
  });
});
