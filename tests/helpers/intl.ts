/** `getTranslations` stand-in: every message is its own key. */
export async function getTranslations() {
  const t = (key: string) => key;
  return Object.assign(t, { rich: t, markup: t, raw: t, has: () => true });
}
