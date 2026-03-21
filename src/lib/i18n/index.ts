/* eslint-disable import/no-named-as-default-member -- using the configured i18next singleton intentionally */
import i18next from 'i18next'
import { useSyncExternalStore } from 'react'
import {
  initReactI18next,
  useTranslation as useI18nTranslation
} from 'react-i18next'
import { type Locale, format as dateFnsFormat } from 'date-fns'
import { uk as ukLocale } from 'date-fns/locale/uk'
import { getLocales } from 'expo-localization'
import { z } from 'zod'
import { uk as zodUk } from 'zod/locales'

import { storage } from '@/lib/storage'
import { en } from './en'
import { uk } from './uk'

// ── Types ────────────────────────────────────────────────────────────────────

export type AppLocale = 'en' | 'uk'
export type LocaleChoice = AppLocale | 'auto'

// ── Locale resolution ────────────────────────────────────────────────────────

function resolveDeviceLocale(): AppLocale {
  const lang = getLocales()[0]?.languageCode ?? 'en'
  return lang === 'uk' || lang === 'ru' ? 'uk' : 'en'
}

function resolveLocale(choice: LocaleChoice): AppLocale {
  return choice === 'auto' ? resolveDeviceLocale() : choice
}

// ── Persistence ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'app-locale'

function readStoredChoice(): LocaleChoice {
  const stored = storage.getString(STORAGE_KEY)
  if (stored === 'en' || stored === 'uk' || stored === 'auto') return stored
  return 'auto'
}

function writeStoredChoice(choice: LocaleChoice) {
  storage.set(STORAGE_KEY, choice)
}

// ── Zod locale sync ─────────────────────────────────────────────────────────

function syncZodLocale(locale: AppLocale) {
  z.config({
    localeError: locale === 'uk' ? zodUk().localeError : undefined
  })
}

// ── i18next initialization ──────────────────────────────────────────────────

let localeChoice: LocaleChoice = readStoredChoice()
const choiceListeners = new Set<() => void>()

i18next.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: {
    en: { translation: en },
    uk: { translation: uk }
  },
  lng: resolveLocale(localeChoice),
  fallbackLng: 'en',
  supportedLngs: ['en', 'uk'],
  interpolation: { escapeValue: false },
  react: { useSuspense: false }
})

syncZodLocale(i18next.language as AppLocale)
i18next.on('languageChanged', lng => syncZodLocale(lng as AppLocale))

// ── Public API ──────────────────────────────────────────────────────────────

/** Non-React access for utility functions without hooks. */
export const t: (typeof i18next)['t'] = i18next.t

export function setLocaleChoice(choice: LocaleChoice) {
  localeChoice = choice
  writeStoredChoice(choice)
  i18next.changeLanguage(resolveLocale(choice))
  choiceListeners.forEach(fn => fn())
}

function subscribeChoice(cb: () => void) {
  choiceListeners.add(cb)
  return () => choiceListeners.delete(cb)
}

function getChoice() {
  return localeChoice
}

export function useTranslation() {
  const { t, i18n } = useI18nTranslation()
  const choice = useSyncExternalStore(subscribeChoice, getChoice, getChoice)
  return { t, locale: i18n.language as AppLocale, choice, setLocaleChoice }
}

// ── Locale-aware date formatting ────────────────────────────────────────────

const DATE_LOCALES: Record<AppLocale, Locale | undefined> = {
  en: undefined,
  uk: ukLocale
}

/** Formats a date using the current app locale. */
export function formatDate(date: Date | number, formatStr: string): string {
  return dateFnsFormat(date, formatStr, {
    locale: DATE_LOCALES[i18next.language as AppLocale]
  })
}
