import type { Nh3dClientOptions } from "../../game/ui-types";
import { useI18n } from "../../i18n";
import { translateGroundObject } from "../../i18n/game-ground";
import { useGameStore } from "../../state/gameStore";
import { plusStrings } from "../../ui/app/shared/translations";
import { usePlayerTileInfoStore } from "./player-tile-info";
import "./player-tile-info.scss";

const strings = plusStrings.playerTileInfo;
const maxListedItems = 8;

export interface PlayerTileInfoPanelProps {
  clientOptions: Nh3dClientOptions;
  mobileTouchUiVisible: boolean;
}

function stripArticle(text: string): string {
  return text.replace(/^(?:a|an|the) /, "");
}

/** Lower-right HUD card describing the hero's square while no prompt is open. */
export function PlayerTileInfoPanel({ clientOptions, mobileTouchUiVisible }: PlayerTileInfoPanelProps) {
  const { locale } = useI18n();
  const info = usePlayerTileInfoStore((state) => state.info);
  const promptOpen = useGameStore(
    (state) =>
      state.loadingVisible ||
      state.gameOver.active ||
      state.question !== null ||
      state.directionQuestion !== null ||
      state.infoMenu !== null ||
      state.textInput !== null ||
      state.positionRequest !== null ||
      state.inventory.visible,
  );
  if (!clientOptions.showPlayerTileInfo || !info.active || promptOpen) return null;

  const feature = info.featureText
    ? translateGroundObject(stripArticle(info.featureText), locale)
    : info.terrainId
      ? strings.terrain[info.terrainId]
      : null;
  const listedItems = info.items.slice(0, maxListedItems);
  const hiddenCount = info.items.length - listedItems.length;
  const hasObjectLine = info.items.length > 0 || info.pileSummary !== null || info.hasUnnamedObjects;
  if (!feature && !hasObjectLine && !info.engraving) return null;

  return (
    <aside
      aria-label={strings.panelLabel}
      className={`nh3d-player-tile-info${mobileTouchUiVisible ? " is-mobile" : ""}${
        clientOptions.tilesetMode === "terminal" ? " is-terminal" : ""
      }`}
    >
      {feature ? <div className="nh3d-player-tile-info-feature">{feature}</div> : null}
      {info.engraving !== null ? (
        <div className="nh3d-player-tile-info-engraving">{strings.engraving(info.engraving)}</div>
      ) : null}
      {listedItems.length > 0 ? (
        <ul className="nh3d-player-tile-info-items">
          {listedItems.map((item, index) => (
            <li key={`${index}:${item}`}>{translateGroundObject(item, locale)}</li>
          ))}
          {hiddenCount > 0 ? <li className="is-more">+{hiddenCount}</li> : null}
        </ul>
      ) : info.pileSummary !== null ? (
        <div className="nh3d-player-tile-info-note">{strings.pile(info.pileSummary)}</div>
      ) : info.hasUnnamedObjects ? (
        <div className="nh3d-player-tile-info-note">{strings.unnamedObjects}</div>
      ) : null}
      {info.itemsMayBeStale && info.items.length > 0 ? (
        <div className="nh3d-player-tile-info-stale">{strings.mayBeStale}</div>
      ) : null}
    </aside>
  );
}
