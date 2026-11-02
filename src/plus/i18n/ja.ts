import { mergeTranslations, type LocaleOverrides } from "../../i18n/locale-helpers";
import type { TranslationDictionary } from "../../i18n/locales/en";

// Fork-maintained Japanese translations, merged on top of upstream's ja.ts.
// Keeping them here avoids merge conflicts when upstream updates ja.ts.
// Strings intentionally left identical to English (button glyphs, FPS, TAA,
// NetHack option syntax placeholders, symset names) are not listed.
const jaPlusTranslations: LocaleOverrides<TranslationDictionary> = {
  controller: {
    buttonLabels: {
      9: "スタート / メニュー",
      16: "ホーム",
    },
  },
  soundEffects: {
    byKey: {
      "thrown-weapon": "投擲武器",
    },
  },
  characterSheet: {
    commands: {
      technique: {
        label: "技",
      },
    },
  },
  plus: {
    clientOptions: {
      desktopMessageLogBackgroundOpacity: {
        label: "デスクトップメッセージログの背景不透明度",
        description:
          "値を下げると、枠付きデスクトップメッセージログの背後にあるダンジョンが透けて見えるようになります。",
      },
    },
    messageLog: {
      resizeHandle:
        "ドラッグしてメッセージログのサイズを変更します。ダブルクリックで既定のサイズに戻します。",
    },
    solidColorPicker: {
      selectedColor: (hex: string) => `選択中の色: ${hex}`,
      hint: "アトラス全体の上でカーソルを動かし、ピクセルをクリックして単色クロマキーの色を設定します。",
      done: "完了",
    },
    saves: {
      overwrite: "上書き",
    },
    statChanges: {
      experience: (delta: string) => `経験値 ${delta}`,
      experienceLevel: (level: number) => `経験レベル ${level}`,
    },
    contextActions: {
      pickup: "拾う",
      eat: "食べる",
      ascend: "上る (<)",
      descend: "下りる (>)",
      search: "探す",
      loot: "物色",
      open: "開ける",
      close: "閉める",
      quaff: "飲む",
      tip: "中身を出す",
      kick: "蹴る",
      throw: "投げる",
      technique: "技を使う",
      force: "こじ開ける",
      fire: "発射する",
      cast: "呪文を唱える",
      apply: "使う",
      info: "情報",
    },
    techniqueMenu: {
      name: "名前",
      level: "レベル",
      status: "状態",
      lvl: (level: number) => `Lv ${level}`,
      known: (count: number) => `習得 ${count}`,
      ready: (count: number) => `使用可能 ${count}`,
      active: (count: number) => `発動中 ${count}`,
    },
    tilesetLayouts: {
      slashem: "Slash'EM レイアウト",
      slashem40: "Slash'EM レイアウト（40 列）",
      slashem38: "Slash'EM レイアウト（38 列）",
      nethack343: "NetHack 3.4.3 レイアウト",
      unknown: "不明なレイアウト",
    },
    engine: {
      gameEnded: "ゲームが終了しました。",
      noRecentMessage: "再表示できる NetHack メッセージがありません。",
      enterTextPlaceholder: "テキストを入力",
      minimapLabel: "ダンジョンのミニマップ",
    },
    topScores: {
      title: "ハイスコア",
      closeLabel: "ハイスコアを閉じる",
      closeDetailLabel: "スコア詳細を閉じる",
      loadingLedger: "記録を読み込み中...",
      noScoresYet: "まだスコアがありません。",
      emptyLedger:
        "まだ記録に名を残した冒険者はいません。スコアが記録されるプレイを終えると、最初の記録が書き込まれます。",
      sortBy: "並べ替え",
      sortMenuLabel: "ハイスコアの並べ替え",
      sortOptions: {
        date: "日付",
        score: "スコア",
        depth: "深さ",
        turns: "ターン数",
        kills: "撃破数",
      },
      pointsShort: (points: string) => `${points} 点`,
      points: (points: string) => `${points} 点`,
      openRunBreakdown: "プレイの詳細を開く",
      pagination: (page: number, pageCount: number) => `${page} / ${pageCount} ページ`,
      previous: "前へ",
      next: "次へ",
      refresh: "更新",
      loadFailed: "ハイスコアを読み込めません。",
      summaryStats: {
        recordedRuns: "記録数",
        oneName: "記録された冒険者",
        manyNames: "記録された冒険者",
        bestScore: "最高スコア",
        latestEntry: "最新の記録",
        snapshots: "スナップショット",
        oneSnapshot: "最終状態を保存済み",
        manySnapshots: "最終状態を保存済み",
      },
      format: {
        none: "なし",
        unknownHero: "名もなき英雄",
        unclassifiedAdventurer: "職業不明の冒険者",
        depth: (level: string) => `地下 ${level} 階`,
        depthWithDeepest: (level: string, deepest: string) =>
          `地下 ${level} 階 / 最深 ${deepest} 階`,
        dungeonNumber: (dungeon: number) => `ダンジョン ${dungeon}`,
        unknownDepth: "深さ不明",
        archiveOnly: "記録のみ",
        causeInLocation: (cause: string, location: string) => `${location}にて: ${cause}`,
        recordedIn: (location: string) => `${location}で記録。`,
        recordedExpedition: "記録された冒険。",
        duration: (hours: number, minutes: number, seconds: number) =>
          hours > 0
            ? `${hours}時間${minutes}分${seconds}秒`
            : minutes > 0
              ? `${minutes}分${seconds}秒`
              : `${seconds}秒`,
        listSeparator: "、",
      },
      roles: {
        Arc: "考古学者",
        Bar: "蛮族",
        Cav: "原始人",
        Hea: "治療師",
        Kni: "騎士",
        Mon: "僧侶",
        Pri: "司祭",
        Ran: "レンジャー",
        Rog: "盗賊",
        Sam: "侍",
        Tou: "観光客",
        Val: "ワルキューレ",
        Wiz: "魔法使い",
      },
      races: {
        Dwa: "ドワーフ",
        Elf: "エルフ",
        Gno: "ノーム",
        Hum: "人間",
        Orc: "オーク",
      },
      genders: {
        Fem: "女性",
        F: "女性",
        Mal: "男性",
        M: "男性",
      },
      alignments: {
        Cha: "混沌",
        Law: "秩序",
        Neu: "中立",
        Unc: "無心",
      },
      conducts: {
        Foodless: "断食",
        Vegan: "完全菜食",
        Vegetarian: "菜食主義",
        Atheist: "無神論",
        Weaponless: "武器不使用",
        Pacifist: "平和主義",
        Illiterate: "非識字",
        Polypileless: "物体変化なし",
        Polyselfless: "自己変化なし",
        Wishless: "願いなし",
        "Artifact-wishless": "アーティファクトの願いなし",
        Genocideless: "虐殺なし",
      },
      achievements: {
        "Bell of Opening": "開放の鐘",
        "Entered Gehennom": "ゲヘナに到達",
        "Candelabrum of Invocation": "祈念の燭台",
        "Book of the Dead": "死者の書",
        Invocation: "儀式を完了",
        "Amulet of Yendor": "イェンダーの魔除け",
        "Entered Endgame": "最終試練に到達",
        "Reached Astral Plane": "天上界に到達",
        Ascended: "昇天",
        "Mines luckstone": "鉱山の幸運の石",
        "Finished Sokoban": "ソコバン制覇",
        "Killed Medusa": "メデューサ討伐",
        "Blindfolded roleplay": "盲目プレイ",
        "Nudist roleplay": "裸プレイ",
      },
      flags: {
        "Wizard/debug": "Wizard / デバッグ",
        Explore: "探検モード",
        "Bones disabled": "骨ファイル無効",
      },
      telemetryLabels: {
        "Pit trap": "落し穴",
        "Trap door": "落し扉",
        "Bear trap": "熊の罠",
        "Land mine": "地雷",
        "Rolling boulder trap": "巨岩の罠",
        "Dart trap": "投げ矢の罠",
        "Arrow trap": "矢の罠",
        "Teleport trap": "瞬間移動の罠",
        "Magic trap": "魔法の罠",
        "Anti-magic trap": "反魔法空間の罠",
        "Squeaky board": "きしむ板",
        "Web trap": "くもの巣",
        "Polymorph trap": "変化の罠",
        "Sleeping gas trap": "睡眠ガスの罠",
        "Rust trap": "腐食の罠",
        "Fire trap": "火の罠",
        "Ice trap": "氷の罠",
        "Trap triggered": "罠が作動",
        "Hidden door": "隠し扉",
        "Hidden passage": "隠し通路",
      },
      cardMetrics: {
        turns: "ターン",
        depth: "深さ",
        finalHp: "最終 HP",
        ended: "終了日",
      },
      overview: {
        adventurer: "冒険者",
        path: "職業",
        finalScore: "最終スコア",
        causeOfEnd: "最期",
        finalLocation: "最期の場所",
        turnsSurvived: "生存ターン数",
        realTime: "実時間",
        finalHp: "最終 HP",
        started: "開始",
        ended: "終了",
        stateAtDeath: "死亡時の状態",
      },
      adventure: {
        hitPoints: "HP",
        power: (value: string) => `魔力 ${value}`,
        armorClass: "AC",
        experience: "経験値",
        level: (value: string) => `レベル ${value}`,
        gold: "所持金",
        alignment: "属性",
        turn: "ターン",
        depth: "深さ",
        realTime: "実時間",
        deathsOnFile: "記録上の死亡回数",
      },
      attributes: {
        strength: "腕力",
        dexterity: "器用さ",
        constitution: "耐久力",
        intelligence: "知性",
        wisdom: "賢さ",
        charisma: "魅力",
      },
      challenges: {
        streaks: "達成中の縛り",
        noStreaks: "このプレイでは縛りの記録がありません。",
        milestones: "到達点",
        noMilestones: "このプレイでは到達点の記録がありません。",
        runRules: "プレイ条件",
        normal: "通常",
        moreLabels: (count: number) => `ほか ${count} 件`,
      },
      reports: {
        pack: "持ち物",
        killsByWeapon: "武器別の撃破数",
        noWeaponKills: "このプレイでは武器による撃破の記録がありません。",
        killsBySpell: "呪文別の撃破数",
        noSpellKills: "このプレイでは呪文による撃破の記録がありません。",
        killsByPet: "ペット別の撃破数",
        noPetKills: "このプレイではペットによる撃破の記録がありません。",
        finalAttributes: "最終能力",
        noFinalAttributes: "このプレイの最終能力レポートは保存されていません。",
        vanquished: "倒したモンスター",
        noVanquished: "このプレイの撃破レポートは保存されていません。",
        conduct: "縛り",
        noConduct: "このプレイの縛りレポートは保存されていません。",
        dungeonOverview: "ダンジョン概観",
        noDungeonOverview: "このプレイのダンジョン概観は保存されていません。",
        lineCount: (count: string) => `${count} 行`,
        notCaptured: "未記録",
      },
      timeline: {
        turn: (turn: string) => `${turn} ターン`,
        turnRange: (start: string, end: string) => `${start}〜${end} ターン`,
        moments: (count: string) => `${count} 件の出来事`,
        oneMarkedMoment: "1 件の出来事",
        markedMoments: (count: string) => `${count} 件の出来事`,
        hint: "線はプレイ中の各項目の推移を示します。密集した部分をタッチすると内訳を表示します。",
        axisTurns: "ターン",
        filterIntro: "重要な項目でプレイを絞り込みます。",
        noHistory: "このプレイは、ターンごとの履歴が記録される前に保存されました。",
        badges: {
          kill: "撃破",
          gold: "金貨",
          loot: "入手",
          location: "移動",
          level: "レベル",
          trap: "罠",
          escape: "脱出",
          hidden: "発見",
          search: "探索",
          spell: "呪文",
          ending: "最期",
          moment: "出来事",
        },
        meta: {
          goldAmount: (amount: string) => `金貨 ${amount}`,
          purse: (total: number) => `所持金 ${total}`,
          collected: (count: string) => `${count} 個入手`,
          levelDelta: (delta: string, _count: number) => `レベル ${delta}`,
          level: (level: number) => `レベル ${level}`,
        },
        lineSummary: {
          kills: (value: string) => `${value} 体撃破`,
          gold: (value: string) => `${value} 枚獲得`,
          loot: (value: string) => `${value} 個入手`,
          secrets: (value: string) => `${value} 件発見`,
          levels: (value: string) => `最高レベル ${value}`,
          hazards: (value: string) => `${value} 回発動`,
          magic: (value: string) => `${value} 個習得`,
          other: (value: string) => `${value} 件記録`,
        },
        filters: {
          kills: { label: "撃破", detail: "倒した敵" },
          gold: { label: "金貨", detail: "獲得した金貨" },
          loot: { label: "入手品", detail: "拾ったアイテム" },
          secrets: { label: "隠し発見", detail: "隠し扉、隠し通路、罠" },
          levels: { label: "レベル", detail: "キャラクターレベル" },
          hazards: { label: "危険", detail: "罠や災難" },
          magic: { label: "魔法", detail: "習得した呪文" },
          milestones: { label: "到達点", detail: "訪れた場所と最期" },
        },
        summary: {
          foesDefeated: "倒した敵",
          oneKill: "撃破記録",
          manyKills: "撃破記録",
          goldGathered: "獲得金貨",
          oneGold: "枚を拾得",
          manyGold: "枚を拾得",
          hiddenFinds: "隠し発見",
          oneHidden: "件の秘密を発見",
          manyHidden: "件の秘密を発見",
          lootCollected: "入手品",
          oneLoot: "個のアイテムを記録",
          manyLoot: "個のアイテムを記録",
          spellsLearned: "習得呪文",
          oneSpell: "個の呪文を習得",
          manySpells: "個の呪文を習得",
          trapsSprung: "発動した罠",
          oneTrap: "回の災難",
          manyTraps: "回の災難",
          placesReached: "訪れた場所",
          onePlace: "階層・支道を記録",
          manyPlaces: "階層・支道を記録",
          maxLevel: "最高レベル",
          peakLevel: "キャラクターの最高レベル",
        },
        events: {
          lootPickedUp: "アイテムを入手",
          itemsPickedUp: (count: string) => `アイテムを ${count} 個入手`,
          pickedUpItem: (label: string) => `${label}を拾った。`,
          pickedUpItems: (count: string, label: string) => `${label}を ${count} 個拾った。`,
          trapTriggered: (label: string) => `${label}が発動した。`,
          foundHidden: (label: string) => `${label}を見つけた。`,
          learnedSpell: (spell: string) => `${spell}を習得した。`,
          petDefeatedOne: "ペットが敵を倒した",
          petDefeatedMany: (count: string) => `ペットが敵を ${count} 体倒した`,
          namedDefeatedOne: (name: string) => `${name}が敵を倒した。`,
          namedDefeatedMany: (name: string, count: string) =>
            `${name}が敵を ${count} 体倒した。`,
          runEnded: "冒険の終わり",
          runEndedSummary: "冒険は終わった。",
          reachedNewDepth: "新しい階層に到達",
          reachedLocation: (location: string) => `${location}に到達した。`,
          goldGained: (amount: number) => `金貨 +${amount}`,
          pickedUpGold: (amount: number) => `金貨を ${amount} 枚拾った。`,
          levelLabel: (level: number) => `レベル ${level}`,
          reachedExperienceLevel: (level: number) => `経験レベル ${level} になった。`,
          slippedExperienceLevel: (level: number) => `経験レベルが ${level} に下がった。`,
          escaped: "脱出",
          enemyDefeated: "敵を撃破",
        },
      },
      sections: {
        runTimeline: "プレイの経過",
        runSummary: "プレイの概要",
        finalSnapshot: "最終状態",
        onlyScoreLine: "このプレイはスコア行の記録しかありません。",
        battleBreakdown: "戦闘の内訳",
        coreAttributes: "基本能力",
        noCoreAttributes: "このプレイの基本能力は記録されていません。",
        challengeLedger: "挑戦の記録",
        lootTrail: "入手品の履歴",
        packUpdate: "持ち物の更新",
        noLoot: "このプレイの入手品の履歴は保存されていません。",
        quantityTimes: (count: string, label: string) => `${label} ×${count}`,
        packAtEnd: "最期の持ち物",
        noInventory: "このプレイの持ち物は記録されていません。",
        postmortemArchives: "死後の記録",
        tombstone: "墓碑",
        noTombstone: "このプレイの墓碑は保存されていません。",
      },
    },
    trialMode: {
      playModeOption: "試行錯誤",
      saveChip: "試行錯誤",
      saveToSlot: "スロットにセーブ……",
      loadFromSlot: "スロットからロード……",
      emptySlot: (slot: number) => `スロット${slot}：空き`,
      filledSlot: (slot: number, detail: string) => `スロット${slot}：${detail}`,
      slotDepth: (dlevel: number) => `地下${dlevel}階`,
      slotTurn: (turn: number) => `${turn}ターン`,
      autoSnapshot: (detail: string) => `自動：${detail}`,
      saving: "スロットにセーブ中……",
      loading: "スロットからロード中……",
    },
  },
  app: {
    clientOptions: {
      config: {
        asciiColorMode: {
          options: {
            terminal: "ターミナル",
          },
        },
        animatedMovement: {
          label: "移動アニメーション",
          description:
            "タイルモードと 3D ASCII モードで、プレイヤーや他のクリーチャーがマス間を移動する様子をアニメーション表示します。ターミナル表示モードでは常に即座に更新されます。",
        },
        minimapColorMode: {
          label: "ミニマップの色",
          description:
            "NetHack 3D の意味別パレットか、NetHack のターミナル色を選択します。",
          options: {
            terminal: "ターミナル",
          },
        },
        sectionCombatBlood: "流血エフェクト",
        bloodStrength: {
          label: "血の濃さ",
          description: "血のテクスチャと色付けの強さを調整します。",
        },
        bloodDetail: {
          label: "血の解像度",
          description: "ダンジョン 1 マスあたりの血しぶきテクスチャの解像度を選択します。",
          options: {
            low: "低",
            medium: "中",
            high: "高",
          },
        },
        bloodColorLightHex: {
          label: "床の血の色（新しい血）",
          description: "床に飛び散った新しい血に使う明るめの色を選択します。",
        },
        bloodColorDarkHex: {
          label: "床の血の色（濃い部分）",
          description: "血が溜まった濃い部分に使う暗めの色を選択します。",
        },
        bloodMistColorHex: {
          label: "血霧の色",
          description: "空中に舞う血霧の基本色を選択します。",
        },
      },
    },
    saves: {
      loadExisting: "既存のセーブを読み込む",
    },
    dialogs: {
      tilesetManager: {
        tileSetPlaceholder: "マイタイルセット",
        weaponSpriteFlip: "一人称の武器スプライトを反転",
        weaponSpriteFlipDescription:
          "このタイルセットで、手に持つ武器のスプライトを左右反転します。既定で有効です。",
      },
      question: {
        amount: "数量",
        amountDefault: "既定",
        clearAmount: "数量をクリア",
        decreaseAmount: "数量を 1 減らす",
        increaseAmount: "数量を 1 増やす",
      },
    },
  },
};

