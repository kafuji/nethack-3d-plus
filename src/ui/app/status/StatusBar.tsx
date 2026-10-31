import {
  type CSSProperties
} from "react";
import type {
  PlayerStatsSnapshot
} from "../../../game/ui-types";
import type * as React from "react";
import type {
  CoreStatKey
} from "./core-stats";
import type {
  PlayerStatusBadge
} from "./conditions";
import { useI18n } from "../../../i18n";
import { translateGameLocation } from "../../../i18n/game-location";
import { translatePlayerTitle } from "../../../i18n/player-title";
import { translateStatusBadgeLabel } from "../../../i18n/status-text";

export interface StatusBarProps {
  startup: boolean;
  gameOverDialogShowsTombstone: boolean;
  playerStats: PlayerStatsSnapshot;
  hpPercentage: number;
  hpColor: "#00ff00" | "#ffaa00" | "#ff0000";
  powerPercentage: number;
  resolveCoreStatStyle: (key: CoreStatKey) => React.CSSProperties | undefined;
  playerStatusBadges: PlayerStatusBadge[];
  visibleLocationLabel: string;
}

export function StatusBar({
  startup,
  gameOverDialogShowsTombstone,
  playerStats,
  hpPercentage,
  hpColor,
  powerPercentage,
  resolveCoreStatStyle,
  playerStatusBadges,
  visibleLocationLabel,
}: StatusBarProps) {
  const { locale } = useI18n();
  return (
    !startup && !gameOverDialogShowsTombstone && (
      <div id="stats-bar">
        <div className="nh3d-stats-name">
          {translatePlayerTitle(playerStats.name, locale)}
          <span className="nh3d-stats-name-level">
            {" "}
            ({locale === "ja" ? "レベル" : "Lvl"} {playerStats.level})
          </span>
        </div>
        <div className="nh3d-stats-meter">
          <div className="nh3d-stats-meter-label nh3d-stats-meter-label-hp">
            HP: {playerStats.hp}/{playerStats.maxHp}
          </div>
          <div className="nh3d-stats-meter-track">
            <div
              className="nh3d-stats-meter-fill"
              style={{
                width: `${hpPercentage}%`,
                backgroundColor: hpColor,
              }}
            />
          </div>
        </div>
        {playerStats.maxPower > 0 ? (
          <div className="nh3d-stats-meter">
            <div className="nh3d-stats-meter-label nh3d-stats-meter-label-pw">
              {locale === "ja" ? "魔力" : "Pw"}: {playerStats.power}/{playerStats.maxPower}
            </div>
            <div className="nh3d-stats-meter-track">
              <div
                className="nh3d-stats-meter-fill nh3d-stats-meter-fill-pw"
                style={{ width: `${powerPercentage}%` }}
              />
            </div>
          </div>
        ) : null}
        <div className="nh3d-stats-group nh3d-stats-group-core">
          <div className="nh3d-stats-core-row nh3d-stats-core-row-primary">
            <div
              className="nh3d-stats-core"
              style={resolveCoreStatStyle("strength")}
              title={locale === "ja" ? "腕力" : undefined}
            >
              {locale === "ja" ? "腕" : "St"}:{playerStats.strength}
            </div>
            <div
              className="nh3d-stats-core"
              style={resolveCoreStatStyle("dexterity")}
              title={locale === "ja" ? "器用さ" : undefined}
            >
              {locale === "ja" ? "器" : "Dx"}:{playerStats.dexterity}
            </div>
            <div
              className="nh3d-stats-core"
              style={resolveCoreStatStyle("constitution")}
              title={locale === "ja" ? "耐久力" : undefined}
            >
              {locale === "ja" ? "耐" : "Co"}:{playerStats.constitution}
            </div>
            <div
              className="nh3d-stats-core"
              style={resolveCoreStatStyle("intelligence")}
              title={locale === "ja" ? "知性" : undefined}
            >
              {locale === "ja" ? "知" : "In"}:{playerStats.intelligence}
            </div>
            <div
              className="nh3d-stats-core"
              style={resolveCoreStatStyle("wisdom")}
              title={locale === "ja" ? "賢さ" : undefined}
            >
              {locale === "ja" ? "賢" : "Wi"}:{playerStats.wisdom}
            </div>
          </div>
          <div className="nh3d-stats-core-row nh3d-stats-core-row-secondary">
            <div
              className="nh3d-stats-core"
              style={resolveCoreStatStyle("charisma")}
              title={locale === "ja" ? "魅力" : undefined}
            >
              {locale === "ja" ? "魅" : "Ch"}:{playerStats.charisma}
            </div>
            <div
              className="nh3d-stats-secondary-ac nh3d-stats-mobile-inline-secondary"
              style={resolveCoreStatStyle("armor")}
            >
              AC:{playerStats.armor}
            </div>
            <div className="nh3d-stats-secondary-exp nh3d-stats-mobile-inline-secondary">
              {locale === "ja" ? "経験" : "Exp"}:{playerStats.experience}
            </div>
            <div className="nh3d-stats-secondary-time nh3d-stats-mobile-inline-secondary">
              {locale === "ja" ? "ターン" : "T"}:{playerStats.time}
            </div>
            <div className="nh3d-stats-secondary-gold nh3d-stats-mobile-inline-secondary">
              {locale === "ja" ? "金" : "$"}:{playerStats.gold}
            </div>
          </div>
        </div>
        <div className="nh3d-stats-group nh3d-stats-group-secondary">
          <div
            className="nh3d-stats-secondary-ac nh3d-stats-desktop-secondary"
            style={resolveCoreStatStyle("armor")}
          >
            AC:{playerStats.armor}
          </div>
          <div className="nh3d-stats-secondary-exp nh3d-stats-desktop-secondary">
            {locale === "ja" ? "経験" : "Exp"}:{playerStats.experience}
          </div>
          <div className="nh3d-stats-secondary-gold nh3d-stats-desktop-secondary">
            {locale === "ja" ? "金" : "$"}:{playerStats.gold}
          </div>
          <div className="nh3d-stats-secondary-time nh3d-stats-desktop-secondary">
            {locale === "ja" ? "ターン" : "T"}:{playerStats.time}
          </div>
          <div className="nh3d-stats-hunger nh3d-stats-desktop-secondary">
            <span className="nh3d-stats-status-list">
              {playerStatusBadges.map((status) => (
                <span
                  className={`nh3d-stats-status-badge is-${status.severity}`}
                  key={`desktop-status-${status.label}`}
                >
                  {translateStatusBadgeLabel(status.label, locale)}
                </span>
              ))}
            </span>
          </div>
        </div>
        <div className="nh3d-stats-location">
          <div className="nh3d-stats-dungeon">
            {translateGameLocation(visibleLocationLabel, locale)}
            {playerStatusBadges.length > 0 ? (
              <span className="nh3d-stats-mobile-location-status">
                <span className="nh3d-stats-status-list">
                  {playerStatusBadges.map((status) => (
                    <span
                      className={`nh3d-stats-status-badge is-${status.severity}`}
                      key={`mobile-status-${status.label}`}
                    >
                      {translateStatusBadgeLabel(status.label, locale)}
                    </span>
                  ))}
                </span>
              </span>
            ) : null}
          </div>
        </div>
      </div>
    )
  );
}
