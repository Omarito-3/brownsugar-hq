type TFunc = (key: string) => string;

const STATUS_KEYS = ["TODO", "IN_PROGRESS", "DONE"] as const;
const PRIORITY_KEYS = ["LOW", "MEDIUM", "HIGH"] as const;
const CATEGORY_KEYS = ["CONTRACT", "LICENSE", "TENDER", "INVOICE", "INSURANCE", "OTHER"] as const;

/** `t` is the root translation function (no namespace) — pass `useTranslations()`. */
export function taskStatusLabel(t: TFunc, status: string): string {
  return (STATUS_KEYS as readonly string[]).includes(status) ? t(`management.statuses.${status}`) : status;
}

export function taskPriorityLabel(t: TFunc, priority: string): string {
  return (PRIORITY_KEYS as readonly string[]).includes(priority)
    ? t(`management.priorities.${priority}`)
    : priority;
}

export function documentCategoryLabel(t: TFunc, category: string): string {
  return (CATEGORY_KEYS as readonly string[]).includes(category)
    ? t(`management.categories.${category}`)
    : category;
}
