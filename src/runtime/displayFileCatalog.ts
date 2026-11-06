import cmdhelpText from "../../imported/nethack-3.6.7/dat/cmdhelp?raw";
import helpText from "../../imported/nethack-3.6.7/dat/help?raw";
import hhText from "../../imported/nethack-3.6.7/dat/hh?raw";
import historyText from "../../imported/nethack-3.6.7/dat/history?raw";
import keyhelpText from "../../imported/nethack-3.6.7/dat/keyhelp?raw";
import licenseText from "../../imported/nethack-3.6.7/dat/license?raw";
import opthelpText from "../../imported/nethack-3.6.7/dat/opthelp?raw";
import wizhelpText from "../../imported/nethack-3.6.7/dat/wizhelp?raw";
import portHelpText from "../../imported/nethack-3.6.7/sys/winnt/porthelp?raw";
import help5Text from "../../imported/nethack-5.0/dat/help?raw";
import hh5Text from "../../imported/nethack-5.0/dat/hh?raw";
import history5Text from "../../imported/nethack-5.0/dat/history?raw";
import keyhelp5Text from "../../imported/nethack-5.0/dat/keyhelp?raw";
import license5Text from "../../imported/nethack-5.0/dat/license?raw";
import opthelp5Text from "../../imported/nethack-5.0/dat/opthelp?raw";
import optmenu5Text from "../../imported/nethack-5.0/dat/optmenu?raw";
import usagehlp5Text from "../../imported/nethack-5.0/dat/usagehlp?raw";
import wizhelp5Text from "../../imported/nethack-5.0/dat/wizhelp?raw";

type DisplayFilePayload = {
  canonicalName: string;
  title: string;
  lines: string[];
};

type CatalogEntry = {
  title: string;
  text: string;
};

const catalog: Record<string, CatalogEntry> = {
  cmdhelp: {
    title: "Command Help",
    text: cmdhelpText,
  },
  help: {
    title: "NetHack Help",
    text: helpText,
  },
  hh: {
    title: "NetHack Help",
    text: hhText,
  },
  history: {
    title: "NetHack History",
    text: historyText,
  },
  keyhelp: {
    title: "Key Help",
    text: keyhelpText,
  },
  license: {
    title: "NetHack License",
    text: licenseText,
  },
  opthelp: {
    title: "Option Help",
    text: opthelpText,
  },
  wizhelp: {
    title: "Wizard Help",
    text: wizhelpText,
  },
  porthelp: {
    title: "Port Help",
    text: portHelpText,
  },
};

// NetHack 5.0 ships its own help files, and two the older versions do not have.
const catalog5: Record<string, CatalogEntry> = {
  help: { title: "NetHack Help", text: help5Text },
  hh: { title: "NetHack Help", text: hh5Text },
  history: { title: "NetHack History", text: history5Text },
  keyhelp: { title: "Key Help", text: keyhelp5Text },
  license: { title: "NetHack License", text: license5Text },
  opthelp: { title: "Option Help", text: opthelp5Text },
  optmenu: { title: "Option Menu Help", text: optmenu5Text },
  usagehlp: { title: "Command Line Help", text: usagehlp5Text },
  wizhelp: { title: "Wizard Help", text: wizhelp5Text },
};

const aliases: Record<string, string> = {
  shelp: "cmdhelp",
  help: "help",
  history: "history",
  keyhelp: "keyhelp",
  optionfile: "opthelp",
  wizhelp: "wizhelp",
  license: "license",
  port_help: "porthelp",
};

function normalizeDisplayFileName(nameLike: unknown): string {
  const raw = typeof nameLike === "string" ? nameLike : String(nameLike ?? "");
  return raw.trim().toLowerCase();
}

function normalizeDisplayFileLines(rawText: string): string[] {
  const normalizedText = String(rawText || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\f/g, "\n\n");
  const lines = normalizedText.split("\n").map((line) => line.trimEnd());

  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  return lines;
}

export function getBundledDisplayFile(
  fileName: unknown,
  runtimeVersion?: string,
): DisplayFilePayload | null {
  const normalizedName = normalizeDisplayFileName(fileName);
  if (!normalizedName) {
    return null;
  }

  const canonicalName = aliases[normalizedName] || normalizedName;
  const entry = (runtimeVersion === "5.0" ? catalog5[canonicalName] : undefined) ?? catalog[canonicalName];
  if (!entry) {
    return null;
  }

  return {
    canonicalName,
    title: entry.title,
    lines: normalizeDisplayFileLines(entry.text),
  };
}
