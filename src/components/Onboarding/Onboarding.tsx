import { Bus, Clock, MapPin, Navigation, Smartphone, Users } from 'lucide-react';

const ONBOARDING_KEY = 'jeeptrack_onboarding_seen';

export function readOnboardingSeen(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === '1';
  } catch {
    return false;
  }
}

export function markOnboardingSeen(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, '1');
  } catch {
    /* private mode */
  }
}

type OnboardingProps = {
  onComplete: () => void;
};

const SERVICES = [
  {
    title: 'Live map',
    desc: 'Routes across Cebu City',
    icon: MapPin,
    tone: 'jeep' as const,
  },
  {
    title: 'Bisaya ETAs',
    desc: 'Hapit na! · Trapik kaayo!',
    icon: Clock,
    tone: 'sky' as const,
  },
  {
    title: 'Driver mode',
    desc: 'Run your 04C route',
    icon: Bus,
    tone: 'navy' as const,
  },
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const handleStart = () => {
    markOnboardingSeen();
    onComplete();
  };

  return (
    <div className="onboarding-screen">
      <header className="onboarding-header">
        <div className="onboarding-header-inner">
          <img
            src="/jeeptrack-onboarding.svg"
            alt="JeepTrack Cebu"
            className="onboarding-logo-img"
            width={320}
            height={320}
            decoding="async"
          />
          <p className="onboarding-welcome">Your jeepney, tracked in real time.</p>
        </div>
        <div className="onboarding-header-wave" aria-hidden />
      </header>

      <div className="onboarding-content">
        <div className="onboarding-search-card">
          <span className="onboarding-search-icon" aria-hidden>
            <Navigation size={20} strokeWidth={2.25} />
          </span>
          <div className="onboarding-search-copy">
            <span className="onboarding-search-label">Where&apos;s your jeep?</span>
            <span className="onboarding-search-sub">Track routes near Fuente Osmeña</span>
          </div>
        </div>

        <div className="onboarding-promo">
          <div className="onboarding-promo-copy">
            <p className="onboarding-promo-kicker">Sakay na ta!</p>
            <p className="onboarding-promo-text">
              See nearby jeepneys, ETAs, and fares — in Bisaya and English.
            </p>
          </div>
          <span className="onboarding-promo-badge" aria-hidden>
            <Users size={28} strokeWidth={1.75} />
          </span>
        </div>

        <section className="onboarding-services">
          <h2 className="onboarding-services-title">Built for Cebu commuters</h2>
          <div className="onboarding-services-grid">
            {SERVICES.map(({ title, desc, icon: Icon, tone }) => (
              <article key={title} className={`onboarding-service-card onboarding-service-card--${tone}`}>
                <Icon size={22} strokeWidth={2} aria-hidden />
                <span className="onboarding-service-title">{title}</span>
                <span className="onboarding-service-desc">{desc}</span>
              </article>
            ))}
          </div>
        </section>

        <button type="button" className="onboarding-cta" onClick={handleStart}>
          Get Started
        </button>

        <p className="onboarding-hint">
          <Smartphone size={14} strokeWidth={2} aria-hidden />
          <span>Map loads after you tap Get Started — saves data and battery.</span>
        </p>
      </div>
    </div>
  );
}
