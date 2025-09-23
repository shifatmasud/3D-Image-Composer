// Fix: Added a side-effect import of '@react-three/fiber' to provide JSX type augmentation for three.js elements.
import '@react-three/fiber';
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface FloatingParticlesProps {
  count: number;
  pointer: React.MutableRefObject<THREE.Vector2>;
}

export const FloatingParticles: React.FC<FloatingParticlesProps> = ({ count, pointer }) => {
  const pointsRef = useRef<THREE.Points>(null!);

  const [positions, velocities] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 5 - 1;

      velocities[i * 3] = (Math.random() - 0.5) * 0.002;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.002;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
    }
    return [positions, velocities];
  }, [count]);

  useFrame((state, delta) => {
    if (pointsRef.current) {
      const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        posArray[i3] += velocities[i3] * 50 * delta;
        posArray[i3 + 1] += velocities[i3 + 1] * 50 * delta;
        posArray[i3 + 2] += velocities[i3 + 2] * 50 * delta;
        
        // Interaction with pointer for parallax effect
        posArray[i3] -= pointer.current.x * delta * 0.5;
        posArray[i3 + 1] -= pointer.current.y * delta * 0.5;

        // Reset particles that go off-screen
        if (Math.abs(posArray[i3]) > 5 || Math.abs(posArray[i3 + 1]) > 5 || posArray[i3 + 2] > 2) {
            posArray[i3] = (Math.random() - 0.5) * 10;
            posArray[i3 + 1] = (Math.random() - 0.5) * 10;
            posArray[i3 + 2] = -3;
        }
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
          usage={THREE.DynamicDrawUsage}
        />
      </bufferGeometry>
      <pointsMaterial size={0.015} color="#aaaaaa" sizeAttenuation fog={false} transparent opacity={0.5} />
    </points>
  );
};