import { useEffect, useRef, useState } from "react";

export interface SafeStopModalProps {
  locationName: string;
  destinationName: string;
  onSafe: () => void | Promise<void>;
  onHelp: (triggeredBy: "timeout" | "help_button") => void | Promise<void>;
}

const COUNTDOWN_SECONDS = 30;

export function SafeStopModal({
  locationName,
  destinationName,
  onSafe,
  onHelp
}: SafeStopModalProps): JSX.Element {
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [alerting, setAlerting] = useState(false);
  const [busy, setBusy] = useState(false);
  const firedRef = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          if (!firedRef.current) {
            firedRef.current = true;
            setAlerting(true);
            setBusy(true);
            void Promise.resolve(onHelp("timeout")).finally(() => setBusy(false));
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [onHelp]);

  const progress = secondsLeft / COUNTDOWN_SECONDS;
  const ringRadius = 54;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - progress);

  async function handleSafe(): Promise<void> {
    if (busy || alerting) return;
    setBusy(true);
    try {
      await onSafe();
    } finally {
      setBusy(false);
    }
  }

  async function handleHelp(): Promise<void> {
    if (busy) return;
    firedRef.current = true;
    setAlerting(true);
    setBusy(true);
    try {
      await onHelp("help_button");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="safestop-backdrop" role="dialog" aria-modal="true" aria-labelledby="safestop-title">
      <div className="safestop-modal">
        <header className="safestop-header">
          <p className="safestop-eyebrow">SafeStop</p>
          <h2 id="safestop-title">Did you leave the route early?</h2>
          <p className="safestop-subtitle muted">
            You appear to have gotten off near <strong>{locationName}</strong> before reaching{" "}
            <strong>{destinationName}</strong>.
          </p>
        </header>

        <div className="safestop-countdown" aria-live="polite">
          <svg viewBox="0 0 120 120" className="safestop-ring" aria-hidden="true">
            <circle className="safestop-ring-track" cx="60" cy="60" r={ringRadius} />
            <circle
              className="safestop-ring-progress"
              cx="60"
              cy="60"
              r={ringRadius}
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringOffset}
            />
          </svg>
          <div className="safestop-countdown-label">
            {alerting ? (
              <span className="safestop-alerting">Alerting your contacts…</span>
            ) : (
              <>
                <span className="safestop-countdown-value">{secondsLeft}</span>
                <span className="safestop-countdown-unit">seconds</span>
              </>
            )}
          </div>
        </div>

        <div className="safestop-actions">
          <button
            type="button"
            className="safestop-btn safestop-btn-safe"
            disabled={busy || alerting}
            onClick={() => void handleSafe()}
          >
            I&apos;m Safe
          </button>
          <button
            type="button"
            className="safestop-btn safestop-btn-help"
            disabled={busy}
            onClick={() => void handleHelp()}
          >
            I Need Help
          </button>
        </div>
      </div>
    </div>
  );
}
