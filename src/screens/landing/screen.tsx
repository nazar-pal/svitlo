import './landing.css'

import { type FormEvent, type ReactNode, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { z } from 'zod'

import { useTranslation } from '@/lib/i18n'

const CURRENT_YEAR = String(new Date().getFullYear())

const iconSrc: string = require('../../../assets/images/icon.png')
const appHomeLightSrc: string = require('../../../assets/images/app-home-light.png')
const appHomeDarkSrc: string = require('../../../assets/images/app-home-dark.png')
const appHomeRunningLightSrc: string = require('../../../assets/images/app-home-running-light.png')
const appHomeRunningDarkSrc: string = require('../../../assets/images/app-home-running-dark.png')
const appMembersLightSrc: string = require('../../../assets/images/app-members-light.png')
const appMembersDarkSrc: string = require('../../../assets/images/app-members-dark.png')

const FEATURES = [
  {
    icon: '\u26A1',
    titleKey: 'landing.feature1Title',
    descKey: 'landing.feature1Desc'
  },
  {
    icon: '\uD83D\uDD27',
    titleKey: 'landing.feature2Title',
    descKey: 'landing.feature2Desc'
  },
  {
    icon: '\u2728',
    titleKey: 'landing.feature3Title',
    descKey: 'landing.feature3Desc'
  },
  {
    icon: '\uD83D\uDC65',
    titleKey: 'landing.feature4Title',
    descKey: 'landing.feature4Desc'
  },
  {
    icon: '\uD83D\uDCF6',
    titleKey: 'landing.feature5Title',
    descKey: 'landing.feature5Desc'
  },
  {
    icon: '\u23F1\uFE0F',
    titleKey: 'landing.feature6Title',
    descKey: 'landing.feature6Desc'
  }
] as const

const STEPS = [
  { number: '1', titleKey: 'landing.step1Title', descKey: 'landing.step1Desc' },
  { number: '2', titleKey: 'landing.step2Title', descKey: 'landing.step2Desc' },
  { number: '3', titleKey: 'landing.step3Title', descKey: 'landing.step3Desc' }
] as const

const STATS = [
  {
    icon: '\uD83D\uDCF6',
    labelKey: 'landing.stat1Label',
    descKey: 'landing.stat1Desc'
  },
  {
    icon: '\u2728',
    labelKey: 'landing.stat2Label',
    descKey: 'landing.stat2Desc'
  },
  {
    icon: '\uD83D\uDC65',
    labelKey: 'landing.stat3Label',
    descKey: 'landing.stat3Desc'
  },
  {
    icon: '\u23F1',
    labelKey: 'landing.stat4Label',
    descKey: 'landing.stat4Desc'
  }
] as const

const USE_CASES = [
  {
    icon: '\uD83C\uDFD7\uFE0F',
    titleKey: 'landing.useCase1Title',
    descKey: 'landing.useCase1Desc'
  },
  {
    icon: '\uD83C\uDF3E',
    titleKey: 'landing.useCase2Title',
    descKey: 'landing.useCase2Desc'
  },
  {
    icon: '\uD83C\uDFE0',
    titleKey: 'landing.useCase3Title',
    descKey: 'landing.useCase3Desc'
  },
  {
    icon: '\uD83C\uDFAA',
    titleKey: 'landing.useCase4Title',
    descKey: 'landing.useCase4Desc'
  }
] as const

const fadeInUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const }
})

const emailSchema = z.email()

type FormState = 'idle' | 'submitting' | 'success' | 'error'
let waitlistSubmitted = false

