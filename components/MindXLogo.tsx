export default function MindXLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Top petal */}
        <ellipse cx="16" cy="10" rx="5" ry="7" fill="#7C86F0" opacity="0.9" />
        {/* Right petal */}
        <ellipse
          cx="22"
          cy="16"
          rx="7"
          ry="5"
          fill="#5CC8A5"
          opacity="0.9"
          transform="rotate(-10 22 16)"
        />
        {/* Bottom petal */}
        <ellipse
          cx="16"
          cy="22"
          rx="5"
          ry="7"
          fill="#F07CA0"
          opacity="0.9"
        />
        {/* Left petal */}
        <ellipse
          cx="10"
          cy="16"
          rx="7"
          ry="5"
          fill="#F5B84E"
          opacity="0.9"
          transform="rotate(-10 10 16)"
        />
        {/* Center dot */}
        <circle cx="16" cy="16" r="2.5" fill="white" />
      </svg>
      <span className="text-lg font-bold tracking-tight text-gray-800">
        mindX
      </span>
    </div>
  );
}