// Terminology fixes for upstream ja.ts strings, aligned with JNetHack usage
// (e.g. 職業 for role, 探す for search, 探検 for explore mode).
const jaPlusTerminologyFixes: LocaleOverrides<TranslationDictionary> = {
  controller: {
    actions: {
      search: {
        label: "探す",
        description: "移動プレビューが無効のとき、現在のマスで隠されたものを探します。",
      },
      recenter_camera: {
        label: "カメラを中央に戻す",
      },
    },
  },
  startupInitOptions: {
    options: {
      playmode: {
        options: {
          explore: "探検",
        },
      },
      autoopen: {
        label: "ドアを自動で開ける",
      },
      legacy: {
        label: "冒頭の物語",
      },
      pettype: {
        description: "初期ペットを選べる職業で、優先する初期ペットです。",
      },
    },
  },
  characterSheet: {
    commands: {
      seespells: {
        detail: "呪文の一覧を表示",
      },
      technique: {
        detail: "職業 / 種族の能力を使う",
      },
    },
  },
  app: {
    saveTransfer: {
      imported: "インポートしました。「ゲームをロード」を選択してください。",
    },
    inventoryContextActions: {
      tip: "中身を出す",
      quiver: "矢筒に入れる",
    },
    update: {
      preparingDownload: "バージョン確認を準備中...",
    },
    clientOptions: {
      config: {
        displayStatChangesAbovePlayer: {
          description: "腕力や AC などの能力値変化を、浮かぶラベルで表示します。",
        },
      },
    },
    dialogs: {
      clientOptions: {
        updates: {
          idle: "「更新を確認」を押して、このビルドを GitHub リリースと比較してください。",
        },
      },
      tilesetManager: {
        uploadedDetails: (fileName: string, layout: string) =>
          `${fileName} | アップロード済み | レイアウト ${layout}`,
        builtInDetails: (path: string) => `${path} | 組み込み`,
      },
      startup: {
        role: "職業",
      },
      mobileActions: {
        search: "探す",
      },
    },
  },
};

export const jaPlusOverrides = mergeTranslations(
  jaPlusTranslations as TranslationDictionary,
  jaPlusTerminologyFixes,
) as LocaleOverrides<TranslationDictionary>;
