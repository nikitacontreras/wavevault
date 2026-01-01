import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import es from './locales/es.json';
import en from './locales/en.json';
import ko from './locales/ko.json';
import ru from './locales/ru.json';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: {
                translation: en
            },
            es: {
                translation: es
            },
            ko: {
                translation: ko
            },
            ru: {
                translation: ru
            }
        },
        fallbackLng: 'en',
        debug: false,
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
