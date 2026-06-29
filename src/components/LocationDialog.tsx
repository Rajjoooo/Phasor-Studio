import { useState, useEffect, useRef, useCallback } from 'react'
import { useMapStore } from '../store/mapStore'
import { useProjectStore, type DesignMethod } from '../store/projectStore'
import '../styles/locationDialog.css'

type NominatimResult = {
  place_id: number
  display_name: string
  lat: string
  lon: string
  type: string
  name?: string
  address?: {
    road?: string
    city?: string
    town?: string
    village?: string
    state?: string
    country?: string
  }
}

const QUICK_PICKS = [
  { name: 'Connaught Place, Delhi', lat: 28.6315, lng: 77.2167 },
  { name: 'Silk Board Junction, Bangalore', lat: 12.9172, lng: 77.6227 },
  { name: 'Hinjewadi Chowk, Pune', lat: 18.5912, lng: 73.7389 },
  { name: 'AIIMS Intersection, Delhi', lat: 28.5672, lng: 77.2100 },
  { name: 'Mahim Junction, Mumbai', lat: 19.0388, lng: 72.8408 },
  { name: 'Anna Nagar Roundabout, Chennai', lat: 13.0860, lng: 80.2101 },
]

const METHODS: { id: DesignMethod; name: string; icon: JSX.Element; desc: string }[] = [
  {
    id: 'webster',
    name: 'Webster Method',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20M2 12h20" />
        <circle cx="12" cy="12" r="4" />
        <path d="M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    ),
    desc: 'Classic optimum cycle length formula. Best for standard signalised intersections with moderate traffic.',
  },
  {
    id: 'irc',
    name: 'IRC Method',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        <path d="M8 7h6M8 11h8" />
      </svg>
    ),
    desc: 'Indian Road Congress IRC:93-1985. Includes saturation flow adjustments for Indian traffic conditions.',
  },
  {
    id: 'custom',
    name: 'Custom Method',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    desc: 'Manually define all signal timings and parameters. Full control over every calculation input.',
  },
]

