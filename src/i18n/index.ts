import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from './locales/en/common.json';
import enChat from './locales/en/chat.json';
import enMemory from './locales/en/memory.json';
import enSettings from './locales/en/settings.json';
import enPersonas from './locales/en/personas.json';
import enErrors from './locales/en/errors.json';
import enCall from './locales/en/call.json';
import ruCommon from './locales/ru/common.json';
import ruChat from './locales/ru/chat.json';
import ruMemory from './locales/ru/memory.json';
import ruSettings from './locales/ru/settings.json';
import ruPersonas from './locales/ru/personas.json';
import ruErrors from './locales/ru/errors.json';
import ruCall from './locales/ru/call.json';

const LOCALE_STORAGE_KEY = 'persony.preferred_locale';

export function getStoredLocale(): 'en' | 'ru' {
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  return stored === 'ru' ? 'ru' : 'en';
}

export function setStoredLocale(locale: 'en' | 'ru'): void {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

void i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: enCommon,
      chat: enChat,
      memory: enMemory,
      settings: enSettings,
      personas: enPersonas,
      errors: enErrors,
      call: enCall,
    },
    ru: {
      common: ruCommon,
      chat: ruChat,
      memory: ruMemory,
      settings: ruSettings,
      personas: ruPersonas,
      errors: ruErrors,
      call: ruCall,
    },
  },
  lng: getStoredLocale(),
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

export default i18n;
