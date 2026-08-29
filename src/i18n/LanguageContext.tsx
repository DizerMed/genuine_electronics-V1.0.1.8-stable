import React, { createContext, useContext, useState, ReactNode } from 'react';
import en from './en';
import sw from './sw';

type Language = 'en' | 'sw';
type Dictionary = typeof en;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

const dictionaries = {
  en,
  sw
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string, replacements?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let translation: any = dictionaries[language];
    
    for (const k of keys) {
      if (translation && translation[k]) {
        translation = translation[k];
      } else {
        // Fallback to English if key is missing in Swahili
        let fallback: any = dictionaries['en'];
        for (const fbK of keys) {
            if (fallback && fallback[fbK]) fallback = fallback[fbK];
            else return key;
        }
        translation = fallback;
        break;
      }
    }

    if (typeof translation === 'string' && replacements) {
      let result = translation;
      Object.keys(replacements).forEach((k) => {
        result = result.replace(`{{${k}}}`, String(replacements[k]));
      });
      return result;
    }

    return typeof translation === 'string' ? translation : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
