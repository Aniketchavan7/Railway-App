"use client";

interface RailPulseLogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
}

export function RailPulseLogo({
  size = "md",
  showWordmark = true,
  className = "",
}: RailPulseLogoProps) {
  const iconSizeClasses = {
    sm: "w-7 h-7",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  }[size];

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
  }[size];

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 ${className}`}>
      {/* Bespoke Geometric RailPulse Icon */}
      <div
        className={`${iconSizeClasses} rounded-pill bg-paper-3 border border-rule flex items-center justify-center text-accent transition-colors shrink-0 group-hover:border-accent`}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 text-accent"
        >
          {/* Aerodynamic Locomotive Hull */}
          <path
            d="M10 6.5C10 5.67157 10.6716 5 11.5 5H20.5C21.3284 5 22 5.67157 22 6.5V16C22 18.2091 20.2091 20 18 20H14C11.7909 20 10 18.2091 10 16V6.5Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Aerodynamic Windshield Visor */}
          <path
            d="M12.5 8H19.5L18.5 12H13.5L12.5 8Z"
            fill="currentColor"
            fillOpacity="0.25"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinejoin="round"
          />

          {/* Dual Locomotive Headlights */}
          <circle cx="13" cy="16.5" r="1.2" fill="currentColor" />
          <circle cx="19" cy="16.5" r="1.2" fill="currentColor" />

          {/* Integrated Pulse Rail Waveform */}
          <path
            d="M5 25H10.5L12.8 22L15.5 27L18.2 23.5L20.5 25H27"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Crafted Brand Wordmark */}
      {showWordmark && (
        <span
          className={`font-display font-bold ${textSizeClasses} tracking-tight text-ink`}
        >
          Rail<span className="text-accent">Pulse</span>
        </span>
      )}
    </div>
  );
}
