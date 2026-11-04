import { describe, expect, it } from "vitest";
import { presentGameMessage } from "./message-presentation";

const ja = (message: string): string => presentGameMessage(message, "ja").text;

describe("assembled status, whistle and appearance messages", () => {
  it.each([
    ["Two creatures shift locations and your invisible large dog appears.", "2匹の生き物が場所を移り、あなたの透明な大型犬が現われた。"],
    ["Three creatures shift locations, two others appear, and your pony disappears.", "3匹の生き物が場所を移り、ほかの2匹が現われ、あなたの子馬が消えた。"],
    ["Status of the arch-lich (chaotic, medium):  Level 24  HP 42(92)  AC -6, fast.", "アーチリッチの状態（混沌、中型）：レベル24 HP 42(92) AC -6、高速。"],
    ["Status of Kafujinho (piously lawful):  Level 14  HP 80(92)  AC -2, very fast, invisible.", "Kafujinhoの状態（敬虔な秩序）：レベル14 HP 80(92) AC -2、超高速、透明。"],
    ["Status of the long worm (unaligned, gigantic):  Level 9  HP 40(50)  AC 5, 2nd of 4 segments, asleep.", "長虫の状態（無属性、超巨大）：レベル9 HP 40(50) AC 5、全4節中2節目、眠っている。"],
    ["The arch-lich vanishes and reappears close by.", "アーチリッチは消えて、近くに再び現われた。"],
    ["2 jackals suddenly appear next to you!", "ジャッカル2匹が突然あなたの隣に現われた！"],
    ["The voice of Amaterasu Omikami thunders: \"Thou hast angered me.\"", "天照大神の声がとどろいた：「汝は私を怒らせた。」"],
  ])("translates %s", (english, japanese) => {
    expect(ja(english)).toBe(japanese);
  });
});

describe("NetHack 5 source messages with runtime pieces", () => {
  it.each([
    "Yecch!  Your face now has gunk on it!",
    "The jackal is crushed underneath the drawbridge.",
    "With great effort, you climb up the ladder.",
    "The newt jumps, nimbly evading your kick.",
    "Your other dagger also slips from your left hand.",
    "The python's grab attempt passes right through the ghost!",
    "Some oil spills onto the floor and gradually dissipates.",
    "The potion on the altar glows light blue for a moment.",
    "The water nymph tries to snatch your cloak but gives up.",
    "A bear trap closes on your pony's foot!",
    "You knock the gnome back with a powerful blow!",
    "Your candles' flames burn brightly!",
    "You stop.  Your little dog can't move out of a bear trap.",
    "You are being held, and cannot go up.",
    "There are several other objects here.",
  ])("leaves no English in %s", (english) => {
    const japanese = ja(english);
    expect(japanese).not.toBe(english);
    expect(japanese).not.toMatch(/[A-Za-z]{3,}/);
    expect(japanese).not.toMatch(/のの/);
  });
});
