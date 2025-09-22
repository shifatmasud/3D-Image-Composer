import { useEffect, useRef } from 'react';
import { Vector2 } from 'three';
import gsap from 'gsap';

export const usePointer = (targetRef: React.RefObject<HTMLElement>) => {
  const pointer = useRef(new Vector2());
  const smoothedPointer = useRef(new Vector2());

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      const { left, top, width, height } = target.getBoundingClientRect();
      
      const x = ((clientX - left) / width) * 2 - 1;
      const y = -(((clientY - top) / height) * 2 - 1);
      
      pointer.current.set(x, y);

      // For custom CSS cursor
      document.body.style.setProperty('--x', `${clientX}px`);
      document.body.style.setProperty('--y', `${clientY}px`);
    };

    const onPointerLeave = () => {
        pointer.current.set(0, 0);
    };

    gsap.ticker.add(() => {
        smoothedPointer.current.x = gsap.utils.interpolate(smoothedPointer.current.x, pointer.current.x, 0.1);
        smoothedPointer.current.y = gsap.utils.interpolate(smoothedPointer.current.y, pointer.current.y, 0.1);
    });

    target.addEventListener('mousemove', onPointerMove);
    target.addEventListener('touchmove', onPointerMove, { passive: true });
    target.addEventListener('mouseleave', onPointerLeave);
    target.addEventListener('touchend', onPointerLeave);

    return () => {
      target.removeEventListener('mousemove', onPointerMove);
      target.removeEventListener('touchmove', onPointerMove);
      target.removeEventListener('mouseleave', onPointerLeave);
      target.removeEventListener('touchend', onPointerLeave);
    };
  }, [targetRef]);

  return smoothedPointer;
};