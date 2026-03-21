import { type AppLocale, useTranslation } from '@/lib/i18n'

// No 'auto' option — the landing page is a simple marketing site, browser locale detection isn't needed here
const LOCALES: { value: AppLocale; label: string; nativeName: string }[] = [
  { value: 'en', label: 'EN', nativeName: 'English' },
  { value: 'uk', label: 'UK', nativeName: 'Українська' }
]

export function WebLocalePicker() {
  const { locale, setLocaleChoice } = useTranslation()

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 24,
        zIndex: 50,
        display: 'flex',
        borderRadius: 999,
        backgroundColor: 'rgba(10, 14, 30, 0.55)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden'
      }}
    >
      {LOCALES.map(l => {
        const active = locale === l.value
        return (
          <button
            key={l.value}
            onClick={() => setLocaleChoice(l.value)}
            aria-label={l.nativeName}
            className={`landing-locale-btn ${active ? 'active' : ''}`}
            style={{
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.03em',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: active
                ? 'rgba(32, 138, 239, 0.25)'
                : 'transparent',
              color: active ? '#fff' : 'rgba(255, 255, 255, 0.45)'
            }}
          >
            {l.label}
          </button>
        )
      })}
    </div>
  )
}
