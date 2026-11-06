// Plays NetHack 5 headlessly in debug mode and records every string the game
// shows, so the audit sees finished sentences rather than source fragments.
// Usage: node scripts/i18n/play-bot.mjs <out.json> [--first-seed 1] [--steps 3000] [--normal]
// Run one seed per process: a second game in one process breaks Asyncify.
// --normal plays as an ordinary character, without debug mode's extra commands and output.
// Pass the result to src/i18n/played-text-coverage.test.ts.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

const argv = process.argv.slice(2);
const outFile = argv[0];
const option = (name, fallback) => {
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? Number(argv[index + 1]) : fallback;
};
const seeds = option("seeds", 3);
const steps = option("steps", 3000);
const firstSeed = option("first-seed", 1);
const debugMode = !argv.includes("--normal");
const publicDir = path.resolve("public");
const roles = ["arc", "bar", "cav", "hea", "kni", "mon", "pri", "rog", "ran", "sam", "tou", "val", "wiz"];

// Commands a player reaches for. Debug commands drive the game into states
// ordinary random play rarely reaches.
const movement = [..."hjklyubn"];
const ctrl = (letter) => String.fromCharCode(letter.charCodeAt(0) & 0x1f);
const commands = [
  ...movement, ...movement, ...movement, ...movement, ",", ":", "s", "s", "i", "e", "d", "a", "r", "q", "z", "Z", "w", "W", "T", "P", "R", "t", "f", "x", "o", "c",
  "D", "E", "F", "A", "p", ">", "<", "_", "^", "\\", "`", "#", "X", "@", "O", "m",
  ctrl("X"), ctrl("T"), ctrl("D"), ctrl("O"), ctrl("A"),
  ...(debugMode ? [ctrl("F"), ctrl("V"), ctrl("G"), ctrl("I"), ctrl("W"), ctrl("W"), ctrl("W"), ctrl("E")] : []),
];
// Wishes that open up further messages when used.
const wishes = [
  "blessed wand of wishing", "2 blessed scrolls of genocide", "blessed magic marker", "stethoscope", "blessed amulet of life saving", "cursed amulet of strangulation",
  "wand of digging", "wand of sleep", "wand of fire", "wand of cold", "wand of lightning", "wand of polymorph", "wand of teleportation", "wand of create monster", "wand of cancellation",
  "wand of death", "wand of striking", "wand of slow monster", "wand of speed monster", "wand of opening", "wand of locking", "wand of undead turning", "wand of enlightenment",
  "scroll of fire", "scroll of teleportation", "scroll of gold detection", "scroll of remove curse", "scroll of enchant armor", "scroll of enchant weapon", "scroll of destroy armor", "scroll of confuse monster", "scroll of scare monster", "scroll of punishment", "scroll of stinking cloud", "scroll of earth", "scroll of taming", "scroll of amnesia", "scroll of create monster", "scroll of food detection", "scroll of identify", "scroll of light", "scroll of mail", "scroll of charging",
  "potion of acid", "potion of blindness", "potion of booze", "potion of confusion", "potion of enlightenment", "potion of extra healing", "potion of fruit juice", "potion of gain ability", "potion of gain energy", "potion of gain level", "potion of hallucination", "potion of healing", "potion of invisibility", "potion of levitation", "potion of monster detection", "potion of object detection", "potion of oil", "potion of paralysis", "potion of polymorph", "potion of restore ability", "potion of see invisible", "potion of sickness", "potion of sleeping", "potion of speed", "potion of water",
  "ring of conflict", "ring of hunger", "ring of levitation", "ring of polymorph", "ring of teleportation", "ring of aggravate monster", "ring of free action", "ring of slow digestion",
  "gray dragon scale mail", "black dragon scales", "cloak of displacement", "cloak of invisibility", "speed boots", "levitation boots", "fumbling boots", "gauntlets of power", "helm of brilliance", "helm of opposite alignment", "crystal plate mail", "shield of reflection", "grappling hook", "bullwhip", "pick-axe", "unicorn horn", "towel", "blindfold", "tin whistle", "magic whistle", "wooden flute", "magic flute", "tooled horn", "frost horn", "fire horn", "horn of plenty", "wooden harp", "magic harp", "leather drum", "drum of earthquake", "bugle", "bell", "expensive camera", "mirror", "crystal ball", "lock pick", "skeleton key", "credit card", "tin opener", "can of grease", "figurine of a lichen", "beartrap", "land mine", "leash", "saddle", "tinning kit", "oil lamp", "magic lamp", "brass lantern", "7 wax candles", "candelabrum", "bag of holding", "bag of tricks", "oilskin sack", "ice box", "large box", "chest", "sack",
  "cockatrice corpse", "lichen corpse", "newt corpse", "lump of royal jelly", "fortune cookie", "tin", "egg", "cream pie", "tripe ration", "apple", "carrot", "spinach", "T-shirt", "Hawaiian shirt", "alchemy smock", "luckstone", "loadstone", "touchstone", "boulder", "statue of a knight", "heavy iron ball", "iron chain", "Excalibur", "Sting", "Mjollnir", "Stormbringer", "Grayswandir", "Magicbane",
  "spellbook of force bolt", "spellbook of sleep", "spellbook of fireball", "spellbook of dig", "spellbook of finger of death", "spellbook of blank paper", "Amulet of Yendor", "cheap plastic imitation of the Amulet of Yendor",
];
const monsters = [
  "cockatrice", "floating eye", "nymph", "water nymph", "leprechaun", "gelatinous cube", "mind flayer", "master mind flayer", "vampire", "werewolf", "incubus", "succubus", "shopkeeper", "priest", "watchman", "soldier", "lich", "purple worm", "trapper", "lurker above", "mimic", "giant mimic", "rust monster", "disenchanter", "black dragon", "red dragon", "silver dragon", "medusa", "archon", "ki-rin", "couatl", "aleax", "balrog", "pit fiend", "jabberwock", "ettin", "titan", "minotaur", "gremlin", "green slime", "yellow light", "black light", "gas spore", "flaming sphere", "freezing sphere", "shocking sphere", "energy vortex", "fog cloud", "stalker", "xorn", "earth elemental", "fire elemental", "air elemental", "water elemental", "ghost", "shade", "kraken", "electric eel", "giant eel", "unicorn", "white unicorn", "gray unicorn", "black unicorn", "horse", "pony", "kitten", "little dog", "oracle", "aligned cleric", "nurse", "chameleon", "doppelganger", "sandestin", "golem", "iron golem", "flesh golem", "orc shaman", "kobold shaman", "gnome lord", "dwarf", "bugbear", "quantum mechanic", "giant zombie", "ettin zombie", "mummy", "skeleton",
];
const wishTopics = () => [...wishes];

