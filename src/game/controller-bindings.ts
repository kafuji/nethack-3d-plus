import { getTranslationStrings } from "../i18n/core";

export type Nh3dControllerBinding = string;

export type Nh3dControllerActionId =
  | "dpad_up"
  | "dpad_down"
  | "dpad_left"
  | "dpad_right"
  | "left_stick_up"
  | "left_stick_down"
  | "left_stick_left"
  | "left_stick_right"
  | "right_stick_up"
  | "right_stick_down"
  | "right_stick_left"
  | "right_stick_right"
  | "confirm"
  | "search"
  | "cancel_or_context"
  | "action_menu"
  | "zoom_in"
  | "toggle_large_minimap"
  | "pause_menu"
  | "open_inventory"
  | "open_character"
  | "run_modifier"
  | "recenter_camera";

export type Nh3dControllerBindingSlots = [
  Nh3dControllerBinding | null,
  Nh3dControllerBinding | null,
];

export type Nh3dControllerBindings = Record<
  Nh3dControllerActionId,
  Nh3dControllerBindingSlots
>;

export type Nh3dControllerActionSpec = {
  id: Nh3dControllerActionId;
  label: string;
  description: string;
  group: Nh3dControllerActionGroupId;
};

export type ParsedNh3dControllerBinding =
  | {
      kind: "button";
      index: number;
    }
  | {
      kind: "axis";
      index: number;
      direction: -1 | 1;
    };

const axisBindingPattern = /^axis:(\d+):([+-])$/i;
const buttonBindingPattern = /^button:(\d+)$/i;
const controllerStrings = getTranslationStrings().controller;

export type Nh3dControllerActionGroupId = keyof typeof controllerStrings.groups;

export const nh3dControllerActionGroupLabels: Record<
  Nh3dControllerActionGroupId,
  string
> = {
  movement: controllerStrings.groups.movement,
  lookAndCamera: controllerStrings.groups.lookAndCamera,
  actions: controllerStrings.groups.actions,
  dialogs: controllerStrings.groups.dialogs,
  system: controllerStrings.groups.system,
};

const controllerActionSpecs: readonly Nh3dControllerActionSpec[] = [
  {
    id: "dpad_up",
    label: controllerStrings.actions.dpad_up.label,
    description: controllerStrings.actions.dpad_up.description,
    group: "movement",
  },
  {
    id: "dpad_down",
    label: controllerStrings.actions.dpad_down.label,
    description: controllerStrings.actions.dpad_down.description,
    group: "movement",
  },
  {
    id: "dpad_left",
    label: controllerStrings.actions.dpad_left.label,
    description: controllerStrings.actions.dpad_left.description,
    group: "movement",
  },
  {
    id: "dpad_right",
    label: controllerStrings.actions.dpad_right.label,
    description: controllerStrings.actions.dpad_right.description,
    group: "movement",
  },
  {
    id: "left_stick_up",
    label: controllerStrings.actions.left_stick_up.label,
    description: controllerStrings.actions.left_stick_up.description,
    group: "movement",
  },
  {
    id: "left_stick_down",
    label: controllerStrings.actions.left_stick_down.label,
    description: controllerStrings.actions.left_stick_down.description,
    group: "movement",
  },
  {
    id: "left_stick_left",
    label: controllerStrings.actions.left_stick_left.label,
    description: controllerStrings.actions.left_stick_left.description,
    group: "movement",
  },
  {
    id: "left_stick_right",
    label: controllerStrings.actions.left_stick_right.label,
    description: controllerStrings.actions.left_stick_right.description,
    group: "movement",
  },
  {
    id: "right_stick_up",
    label: controllerStrings.actions.right_stick_up.label,
    description: controllerStrings.actions.right_stick_up.description,
    group: "lookAndCamera",
  },
  {
    id: "right_stick_down",
    label: controllerStrings.actions.right_stick_down.label,
    description: controllerStrings.actions.right_stick_down.description,
    group: "lookAndCamera",
  },
  {
    id: "right_stick_left",
    label: controllerStrings.actions.right_stick_left.label,
    description: controllerStrings.actions.right_stick_left.description,
    group: "lookAndCamera",
  },
  {
    id: "right_stick_right",
    label: controllerStrings.actions.right_stick_right.label,
    description: controllerStrings.actions.right_stick_right.description,
    group: "lookAndCamera",
  },
  {
    id: "confirm",
    label: controllerStrings.actions.confirm.label,
    description: controllerStrings.actions.confirm.description,
    group: "actions",
  },
  {
    id: "search",
    label: controllerStrings.actions.search.label,
    description: controllerStrings.actions.search.description,
    group: "actions",
  },
  {
    id: "cancel_or_context",
    label: controllerStrings.actions.cancel_or_context.label,
    description: controllerStrings.actions.cancel_or_context.description,
    group: "actions",
  },
  {
    id: "action_menu",
    label: controllerStrings.actions.action_menu.label,
    description: controllerStrings.actions.action_menu.description,
    group: "actions",
  },
  {
    id: "run_modifier",
    label: controllerStrings.actions.run_modifier.label,
    description: controllerStrings.actions.run_modifier.description,
    group: "actions",
  },
  {
    id: "zoom_in",
    label: controllerStrings.actions.zoom_in.label,
    description: controllerStrings.actions.zoom_in.description,
    group: "lookAndCamera",
  },
  {
    id: "recenter_camera",
    label: controllerStrings.actions.recenter_camera.label,
    description: controllerStrings.actions.recenter_camera.description,
    group: "lookAndCamera",
  },
  {
    id: "toggle_large_minimap",
    label: controllerStrings.actions.toggle_large_minimap.label,
    description: controllerStrings.actions.toggle_large_minimap.description,
    group: "system",
  },
  {
    id: "pause_menu",
    label: controllerStrings.actions.pause_menu.label,
    description: controllerStrings.actions.pause_menu.description,
    group: "system",
  },
  {
    id: "open_inventory",
    label: controllerStrings.actions.open_inventory.label,
    description: controllerStrings.actions.open_inventory.description,
    group: "dialogs",
  },
  {
    id: "open_character",
    label: controllerStrings.actions.open_character.label,
    description: controllerStrings.actions.open_character.description,
    group: "dialogs",
  },
];

