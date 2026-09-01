export default function MindXLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="mindX logo"
      >
        {/* Top petal */}
        <ellipse cx="16" cy="10" rx="5" ry="8" fill="#FF6B6B" opacity="0.9" />
        {/* Right petal */}
        <ellipse cx="22" cy="16" rx="8" ry="5" fill="#FFD166" opacity="0.9" />
        {/* Bottom petal */}
        <ellipse cx="16" cy="22" rx="5" ry="8" fill="#06D6A0" opacity="0.9" />
        {/* Left petal */}
        <ellipse cx="10" cy="16" rx="8" ry="5" fill="#7C86F0" opacity="0.9" />
        {/* Center dot */}
        <circle cx="16" cy="16" r="4" fill="white" />
      </svg>
      <span
        className="text-gray-800"
        style={{
          fontFamily: "Inter, sans-serif",
          fontWeight: 700,
          fontSize: "18px",
          letterSpacing: "-0.3px",
        }}
      >
        mindX
      </span>
    </div>
  );
}