function WaitlistForm({ variant }: { variant: 'hero' | 'cta' }) {
  const { t, locale } = useTranslation()
  const [state, setState] = useState<FormState>(() =>
    waitlistSubmitted ? 'success' : 'idle'
  )
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const email = inputRef.current?.value.trim() ?? ''

    if (!emailSchema.safeParse(email).success) {
      setError(t('landing.waitlistErrorInvalid'))
      setState('error')
      return
    }

    setState('submitting')
    setError('')

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale })
      })

      if (!res.ok) {
        if (res.status === 429) {
          setError(t('landing.waitlistErrorTooMany'))
          setState('error')
          return
        }
        throw new Error('request failed')
      }

      waitlistSubmitted = true
      setState('success')
    } catch {
      setError(t('landing.waitlistErrorGeneric'))
      setState('error')
    }
  }

  return (
    <div className="landing-waitlist">
      <AnimatePresence mode="wait">
        {state === 'success' ? (
          <motion.p
            key="success"
            className="landing-waitlist-success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            {t('landing.waitlistSuccess')}
          </motion.p>
        ) : (
          <motion.form
            key="form"
            className="landing-waitlist-form"
            onSubmit={handleSubmit}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <input
              ref={inputRef}
              type="email"
              autoComplete="email"
              aria-label={t('landing.emailPlaceholder')}
              aria-describedby={error ? `waitlist-error-${variant}` : undefined}
              placeholder={t('landing.emailPlaceholder')}
              className="landing-waitlist-input"
              disabled={state === 'submitting'}
              onInput={() => {
                if (state === 'error') {
                  setState('idle')
                  setError('')
                }
              }}
            />
            <button
              type="submit"
              className="landing-waitlist-btn"
              disabled={state === 'submitting'}
            >
              {state === 'submitting'
                ? t('landing.notifyMeSubmitting')
                : t('landing.notifyMe')}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {state === 'error' && error && (
        <motion.p
          id={`waitlist-error-${variant}`}
          role="alert"
          className="landing-waitlist-error"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </motion.p>
      )}
    </div>
  )
}

function PlatformBadges({ children }: { children: ReactNode }) {
  return <div className="landing-platform-badges">{children}</div>
}

function PlatformBadge({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="landing-platform-badge">
      {icon}
      {label}
    </span>
  )
}

function AppleIcon() {
  return (
    <svg width="14" height="17" viewBox="0 0 384 512" fill="currentColor">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  )
}

function AndroidIcon() {
  return (
    <svg width="16" height="17" viewBox="0 0 576 512" fill="currentColor">
      <path d="M420.55 301.93a24 24 0 1 1 24-24 24 24 0 0 1-24 24m-265.1 0a24 24 0 1 1 24-24 24 24 0 0 1-24 24m273.7-144.48l47.94-83a10 10 0 1 0-17.27-10l-48.54 84.07a301 301 0 0 0-123.13-26.08A300.62 300.62 0 0 0 164.82 148.5l-48.54-84.07a10 10 0 0 0-17.27 10l47.94 83C64.53 202.22 8.24 285.55 0 384h576c-8.24-98.45-64.54-181.78-146.85-226.55" />
    </svg>
  )
}

const PHONES = [
  {
    lightSrc: appMembersLightSrc,
    darkSrc: appMembersDarkSrc,
    altKey: 'landing.screenshotMembers',
    className: 'landing-phone landing-phone--side'
  },
  {
    lightSrc: appHomeLightSrc,
    darkSrc: appHomeDarkSrc,
    altKey: 'landing.screenshotHome',
    className: 'landing-phone landing-phone--center'
  },
  {
    lightSrc: appHomeRunningLightSrc,
    darkSrc: appHomeRunningDarkSrc,
    altKey: 'landing.screenshotRunning',
    className: 'landing-phone landing-phone--side'
  }
] as const

function PhoneShowcase() {
  const { t } = useTranslation()

  return (
    <section className="landing-section landing-phone-section">
      <div className="landing-container landing-container--xl">
        <div className="landing-phone-row">
          {PHONES.map((phone, i) => (
            <motion.div
              key={phone.altKey}
              className={phone.className}
              {...fadeInUp(i * 0.12)}
            >
              <picture>
                <source
                  srcSet={phone.darkSrc}
                  media="(prefers-color-scheme: dark)"
                />
                <img
                  src={phone.lightSrc}
                  alt={t(phone.altKey)}
                  className="landing-phone-img"
                  loading="lazy"
                />
              </picture>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function LandingScreen() {
  const { t } = useTranslation()

  return (
    <div style={{ height: '100dvh', overflowY: 'auto' }}>
      {/* ── Hero ── */}
      <section
        className="landing-hero-bg"
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <motion.img
          src={iconSrc}
          alt="Svitlo"
          className="landing-float landing-icon-glow"
          style={{
            width: 128,
            height: 128,
            borderRadius: 28,
            marginBottom: 40
          }}
          initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{
            duration: 0.7,
            type: 'spring',
            stiffness: 160,
            damping: 14
          }}
        />

        <motion.h1
          className="landing-gradient-text"
          style={{
            margin: 0,
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight: 800,
            textAlign: 'center',
            letterSpacing: '-0.03em',
            marginBottom: 24,
            lineHeight: 1.1
          }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
        >
          {t('landing.heroTitle')}
        </motion.h1>

        <motion.p
          style={{
            margin: 0,
            maxWidth: 520,
            textAlign: 'center',
            fontSize: 'clamp(1rem, 2vw, 1.25rem)',
            lineHeight: 1.7,
            color: 'rgba(255,255,255,0.55)',
            marginBottom: 40
          }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
        >
          {t('landing.tagline')}
        </motion.p>

        <motion.div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24
          }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45 }}
        >
          <WaitlistForm variant="hero" />

          <PlatformBadges>
            <PlatformBadge
              icon={<AppleIcon />}
              label={t('landing.iosStatus')}
            />
            <PlatformBadge
              icon={<AndroidIcon />}
              label={t('landing.androidStatus')}
            />
          </PlatformBadges>

          <a
            href="#features"
            onClick={e => {
              e.preventDefault()
              document
                .getElementById('features')
                ?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="landing-learn-more"
          >
            {t('landing.learnMore')} ↓
          </a>
        </motion.div>
      </section>

      {/* ── Stats Strip ── */}
      <section
        style={{
          borderBottom: '1px solid #f0f0f0',
          backgroundColor: '#fff',
          padding: '56px 24px'
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: '0 auto',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '32px 64px'
          }}
        >
          {STATS.map((s, i) => (
            <motion.div
              key={s.labelKey}
              style={{ display: 'flex', alignItems: 'center', gap: 12 }}
              {...fadeInUp(i * 0.08)}
            >
              <span style={{ fontSize: 28 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>
                  {t(s.labelKey)}
                </div>
                <div style={{ fontSize: 13, color: '#888' }}>
                  {t(s.descKey)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── App Preview ── */}
      <PhoneShowcase />

      {/* ── Features ── */}
      <section
        id="features"
        className="landing-section"
        style={{ backgroundColor: '#f9fafb' }}
      >
        <div className="landing-container landing-container--xl">
          <motion.h2
            className="landing-section-title"
            style={{ marginBottom: 12 }}
            {...fadeInUp()}
          >
            {t('landing.featuresTitle')}
          </motion.h2>
          <motion.p
            className="landing-section-subtitle"
            style={{ marginBottom: 64 }}
            {...fadeInUp(0.08)}
          >
            {t('landing.featuresSubtitle')}
          </motion.p>

          <div
            className="landing-grid"
            style={{
              gridTemplateColumns:
                'repeat(auto-fill, minmax(min(300px, 100%), 1fr))'
            }}
          >
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.titleKey}
                className="landing-feature-card"
                {...fadeInUp(i * 0.06)}
              >
                <span className="landing-icon">{f.icon}</span>
                <h3 className="landing-card-title">{t(f.titleKey)}</h3>
                <p className="landing-card-body">{t(f.descKey)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="landing-section" style={{ backgroundColor: '#fff' }}>
        <div className="landing-container landing-container--lg">
          <motion.h2
            className="landing-section-title"
            style={{ marginBottom: 64 }}
            {...fadeInUp()}
          >
            {t('landing.howItWorksTitle')}
          </motion.h2>

          <div
            className="landing-grid"
            style={{
              gridTemplateColumns:
                'repeat(auto-fill, minmax(min(240px, 100%), 1fr))',
              gap: 48
            }}
          >
            {STEPS.map((s, i) => (
              <motion.div
                key={s.number}
                className="landing-centered"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}
                {...fadeInUp(i * 0.12)}
              >
                <div className="landing-step-number">
                  <span
                    style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}
                  >
                    {s.number}
                  </span>
                </div>
                <h3 className="landing-card-title" style={{ fontSize: 18 }}>
                  {t(s.titleKey)}
                </h3>
                <p className="landing-card-body">{t(s.descKey)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use Cases ── */}
      <section className="landing-section landing-dark-section">
        <div className="landing-container landing-container--xl">
          <motion.h2
            className="landing-section-title landing-section-title--light"
            style={{ marginBottom: 12 }}
            {...fadeInUp()}
          >
            {t('landing.useCasesTitle')}
          </motion.h2>
          <motion.p
            className="landing-section-subtitle landing-section-subtitle--light"
            style={{ marginBottom: 64 }}
            {...fadeInUp(0.08)}
          >
            {t('landing.useCasesSubtitle')}
          </motion.p>

          <div
            className="landing-grid"
            style={{
              gridTemplateColumns:
                'repeat(auto-fill, minmax(min(280px, 100%), 1fr))'
            }}
          >
            {USE_CASES.map((uc, i) => (
              <motion.div
                key={uc.titleKey}
                className="landing-use-case-card"
                {...fadeInUp(i * 0.08)}
              >
                <span className="landing-icon">{uc.icon}</span>
                <h3 className="landing-card-title landing-card-title--light">
                  {t(uc.titleKey)}
                </h3>
                <p className="landing-card-body landing-card-body--light">
                  {t(uc.descKey)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Section ── */}
      <section
        className="landing-section"
        style={{
          background:
            'linear-gradient(135deg, var(--brand-blue), var(--brand-indigo))'
        }}
      >
        <motion.div
          className="landing-container landing-container--md landing-centered"
          {...fadeInUp()}
        >
          <motion.span
            style={{ fontSize: 48, display: 'inline-block', marginBottom: 24 }}
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            ✨
          </motion.span>
          <h2
            className="landing-section-title landing-section-title--light"
            style={{ marginBottom: 16 }}
          >
            {t('landing.aiTitle')}
          </h2>
          <p
            style={{
              fontSize: 18,
              lineHeight: 1.8,
              color: 'rgba(255,255,255,0.9)',
              margin: 0
            }}
          >
            {t('landing.aiDesc')}
          </p>
        </motion.div>
      </section>

      {/* ── Made in Ukraine ── */}
      <section className="landing-section landing-dark-section">
        <motion.div
          className="landing-container landing-container--sm landing-centered"
          {...fadeInUp()}
        >
          <motion.span
            style={{ fontSize: 48, display: 'inline-block', marginBottom: 24 }}
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 200, damping: 12 }}
          >
            🇺🇦
          </motion.span>
          <h2
            className="landing-section-title landing-section-title--light"
            style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: 16 }}
          >
            {t('landing.madeInUkraine')}
          </h2>
          <p
            className="landing-card-body landing-card-body--light"
            style={{ fontSize: 16, lineHeight: 1.8 }}
          >
            {t('landing.madeInUkraineDesc')}
          </p>
        </motion.div>
      </section>

      {/* ── CTA Footer ── */}
      <section
        className="landing-section"
        style={{
          backgroundColor: 'var(--dark-bg-deep)',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)'
        }}
      >
        <motion.div
          className="landing-container landing-container--sm landing-centered"
          {...fadeInUp()}
        >
          <h2
            className="landing-section-title landing-section-title--light"
            style={{ marginBottom: 16 }}
          >
            {t('landing.ctaTitle')}
          </h2>
          <p
            className="landing-section-subtitle landing-section-subtitle--light"
            style={{ marginBottom: 12 }}
          >
            {t('landing.ctaDesc')}
          </p>
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--brand-blue)',
              marginBottom: 40
            }}
          >
            {t('landing.free')}
          </p>

          <WaitlistForm variant="cta" />

          <div
            style={{
              marginTop: 40,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16
            }}
          >
            <a href="/privacy-policy" className="landing-privacy-link">
              {t('auth.privacyPolicy')}
            </a>
            <p
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.2)',
                margin: 0
              }}
            >
              {t('landing.copyright', { year: CURRENT_YEAR })}
            </p>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