export const nh3dControllerActionSpecsByGroup: Record<
  Nh3dControllerActionGroupId,
  readonly Nh3dControllerActionSpec[]
> = {
  movement: controllerActionSpecs.filter((spec) => spec.group === "movement"),
  lookAndCamera: controllerActionSpecs.filter(
    (spec) => spec.group === "lookAndCamera",
  ),
  actions: controllerActionSpecs.filter((spec) => spec.group === "actions"),
  dialogs: controllerActionSpecs.filter((spec) => spec.group === "dialogs"),
  system: controllerActionSpecs.filter((spec) => spec.group === "system"),
};

export const nh3dControllerActionSpecs = controllerActionSpecs;

function createBindingSlots(
  primary: Nh3dControllerBinding | null,
  secondary: Nh3dControllerBinding | null = null,
): Nh3dControllerBindingSlots {
  return [primary, secondary];
}

export function createButtonBinding(index: number): Nh3dControllerBinding {
  return `button:${Math.max(0, Math.trunc(index))}`;
}

export function createAxisBinding(
  index: number,
  direction: -1 | 1,
): Nh3dControllerBinding {
  return `axis:${Math.max(0, Math.trunc(index))}:${direction < 0 ? "-" : "+"}`;
}

export const defaultNh3dControllerBindings: Nh3dControllerBindings = {
  dpad_up: createBindingSlots(createButtonBinding(12)),
  dpad_down: createBindingSlots(createButtonBinding(13)),
  dpad_left: createBindingSlots(createButtonBinding(14)),
  dpad_right: createBindingSlots(createButtonBinding(15)),
  left_stick_up: createBindingSlots(createAxisBinding(1, -1)),
  left_stick_down: createBindingSlots(createAxisBinding(1, 1)),
  left_stick_left: createBindingSlots(createAxisBinding(0, -1)),
  left_stick_right: createBindingSlots(createAxisBinding(0, 1)),
  right_stick_up: createBindingSlots(createAxisBinding(3, -1)),
  right_stick_down: createBindingSlots(createAxisBinding(3, 1)),
  right_stick_left: createBindingSlots(createAxisBinding(2, -1)),
  right_stick_right: createBindingSlots(createAxisBinding(2, 1)),
  confirm: createBindingSlots(createButtonBinding(0), createButtonBinding(7)),
  search: createBindingSlots(createButtonBinding(2)),
  cancel_or_context: createBindingSlots(createButtonBinding(1)),
  action_menu: createBindingSlots(createButtonBinding(4)),
  zoom_in: createBindingSlots(createButtonBinding(5)),
  toggle_large_minimap: createBindingSlots(createButtonBinding(11)),
  pause_menu: createBindingSlots(createButtonBinding(9)),
  open_inventory: createBindingSlots(createButtonBinding(3)),
  open_character: createBindingSlots(createButtonBinding(8)),
  run_modifier: createBindingSlots(createButtonBinding(6)),
  recenter_camera: createBindingSlots(null),
};

export function parseNh3dControllerBinding(
  rawValue: unknown,
): ParsedNh3dControllerBinding | null {
  const value = String(rawValue || "").trim();
  if (!value) {
    return null;
  }
  const buttonMatch = value.match(buttonBindingPattern);
  if (buttonMatch) {
    const parsedIndex = Number.parseInt(buttonMatch[1], 10);
    if (!Number.isFinite(parsedIndex) || parsedIndex < 0) {
      return null;
    }
    return {
      kind: "button",
      index: Math.trunc(parsedIndex),
    };
  }
  const axisMatch = value.match(axisBindingPattern);
  if (axisMatch) {
    const parsedIndex = Number.parseInt(axisMatch[1], 10);
    if (!Number.isFinite(parsedIndex) || parsedIndex < 0) {
      return null;
    }
    return {
      kind: "axis",
      index: Math.trunc(parsedIndex),
      direction: axisMatch[2] === "-" ? -1 : 1,
    };
  }
  return null;
}

