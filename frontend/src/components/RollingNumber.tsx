import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';

interface RollingNumberProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export const RollingNumber: React.FC<RollingNumberProps> = ({ 
  value, 
  decimals = 4, 
  prefix = '', 
  suffix = '',
  className = '' 
}) => {
  const elementRef = useRef<HTMLSpanElement>(null);
  const valueRef = useRef({ val: value });

  useEffect(() => {
    if (!elementRef.current) return;

    // Animate value from the current display value to the new value
    gsap.to(valueRef.current, {
      val: value,
      duration: 1.0,
      ease: "power2.out",
      onUpdate: () => {
        if (elementRef.current) {
          elementRef.current.textContent = valueRef.current.val.toFixed(decimals);
        }
      }
    });
  }, [value, decimals]);

  return (
    <span className={className}>
      {prefix}
      <span ref={elementRef}>{value.toFixed(decimals)}</span>
      {suffix}
    </span>
  );
};
