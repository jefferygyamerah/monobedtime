export function MonkeyMark({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-[28px] border border-black/8 bg-white/70 p-3 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl ${className}`}
    >
      <svg viewBox="0 0 96 96" className="h-12 w-12" aria-hidden="true">
        <defs>
          <linearGradient id="monobedtime-orbit" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0b0b0b" />
            <stop offset="100%" stopColor="#FF7A00" />
          </linearGradient>
        </defs>
        <path
          d="M20 67C11 55 12 36 24 24C36 12 55 11 68 20"
          fill="none"
          stroke="url(#monobedtime-orbit)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M76 29C84 41 84 59 72 72C60 85 39 85 26 75"
          fill="none"
          stroke="url(#monobedtime-orbit)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <text
          x="72"
          y="18"
          textAnchor="middle"
          fill="#FF7A00"
          fontSize="10"
          fontWeight="700"
          fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
        >
          zZz
        </text>
        <circle cx="31" cy="41" r="10" fill="#0b0b0b" />
        <circle cx="65" cy="41" r="10" fill="#0b0b0b" />
        <circle cx="31" cy="41" r="5.5" fill="#fffdf8" />
        <circle cx="65" cy="41" r="5.5" fill="#fffdf8" />
        <path
          d="M48 23C32 23 20 35 20 50C20 62 28 72 39 75L42 64C37 61 34 56 34 50C34 42 40 36 48 36C56 36 62 42 62 50C62 56 59 61 54 64L57 75C68 72 76 62 76 50C76 35 64 23 48 23Z"
          fill="#111111"
        />
        <path
          d="M48 31C39 31 31 38 31 48C31 61 39 70 48 70C57 70 65 61 65 48C65 38 57 31 48 31Z"
          fill="#fffdf8"
        />
        <path
          d="M39 45C41 43 43 43 45 45"
          fill="none"
          stroke="#0b0b0b"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M51 45C53 43 55 43 57 45"
          fill="none"
          stroke="#0b0b0b"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M46 55C47 53 49 53 50 55"
          fill="none"
          stroke="#0b0b0b"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M40 60C45 64 51 64 56 60"
          fill="none"
          stroke="#0b0b0b"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
