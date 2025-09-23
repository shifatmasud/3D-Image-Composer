import React, { useEffect, useRef } from 'react';
import { Vector2 } from 'three';

export const usePointer = (targetRef: React.RefObject<HTMLElement>) => {
  const pointer = useRef(new Vector2());

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
    };

    const onPointerLeave = () => {
        pointer.current.set(0, 0);
    };

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

  return pointer;
};
