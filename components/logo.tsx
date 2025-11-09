export function Logo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="8" fill="#2563eb"/>
      <path d="M16 8L12 12L16 16L20 12L16 8Z" fill="white"/>
      <path d="M8 16L12 20H20L24 16H20L16 12L12 16H8Z" fill="white"/>
      <path d="M16 24L12 20H16V24H16Z" fill="white"/>
      <path d="M16 24H20L24 20H20V24H16Z" fill="white"/>
    </svg>
  )
}

