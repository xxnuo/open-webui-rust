import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MarqueeProps {
  children: ReactNode;
  speed?: number; // duration in seconds
  direction?: 'left' | 'right';
  pauseOnHover?: boolean;
  className?: string;
}

export default function Marquee({
  children,
  speed = 20,
  direction = 'left',
  pauseOnHover = true,
  className = '',
}: MarqueeProps) {
  return (
    <div className={cn('overflow-hidden whitespace-nowrap', className)}>
      <div
        className={cn(
          'inline-block',
          pauseOnHover && 'hover:[animation-play-state:paused]'
        )}
        style={{
          animation: `marquee-${direction} ${speed}s linear infinite`,
        }}
      >
        {children}
      </div>
      <style>{`
        @keyframes marquee-left {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        @keyframes marquee-right {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(0%);
          }
        }
      `}</style>
    </div>
  );
}