export default function LocationDialog() {
  const setLocation = useMapStore((s) => s.setLocation)
  const setProject = useProjectStore((s) => s.setProject)

  // Step state: 1 = location, 2 = method
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedLocation, setSelectedLocation] = useState<{
    name: string
    lat: number
    lng: number
  } | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<DesignMethod>('webster')

  // Search state
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NominatimResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Focus input on mount
  useEffect(() => {
    if (step === 1) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [step])

  const searchNominatim = useCallback(async (q: string) => {
    if (q.length < 3) {
      setResults([])
      setShowSuggestions(false)
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=6&addressdetails=1`,
        {
          headers: { 'Accept-Language': 'en' },
        }
      )
      const data: NominatimResult[] = await res.json()
      setResults(data)
      setShowSuggestions(data.length > 0)
      setActiveIndex(-1)
    } catch (err) {
      console.error('Nominatim search failed:', err)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchNominatim(val), 350)
  }

  const selectResult = (result: NominatimResult) => {
    const name = result.name || result.display_name.split(',')[0]
    setSelectedLocation({
      name,
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
    })
    setStep(2)
  }

  const selectQuickPick = (pick: (typeof QUICK_PICKS)[0]) => {
    setSelectedLocation({ name: pick.name, lat: pick.lat, lng: pick.lng })
    setStep(2)
  }

  const handleStartProject = () => {
    if (!selectedLocation) return

    // Commit to both stores
    setLocation(selectedLocation.lat, selectedLocation.lng, 17, selectedLocation.name)
    setProject({
      projectName: selectedLocation.name,
      designMethod: selectedMethod,
      locationName: selectedLocation.name,
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      createdAt: new Date().toISOString(),
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      selectResult(results[activeIndex])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  const formatAddress = (result: NominatimResult): string => {
    const parts: string[] = []
    const addr = result.address
    if (addr) {
      if (addr.road) parts.push(addr.road)
      if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village || '')
      if (addr.state) parts.push(addr.state)
      if (addr.country) parts.push(addr.country)
    }
    return parts.length > 0 ? parts.join(', ') : result.display_name
  }

  return (
    <div className="location-dialog-overlay" id="location-dialog-overlay">
      <div className="location-dialog" id="location-dialog">
        {/* Brand */}
        <div className="location-dialog__brand">
          <div className="location-dialog__logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
            </svg>
          </div>
          <span className="location-dialog__brand-name">Phasor Studio</span>
        </div>

        {/* Step indicator */}
        <div className="location-dialog__steps">
          <div className={`location-dialog__step ${step >= 1 ? 'location-dialog__step--active' : ''}`}>
            <span className="location-dialog__step-num">1</span>
            <span className="location-dialog__step-label">Location</span>
          </div>
          <div className="location-dialog__step-line" />
          <div className={`location-dialog__step ${step >= 2 ? 'location-dialog__step--active' : ''}`}>
            <span className="location-dialog__step-num">2</span>
            <span className="location-dialog__step-label">Method</span>
          </div>
        </div>

        {/* ── STEP 1: Location ───────────────────── */}
        {step === 1 && (
          <div className="location-dialog__step-content" key="step-1">
            <h1 className="location-dialog__title">
              Design Your Intersection
            </h1>
            <p className="location-dialog__subtitle">
              Enter the location of the intersection you want to design.
              Search by name, address, or landmark.
            </p>

            {/* Search Input */}
            <div className="location-dialog__input-wrapper">
              <span className="location-dialog__icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </span>
              <input
                ref={inputRef}
                id="location-search-input"
                className="location-dialog__input"
                type="text"
                placeholder="Search intersection or place..."
                value={query}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => results.length > 0 && setShowSuggestions(true)}
                autoComplete="off"
                spellCheck={false}
              />
              {isLoading && <div className="location-dialog__spinner" />}

              {/* Suggestions */}
              {showSuggestions && (
                <div className="location-dialog__suggestions" id="location-suggestions">
                  {results.map((result, index) => (
                    <div
                      key={result.place_id}
                      className={`location-dialog__suggestion ${index === activeIndex ? 'location-dialog__suggestion--active' : ''}`}
                      onClick={() => selectResult(result)}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <span className="location-dialog__suggestion-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                      </span>
                      <div className="location-dialog__suggestion-text">
                        <div className="location-dialog__suggestion-name">
                          {result.name || result.display_name.split(',')[0]}
                        </div>
                        <div className="location-dialog__suggestion-address">
                          {formatAddress(result)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Hint */}
            <div className="location-dialog__hint">
              <span className="location-dialog__hint-icon">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m18 15-6-6-6 6" />
                </svg>
              </span>
              Use arrow keys to navigate, Enter to select
            </div>

            {/* Quick Picks */}
            <div className="location-dialog__quick-picks">
              <div className="location-dialog__quick-label">Quick picks</div>
              <div className="location-dialog__quick-grid">
                {QUICK_PICKS.map((pick) => (
                  <button
                    key={pick.name}
                    className="location-dialog__quick-btn"
                    onClick={() => selectQuickPick(pick)}
                  >
                    {pick.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Design Method ──────────────── */}
        {step === 2 && (
          <div className="location-dialog__step-content" key="step-2">
            <h1 className="location-dialog__title">
              Select Design Method
            </h1>
            <p className="location-dialog__subtitle">
              Choose the traffic design methodology for
              <strong> {selectedLocation?.name}</strong>.
              This determines how signal timings and performance metrics are calculated.
            </p>

            {/* Location badge */}
            <div className="location-dialog__selected-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {selectedLocation?.name}
              <button
                className="location-dialog__change-btn"
                onClick={() => setStep(1)}
              >
                Change
              </button>
            </div>

            {/* Method cards */}
            <div className="method-cards">
              {METHODS.map((m) => (
                <div
                  key={m.id}
                  className={`method-card ${selectedMethod === m.id ? 'method-card--selected' : ''}`}
                  onClick={() => setSelectedMethod(m.id)}
                >
                  <div className="method-card__radio">
                    <div className="method-card__radio-inner" />
                  </div>
                  <div className="method-card__icon">{m.icon}</div>
                  <div className="method-card__body">
                    <div className="method-card__name">{m.name}</div>
                    <div className="method-card__desc">{m.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="location-dialog__actions">
              <button
                className="location-dialog__back-btn"
                onClick={() => setStep(1)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6" />
                </svg>
                Back
              </button>
              <button
                className="location-dialog__start-btn"
                onClick={handleStartProject}
              >
                Start Project
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
