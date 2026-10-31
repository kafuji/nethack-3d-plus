import { useI18n } from "../../../i18n";
import { translateGamePrompt } from "../../../i18n/game-prompts";
import { presentGameMessage } from "../../../i18n/message-presentation";
import { GameMessageText } from "../messages/GameMessageText";

/** Render translated prose without modifying the prompt used for game input. */
export function GamePromptText({ prompt }: { prompt: string }): JSX.Element {
  const { locale } = useI18n();
  const curated = translateGamePrompt(prompt, locale);
  if (curated !== prompt || locale !== "ja") return <>{curated}</>;
  const suffix = /^(.*?)(\s+\[[a-zA-Z0-9?*#$,\-/ ]+\](?:\s+\([a-zA-Z0-9?*#]\))?)$/.exec(prompt);
  const text = suffix?.[1] ?? prompt;
  const presented = presentGameMessage(text, locale);
  if (presented.isReferenceTranslation) return <><GameMessageText message={text} />{suffix?.[2] ?? ""}</>;
  return <>{presented.text}{suffix?.[2] ?? ""}</>;
}
