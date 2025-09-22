


// Fix: Use a side-effect import to ensure React Three Fiber's JSX type definitions are loaded correctly. This resolves issues with TypeScript not recognizing custom R3F elements.
import '@react-three/fiber';
// Fix: Corrected React import to properly import `useRef` and `useEffect` hooks.
import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, PerformanceMonitor } from '@react-three/drei';
import { Vector2, PointLight, MathUtils, Mesh, Group } from 'three';
import gsap from 'gsap';
import { Effects } from './Effects';
import { FloatingParticles } from './FloatingParticles';
import { LayeredImage } from './LayeredImage';

const PointerLight: React.FC<{ pointer: React.MutableRefObject<Vector2>; isStatic: boolean }> = ({ pointer, isStatic }) => {
  const lightRef = useRef<PointLight>(null!);
  const { viewport } = useThree();

  useFrame(({ clock }) => {
    if (isStatic) return;
    // The pointer ref is already smoothed via GSAP in usePointer hook
    lightRef.current.position.x = (pointer.current.x * viewport.width) / 2;
    lightRef.current.position.y = (pointer.current.y * viewport.height) / 2;
    // Add a pulsing effect to the light's intensity for a more "alive" feel
    lightRef.current.intensity = 2.5 + Math.sin(clock.getElapsedTime() * 4) * 0.5;
  });

  useEffect(() => {
    if (isStatic && lightRef.current) {
      gsap.to(lightRef.current.position, { x: 0, y: 0, duration: 1, ease: 'power3.out' });
      gsap.to(lightRef.current, { intensity: 1.5, duration: 1, ease: 'power3.out' });
    }
  }, [isStatic]);

  // A light that follows the cursor to create dynamic highlights, now warmer and more intense
  return <pointLight ref={lightRef} position-z={1.5} intensity={2.5} distance={7} decay={2} color="#FFDDAA" />;
};

const CameraParallaxController: React.FC<{ pointer: React.MutableRefObject<Vector2>; isStatic: boolean }> = ({ pointer, isStatic }) => {
  const { camera } = useThree();
  // Parallax Motion Engine: Move camera slightly for a better parallax effect
  useFrame((state) => {
    if (isStatic) return;
    const targetX = pointer.current.x * -0.1;
    const targetY = pointer.current.y * -0.1;

    state.camera.position.x = MathUtils.lerp(state.camera.position.x, targetX, 0.05);
    state.camera.position.y = MathUtils.lerp(state.camera.position.y, targetY, 0.05);
    state.camera.lookAt(0, 0, 0);
  });
  
  useEffect(() => {
    if (isStatic) {
      gsap.to(camera.position, { x: 0, y: 0, duration: 1, ease: 'power3.out', onUpdate: () => camera.lookAt(0, 0, 0) });
    }
  }, [isStatic, camera]);

  return null;
};

// Fix: Moved scene logic into a dedicated component to ensure R3F hooks are used within the Canvas.
const SceneController: React.FC<{
  groupRef: React.RefObject<Group>;
  pointer: React.MutableRefObject<Vector2>;
  isStatic: boolean;
}> = ({ groupRef, pointer, isStatic }) => {
  // Set initial rotation to immediately show the 3D effect
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.rotation.x = -0.15;
      groupRef.current.rotation.y = 0.4;
    }
  }, [groupRef]);

  useFrame(() => {
    if (groupRef.current && !isStatic) {
      const targetRotationY = pointer.current.x * 0.6;
      const targetRotationX = pointer.current.y * -0.3;

      // Smoothly interpolate to the target rotation (lerp)
      groupRef.current.rotation.y +=
        (targetRotationY - groupRef.current.rotation.y) * 0.05;
      groupRef.current.rotation.x +=
        (targetRotationX - groupRef.current.rotation.x) * 0.05;
    }
  });

  useEffect(() => {
    if (isStatic && groupRef.current) {
      gsap.to(groupRef.current.rotation, { x: 0, y: 0, z: 0, duration: 1, ease: 'power3.out' });
    }
  }, [isStatic, groupRef]);

  return null;
};

interface ParallaxSceneProps {
  imageUrl: string;
  depthUrl: string;
  pointer: React.MutableRefObject<Vector2>;
  baseDepth: number;
  depthScale: number;
  layerCount: number;
  layerBlending: number;
  bloomIntensity: number;
  atmosphere: number;
  isPerfSucks: boolean;
  onIncline: () => void;
  onDecline: () => void;
  normalIntensity: number;
  ssaoIntensity: number;
  ssaoRadius: number;
  isStatic: boolean;
}

export const ParallaxScene: React.FC<ParallaxSceneProps> = ({ 
  imageUrl, 
  depthUrl, 
  pointer, 
  baseDepth,
  depthScale, 
  layerCount,
  layerBlending,
  bloomIntensity, 
  atmosphere,
  isPerfSucks,
  onIncline,
  onDecline,
  normalIntensity,
  ssaoIntensity,
  ssaoRadius,
  isStatic,
}) => {
  const sunRef = useRef<Mesh>(null!);
  const groupRef = useRef<Group>(null!);
  const particleCount = isPerfSucks ? 50 : 200;

  return (
    <Canvas camera={{ position: [0, 0, 2], fov: 50, near: 0.1, far: 20 }}>
      <PerformanceMonitor onIncline={onIncline} onDecline={onDecline} />
      <React.Suspense fallback={null}>
        {/* Softer ambient light to fill in shadows */}
        <ambientLight intensity={0.5} />
        {/* A soft directional light from the side to give shape */}
        <directionalLight position={[3, 2, 5]} intensity={1.5} />

        {/* Invisible light source for God Rays */}
        <mesh ref={sunRef} position={[0, 0, -2]}>
          <sphereGeometry args={[0.2, 32, 32]} />
          <meshBasicMaterial color="white" transparent opacity={0} />
        </mesh>

        {/* Interactive point light that follows the cursor */}
        <PointerLight pointer={pointer} isStatic={isStatic} />
        
        <LayeredImage
          ref={groupRef}
          imageUrl={imageUrl}
          depthUrl={depthUrl}
          layerCount={layerCount}
          depthScale={depthScale}
          baseDepth={baseDepth}
          layerBlending={layerBlending}
          normalIntensity={normalIntensity}
        />
        
        <FloatingParticles key={particleCount} count={particleCount} pointer={pointer} />

        {/* Beautiful realistic lighting */}
        <Environment preset="sunset" />

        {/* Controller for camera parallax effect */}
        <CameraParallaxController pointer={pointer} isStatic={isStatic} />

        {/* Controller for image group rotation */}
        <SceneController groupRef={groupRef} pointer={pointer} isStatic={isStatic} />
        
        {/* Conditionally render post-processing effects for performance */}
        {!isPerfSucks && (
          <Effects 
            pointer={pointer}
            bloomIntensity={bloomIntensity}
            atmosphere={atmosphere}
            sunRef={sunRef}
            ssaoIntensity={ssaoIntensity}
            ssaoRadius={ssaoRadius}
          />
        )}
      </React.Suspense>
    </Canvas>
  );
};