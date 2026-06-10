"use client";
import { useEffect, useState, useRef } from "react";

export function AnimatedNumber({
  target,
  duration,
  delay,
  className,
}: {
  target: number;
  duration: number;
  delay: number;
  className?: string;
}) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      startTimeRef.current = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startTimeRef.current;
        const progress = Math.min(elapsed / (duration * 1000), 1);
        const current = Math.round(progress * target);
        setValue(current);

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };

      rafRef.current = requestAnimationFrame(animate);
    }, delay * 1000);

    return () => {
      clearTimeout(timeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, delay]);

  return <span className={className}>{value}%</span>;
}