function normalizeBindingSlot(
  rawValue: unknown,
  fallback: Nh3dControllerBinding | null,
): Nh3dControllerBinding | null {
  // An explicit null represents a cleared slot. Missing values still inherit
  // defaults for settings saved before a binding was introduced.
  if (rawValue === null) {
    return null;
  }
  if (rawValue === undefined) {
    return fallback;
  }
  const parsed = parseNh3dControllerBinding(rawValue);
  if (!parsed) {
    return fallback;
  }
  return parsed.kind === "button"
    ? createButtonBinding(parsed.index)
    : createAxisBinding(parsed.index, parsed.direction);
}

function normalizeBindingSlots(
  rawValue: unknown,
  fallback: Nh3dControllerBindingSlots,
): Nh3dControllerBindingSlots {
  const firstFallback = fallback[0] ?? null;
  const secondFallback = fallback[1] ?? null;
  if (Array.isArray(rawValue)) {
    const first = normalizeBindingSlot(rawValue[0], firstFallback);
    const second = normalizeBindingSlot(rawValue[1], secondFallback);
    if (first && second && first === second) {
      return [first, null];
    }
    return [first, second];
  }
  if (typeof rawValue === "string") {
    const normalized = normalizeBindingSlot(rawValue, firstFallback);
    if (normalized && normalized === secondFallback) {
      return [normalized, null];
    }
    return [normalized, secondFallback];
  }
  return [firstFallback, secondFallback];
}

export function normalizeNh3dControllerBindings(
  rawValue: unknown,
): Nh3dControllerBindings {
  const source =
    rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)
      ? (rawValue as Partial<Record<Nh3dControllerActionId, unknown>>)
      : {};
  const normalized = {} as Nh3dControllerBindings;
  for (const spec of controllerActionSpecs) {
    normalized[spec.id] = normalizeBindingSlots(
      source[spec.id],
      defaultNh3dControllerBindings[spec.id],
    );
  }
  return normalized;
}

const buttonLabelByIndex: Record<number, string> = {
  0: controllerStrings.buttonLabels[0],
  1: controllerStrings.buttonLabels[1],
  2: controllerStrings.buttonLabels[2],
  3: controllerStrings.buttonLabels[3],
  4: controllerStrings.buttonLabels[4],
  5: controllerStrings.buttonLabels[5],
  6: controllerStrings.buttonLabels[6],
  7: controllerStrings.buttonLabels[7],
  8: controllerStrings.buttonLabels[8],
  9: controllerStrings.buttonLabels[9],
  10: controllerStrings.buttonLabels[10],
  11: controllerStrings.buttonLabels[11],
  12: controllerStrings.buttonLabels[12],
  13: controllerStrings.buttonLabels[13],
  14: controllerStrings.buttonLabels[14],
  15: controllerStrings.buttonLabels[15],
  16: controllerStrings.buttonLabels[16],
};

const axisLabelByIndex: Record<number, string> = {
  0: controllerStrings.axisLabels[0],
  1: controllerStrings.axisLabels[1],
  2: controllerStrings.axisLabels[2],
  3: controllerStrings.axisLabels[3],
};

function formatAxisDirectionLabel(
  axisIndex: number,
  direction: -1 | 1,
): string {
  if (axisIndex === 0) {
    return direction < 0
      ? controllerStrings.directions.leftStickLeft
      : controllerStrings.directions.leftStickRight;
  }
  if (axisIndex === 1) {
    return direction < 0
      ? controllerStrings.directions.leftStickUp
      : controllerStrings.directions.leftStickDown;
  }
  if (axisIndex === 2) {
    return direction < 0
      ? controllerStrings.directions.rightStickLeft
      : controllerStrings.directions.rightStickRight;
  }
  if (axisIndex === 3) {
    return direction < 0
      ? controllerStrings.directions.rightStickUp
      : controllerStrings.directions.rightStickDown;
  }
  const axisLabel =
    axisLabelByIndex[axisIndex] ?? controllerStrings.axisFallback(axisIndex);
  return `${axisLabel} ${direction < 0 ? "-" : "+"}`;
}

export function formatNh3dControllerBindingLabel(
  binding: Nh3dControllerBinding | null | undefined,
): string {
  if (!binding) {
    return controllerStrings.unbound;
  }
  const parsed = parseNh3dControllerBinding(binding);
  if (!parsed) {
    return controllerStrings.unbound;
  }
  if (parsed.kind === "button") {
    return (
      buttonLabelByIndex[parsed.index] ??
      controllerStrings.buttonFallback(parsed.index)
    );
  }
  return formatAxisDirectionLabel(parsed.index, parsed.direction);
}
