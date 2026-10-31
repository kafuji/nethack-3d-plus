import {
  type CSSProperties
} from "react";
import type {
  Nh3dClientOptions
} from "../../../game/ui-types";
import type * as React from "react";
import type { FloatingMessage } from "../../../state/gameStore";
import { useI18n } from "../../../i18n";
import { presentGameMessage } from "../../../i18n/message-presentation";


export interface FloatingMessagesProps {
  clientOptions: Nh3dClientOptions;
  floatingMessages: FloatingMessage[];
  floatingMessageTextStyle: React.CSSProperties;
}

export function FloatingMessages({
  clientOptions,
  floatingMessages,
  floatingMessageTextStyle,
}: FloatingMessagesProps) {
  const { locale } = useI18n();
  return (
    <div
      className={
        clientOptions.tilesetMode === "terminal"
          ? "nh3d-floating-log-terminal"
          : undefined
      }
      id="floating-log-message-layer"
    >
      {floatingMessages.map((entry) => {
        const presented = presentGameMessage(entry.text, locale);
        return (
        <div
          className="floating-message-container"
          key={entry.id}
        >
          <div
            className="floating-message-text"
            style={floatingMessageTextStyle}
          >
            {presented.text}
            {presented.isReferenceTranslation ? (
              <span>（参考訳）</span>
            ) : null}
          </div>
        </div>
        );
      })}
    </div>
  );
}
