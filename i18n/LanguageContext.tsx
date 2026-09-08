import React, { createContext, useContext, useState, useEffect } from 'react';

export type Lang = 'he' | 'en';

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  dir: 'rtl' | 'ltr';
  /** True once the participant has explicitly chosen a language for this session. */
  hasChosen: boolean;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'he',
  setLang: () => {},
  dir: 'rtl',
  hasChosen: false,
});

const STORAGE_KEY_LANG = 'comm_style_lang';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_LANG);
    return saved === 'en' || saved === 'he' ? saved : 'he';
  });
  const [hasChosen, setHasChosen] = useState<boolean>(() => !!localStorage.getItem(STORAGE_KEY_LANG));

  const setLang = (l: Lang) => {
    setLangState(l);
    setHasChosen(true);
    localStorage.setItem(STORAGE_KEY_LANG, l);
  };

  const dir: 'rtl' | 'ltr' = lang === 'he' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [lang, dir]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, dir, hasChosen }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
