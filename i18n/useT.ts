import { useLanguage } from './LanguageContext';
import { translations } from './translations';

type Translations = typeof translations;

export function useT() {
  const { lang } = useLanguage();

  function t<S extends keyof Translations>(
    section: S,
    key: keyof Translations[S],
    vars?: Record<string, string | number>
  ): string {
    const entry = translations[section][key] as unknown as { he: string; en: string };
    let str = entry ? entry[lang] : String(key);
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, String(v));
      });
    }
    return str;
  }

  return { t, lang };
}
