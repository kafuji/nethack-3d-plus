import { useI18n } from "../../../i18n";
import { presentGameMessage } from "../../../i18n/message-presentation";

/** Unreviewed external translations expose the original on click or tap. */
export function GameMessageText({ message }: { message: string }): JSX.Element {
  const { locale } = useI18n();
  const presented = presentGameMessage(message, locale);
  if (!presented.isReferenceTranslation) return <>{presented.text}</>;
  return (
    <details className="nh3d-reference-message">
      <summary onClick={(event) => event.stopPropagation()} onKeyDown={(event) => {
        // A focused summary is not an input/button to the game keyboard
        // handler. Keep its activation and navigation keys out of gameplay.
        if (event.key !== "Escape" && event.key !== "Tab") event.stopPropagation();
      }}>
        {presented.text} <span className="nh3d-reference-message-label">参考訳・原文を見る</span>
      </summary>
      <span lang="en">{message}</span>
    </details>
  );
}
