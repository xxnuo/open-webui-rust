interface HashtagIconProps {
  className?: string;
  strokeWidth?: string;
}

export default function HashtagIcon({ 
  className = 'size-4', 
  strokeWidth = '1.5' 
}: HashtagIconProps) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      strokeWidth={strokeWidth}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M10 3L6 21" strokeLinecap="round" />
      <path d="M20.5 16H2.5" strokeLinecap="round" />
      <path d="M22 7H4" strokeLinecap="round" />
      <path d="M18 3L14 21" strokeLinecap="round" />
    </svg>
  );
}

