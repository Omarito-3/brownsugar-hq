type TFunc = (key: string) => string;

const POSITION_KEYS = [
  "BARISTA",
  "CASHIER",
  "SHIFT_LEAD",
  "BRANCH_MANAGER",
  "CLEANER",
  "OTHER",
] as const;

const SHIFT_KEYS = ["MORNING", "EVENING", "FULL_DAY"] as const;

/** `t` is the root translation function (no namespace) — pass `useTranslations()`. */
export function positionLabel(t: TFunc, position: string): string {
  return (POSITION_KEYS as readonly string[]).includes(position)
    ? t(`employees.positions.${position}`)
    : position;
}

export function shiftLabel(t: TFunc, shift: string): string {
  return (SHIFT_KEYS as readonly string[]).includes(shift) ? t(`employees.shifts.${shift}`) : shift;
}
