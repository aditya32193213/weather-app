import React from "react";

function AnimatedBackground() {
  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        role="presentation"
      >
        <defs>
          {/* Sky gradient */}
          <linearGradient id="bgSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="var(--sky-top)" />
            <stop offset="100%" stopColor="var(--sky-btm)" />
          </linearGradient>

          {/* Sun glow */}
          <radialGradient id="bgSunGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="var(--sun-color)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--sun-color)" stopOpacity="0"   />
          </radialGradient>

          {/* FIXED: bgMist gradient was referenced below but never defined.
              Without this the mist rect rendered as a solid black rectangle. */}
          <linearGradient id="bgMist" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="var(--mist-color)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--mist-color)" stopOpacity="0"   />
          </linearGradient>
        </defs>

        {/* Sky background */}
        <rect width="1440" height="900" fill="url(#bgSky)" />

        {/* Sun */}
        <circle className="sun-pulse" cx="1210" cy="110" r="80" fill="url(#bgSunGlow)" />
        <circle cx="1210" cy="110" r="35" fill="var(--sun-color)" opacity="var(--sun-opacity)" />

        {/* Mountain layers */}
        <path d="M0,600 Q360,450 720,550 T1440,500 L1440,900 L0,900 Z" fill="var(--mtn-far)" opacity="0.3" />
        <path d="M0,750 Q400,600 800,700 T1440,650 L1440,900 L0,900 Z" fill="var(--mtn-mid)" opacity="0.5" />

        {/* FIXED: mist rect now uses the defined #bgMist gradient */}
        <rect
          className="mist-float"
          x="-100" y="600"
          width="1640" height="300"
          fill="url(#bgMist)"
          opacity="0.4"
        />
      </svg>
    </div>
  );
}

export default React.memo(AnimatedBackground);