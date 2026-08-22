type TFunc = (key: string) => string;

const UNIT_KEYS = ["KG", "G", "L", "ML", "PIECE", "PACK"] as const;
const MOVEMENT_TYPE_KEYS = [
  "PURCHASE",
  "CONSUMPTION",
  "WASTE",
  "TRANSFER",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "ADJUSTMENT",
] as const;
const DIRECTION_KEYS = ["INCREASE", "DECREASE"] as const;

/** `t` is the root translation function (no namespace) — pass `useTranslations()`. */
export function unitLabel(t: TFunc, unit: string): string {
  return (UNIT_KEYS as readonly string[]).includes(unit) ? t(`stock.units.${unit}`) : unit;
}

export function movementTypeLabel(t: TFunc, type: string): string {
  return (MOVEMENT_TYPE_KEYS as readonly string[]).includes(type) ? t(`stock.movementTypes.${type}`) : type;
}

export function adjustmentDirectionLabel(t: TFunc, direction: string): string {
  return (DIRECTION_KEYS as readonly string[]).includes(direction) ? t(`stock.directions.${direction}`) : direction;
}
