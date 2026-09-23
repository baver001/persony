/** Map app locale to Web Speech API language tag. */
export function speechRecognitionLocale(appLocale: string): string {
  const base = appLocale.split('-')[0]?.toLowerCase();
  if (base === 'ru') return 'ru-RU';
  if (base === 'en') return 'en-US';
  return appLocale || 'en-US';
}
