import { useEffect, useMemo, useState } from "react";

const SESSION_KEY = "remeritona_intro_played";
const TOTAL_MS = 4800;

type Particle = {
  id: number;
  left: number;
  size: number;
  delay: number;
  duration: number;
  drift: number;
};

export function IntroAnimation() {
  const [show, setShow] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    setShow(true);
    sessionStorage.setItem(SESSION_KEY, "1");

    const fadeTimer = setTimeout(() => setFadeOut(true), TOTAL_MS - 600);
    const endTimer = setTimeout(() => setShow(false), TOTAL_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(endTimer);
    };
  }, []);

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 2 + Math.random() * 3,
      delay: Math.random() * 600,
      duration: 1600 + Math.random() * 1200,
      drift: (Math.random() - 0.5) * 200,
    }));
  }, []);

  if (!show) return null;

  const remainingLetters = "EMERITONA".split("");

  const handleSkip = () => {
    setFadeOut(true);
    setTimeout(() => setShow(false), 400);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-hidden"
      style={{
        background: "#111111",
        opacity: fadeOut ? 0 : 1,
        transition: "opacity 600ms ease-out",
        pointerEvents: fadeOut ? "none" : "auto",
      }}
      aria-hidden
    >
      {/* Particles */}
      <div className="absolute inset-0">
        {particles.map((p) => (
          <span
            key={p.id}
            className="intro-particle"
            style={{
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDelay: `${p.delay}ms`,
              animationDuration: `${p.duration}ms`,
              ["--drift" as string]: `${p.drift}px`,
            }}
          />
        ))}
      </div>

      {/* Wordmark */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="flex items-center justify-center"
          style={{
            fontFamily: "'Merriweather', Georgia, serif",
            color: "#c9a84c",
            fontWeight: 900,
            letterSpacing: "0.02em",
          }}
        >
          <span
            className="intro-r"
            style={{
              fontSize: "clamp(5rem, 14vw, 11rem)",
              lineHeight: 1,
              display: "inline-block",
            }}
          >
            R
          </span>
          <span
            className="flex"
            style={{
              fontSize: "clamp(3rem, 9vw, 7rem)",
              lineHeight: 1,
              alignSelf: "center",
              marginLeft: "0.05em",
            }}
          >
            {remainingLetters.map((ch, i) => (
              <span
                key={i}
                className="intro-letter"
                style={{
                  display: "inline-block",
                  animationDelay: `${1800 + i * 110}ms`,
                }}
              >
                {ch}
              </span>
            ))}
          </span>
        </div>
        <div
          className="intro-tagline"
          style={{
            color: "#ffffff",
            fontFamily: "'Montserrat', system-ui, sans-serif",
            letterSpacing: "0.5em",
            textTransform: "uppercase",
            fontSize: "clamp(0.7rem, 1.3vw, 0.95rem)",
            marginTop: "1.5rem",
            paddingLeft: "0.5em",
          }}
        >
          Hotel &amp; Suites
        </div>
      </div>

      {/* Skip button */}
      <button
        onClick={handleSkip}
        className="absolute bottom-6 right-6 text-xs uppercase tracking-[0.3em] text-white/50 hover:text-[#c9a84c] transition-colors"
        style={{ fontFamily: "'Montserrat', system-ui, sans-serif" }}
      >
        Skip
      </button>

      <style>{`
        @keyframes introParticleRise {
          0% {
            transform: translate3d(0, 100vh, 0) scale(0.6);
            opacity: 0;
          }
          15% { opacity: 1; }
          70% { opacity: 1; }
          100% {
            transform: translate3d(var(--drift), 38vh, 0) scale(1);
            opacity: 0;
          }
        }
        .intro-particle {
          position: absolute;
          bottom: 0;
          border-radius: 9999px;
          background: #c9a84c;
          box-shadow: 0 0 8px 1px rgba(201, 168, 76, 0.7);
          animation-name: introParticleRise;
          animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
          animation-fill-mode: forwards;
          opacity: 0;
        }
        @keyframes introRReveal {
          0% { opacity: 0; transform: scale(0.6); filter: blur(20px); text-shadow: 0 0 40px rgba(201,168,76,0.9); }
          60% { opacity: 1; transform: scale(1.05); filter: blur(2px); text-shadow: 0 0 50px rgba(201,168,76,0.9); }
          100% { opacity: 1; transform: scale(1); filter: blur(0); text-shadow: 0 0 18px rgba(201,168,76,0.4); }
        }
        .intro-r {
          opacity: 0;
          animation: introRReveal 1500ms cubic-bezier(0.22, 1, 0.36, 1) 700ms forwards;
        }
        @keyframes introLetterIn {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .intro-letter {
          opacity: 0;
          animation: introLetterIn 500ms ease-out forwards;
        }
        @keyframes introTaglineIn {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 0.9; transform: translateY(0); }
        }
        .intro-tagline {
          opacity: 0;
          animation: introTaglineIn 800ms ease-out 3200ms forwards;
        }
      `}</style>
    </div>
  );
}