async function play(seed) {
  const seen = new Map();
  const record = (kind, text) => {
    if (typeof text !== "string") return;
    const value = text.replace(/\s+$/, "");
    if (!value.trim()) return;
    const key = `${kind}\t${value}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  };
  let rngState = seed * 2654435761 % 4294967296;
  const random = (limit) => {
    rngState = (rngState * 1664525 + 1013904223) % 4294967296;
    return Math.floor((rngState / 4294967296) * limit);
  };
  const pick = (list) => list[random(list.length)];

  let budget = steps;
  let finish;
  const finished = new Promise((resolve) => { finish = resolve; });
  const stop = () => finish();
  let mod;
  const pendingKeys = [];
  const nextKey = () => {
    if (pendingKeys.length) return pendingKeys.shift();
    budget--;
    if (budget <= 0) stop();
    return pick(commands);
  };
  const toCode = (key) => (typeof key === "number" ? key : key.charCodeAt(0));
  let menu = [];
  const windows = new Map();

  globalThis.nethackGlobal = globalThis.nethackGlobal ?? { helpers: {}, constants: {}, globals: {}, pointers: {} };
  const wait = () => {
    budget--;
    if (budget < -steps) stop();
    return new Promise((resolve) => setImmediate(resolve));
  };
  // The game ends without telling the window port, so stop when it goes quiet.
  let lastCallback = Date.now();
  const watchdog = setInterval(() => { if (Date.now() - lastCallback > 1500) stop(); }, 300);
  finished.then(() => clearInterval(watchdog));
  globalThis.nethackCallback = async (name, ...args) => {
    lastCallback = Date.now();
    switch (name) {
      case "shim_putstr": {
        const [win, , text] = args;
        record(windows.get(win) === "message" ? "message" : "text", text);
        // getpos() takes the same keys as play, so answer it before it eats them.
        if (/Where do you|Move cursor|Pick an? |Pick the|desired|For instructions/.test(text ?? "")) pendingKeys.push(random(2) ? "." : pick(movement), ".");
        return 0;
      }
      case "shim_raw_print": case "shim_raw_print_bold": record("text", args[0]); return 0;
      case "shim_create_nhwindow": {
        const id = windows.size + 10;
        windows.set(id, args[0] === 1 ? "message" : "other");
        return id;
      }
      case "shim_start_menu": menu = []; return 0;
      case "shim_add_menu": {
        // win, glyphinfo, identifier, accelerator, groupacc, attr, clr, text, itemflags
        const text = args.find((value) => typeof value === "string" && value.length > 1);
        record(Number(args[2]) === 0 ? "menu-heading" : "menu", text);
        menu.push({ identifier: args[2], accelerator: args[3] });
        return 0;
      }
      case "shim_end_menu": record("menu-title", args[1]); return 0;
      case "shim_select_menu": {
        const [, how, listPointer] = args;
        await wait();
        const selectable = menu.filter((row) => Number(row.identifier) !== 0);
        if (how === 0 || selectable.length === 0 || random(4) === 0) {
          if (listPointer) mod.setValue(listPointer, 0, "*");
          return how === 0 ? 0 : -1;
        }
        // menu_item in NetHack 5: { anything item (8 bytes), long count, unsigned itemflags }.
        const out = mod._malloc(16);
        for (let offset = 0; offset < 16; offset += 4) mod.setValue(out + offset, 0, "i32");
        mod.setValue(out, Number(pick(selectable).identifier), "i32");
        mod.setValue(out + 8, -1, "i32");
        mod.setValue(listPointer, out, "*");
        return 1;
      }
      case "shim_yn_function": {
        const [question, choices, fallback] = args;
        record("question", question);
        await wait();
        if (/Die\?|Really quit|Really save|Save bones|Force the gods|really attack/i.test(question ?? "")) return toCode("n");
        if (/Still climb|Dump core|overwrite/i.test(question ?? "")) return toCode("n");
        if (/^Do you want (?:your|to see)/.test(question ?? "")) return toCode("y");
        if (typeof choices === "string" && choices.length > 0) {
          const letters = choices.replace(/\u001b.*$/s, "").replace(/[^!-~]/g, "");
          if (letters.length) return toCode(pick([...letters]));
        }
        return random(4) === 0 ? 27 : toCode(pick(["y", "n", ...movement, ".", "a", "b", "c", "d", "e", "f", "g"]));
      }
      case "shim_getlin": {
        const [question, buffer] = args;
        record("question", question);
        await wait();
        let answer = "\u001b";
        if (/wish/i.test(question ?? "")) answer = pick(wishTopics());
        else if (/kind of monster|create|genocide|class of monsters|monster/i.test(question ?? "")) answer = pick(monsters);
        else if (/level/i.test(question ?? "")) answer = String(1 + random(50));
        else if (/name|call|annotation|engrave|write|type/i.test(question ?? "")) answer = random(2) ? "Elbereth" : "x";
        mod.stringToUTF8(answer, buffer, 200);
        return 0;
      }
      case "shim_nhgetch": { await wait(); return toCode(nextKey()); }
      case "shim_nh_poskey": { await wait(); return toCode(nextKey()); }
      case "shim_get_ext_cmd": { await wait(); return random(5) === 0 ? -1 : random(140); }
      case "shim_askname": return 0;
      case "shim_exit_nhwindows": record("text", args[0]); stop(); return 0;
      case "shim_outrip": return 0;
      case "shim_getmsghistory": return "";
      case "shim_get_color_string": return "";
      case "shim_player_selection_cb": return true;
      case "shim_status_update": {
        const [, value] = args;
        if (typeof value === "string") record("status", value);
        return 0;
      }
      default: return 0;
    }
  };

  const factory = (await import(pathToFileURL(path.join(publicDir, "nethack-5.js")).href)).default;
  const role = roles[seed % roles.length];
  mod = await factory({
    noInitialRun: true,
    locateFile: (file) => path.join(publicDir, file),
    wasmBinary: readFileSync(path.join(publicDir, "nethack-5.wasm")),
    print: () => {}, printErr: () => {},
    preRun: [(m) => {
      m.ENV.NETHACKOPTIONS = `${debugMode ? "name:wizard" : `name:Agent${seed}`},role:${role},${debugMode ? "playmode:debug," : ""}!autopickup,pettype:none,!legacy,!tutorial,!splash_screen,verbose,windowtype:shim`;
      m.ENV.HACKDIR = "/"; m.ENV.NETHACKDIR = "/";
    }],
    onExit: () => stop(), quit: () => stop(),
  });
  try { mod.FS.writeFile("/sysconf", "WIZARDS=*\nEXPLORERS=*\nCHECK_PLNAME=0\n"); } catch { /* optional */ }
  mod.cwrap("shim_graphics_set_callback", null, ["string"])("nethackCallback");
  const program = mod._malloc(16);
  mod.stringToUTF8("nethack", program, 16);
  const argvPtr = mod._malloc(8);
  mod.setValue(argvPtr, program, "*");
  mod.setValue(argvPtr + 4, 0, "*");
  try { mod._main(1, argvPtr); } catch (error) { record("error", String(error)); }
  await Promise.race([finished, new Promise((resolve) => setTimeout(resolve, option("seconds", 40) * 1000))]);
  return { seen, budget };
}

const all = existsSync(outFile) ? new Map(JSON.parse(readFileSync(outFile, "utf8"))) : new Map();
for (let seed = firstSeed; seed < firstSeed + seeds; seed++) {
  const { seen, budget } = await play(seed);
  for (const [key, count] of seen) all.set(key, (all.get(key) ?? 0) + count);
  console.log(`seed ${seed}: ${seen.size} distinct strings, ${budget} steps left, ${all.size} in total`);
  writeFileSync(outFile, JSON.stringify([...all]));
}
process.exit(0);
