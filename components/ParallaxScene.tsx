// Fix: Added a side-effect import of '@react-three/fiber' to provide JSX type augmentation for three.js elements.
import '@react-three/fiber';
import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
// Fix: The 'Environment' component is not available in the version of '@react-three/drei' used in this project.
import { motion } from 'framer-motion-3d';
import { useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Vector2, PointLight, MathUtils } from 'three';
import { FloatingParticles } from './FloatingParticles';
import { LayeredImage, LayeredImageRef } from './LayeredImage';

const PointerLight: React.FC<{
  smoothPointerX: ReturnType<typeof useSpring>;
  smoothPointerY: ReturnType<typeof useSpring>;
  isStatic: boolean;
}> = ({ smoothPointerX, smoothPointerY, isStatic }) => {
  const lightRef = useRef<PointLight>(null!);
  const { viewport } = useThree();

  useFrame(({ clock }) => {
    const targetX = isStatic ? 0 : (smoothPointerX.get() * viewport.width) / 2;
    const targetY = isStatic ? 0 : (smoothPointerY.get() * viewport.height) / 2;
    const targetIntensity = isStatic ? 1.5 : 2.5 + Math.sin(clock.getElapsedTime() * 4) * 0.5;

    if (lightRef.current) {
        lightRef.current.position.x = MathUtils.lerp(lightRef.current.position.x, targetX, 0.1);
        lightRef.current.position.y = MathUtils.lerp(lightRef.current.position.y, targetY, 0.1);
        lightRef.current.intensity = MathUtils.lerp(lightRef.current.intensity, targetIntensity, 0.1);
    }
  });

  return <pointLight ref={lightRef} position-z={1.5} intensity={2.5} distance={7} decay={2} color="#FFDDAA" />;
};

interface ParallaxSceneProps {
  imageUrl: string;
  depthUrl: string;
  pointer: React.MutableRefObject<Vector2>;
  depthScale: number;
  layerBlending: number;
  backgroundCutoff: number;
  middlegroundCutoff: number;
  isStatic: boolean;
  layeredImageRef: React.RefObject<LayeredImageRef>;
}

const SceneContent: React.FC<ParallaxSceneProps> = ({
  imageUrl,
  depthUrl,
  pointer,
  depthScale,
  layerBlending,
  backgroundCutoff,
  middlegroundCutoff,
  isStatic,
  layeredImageRef,
}) => {
  const particleCount = 50;

  // Framer Motion setup for smooth, physics-based pointer tracking
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);

  const smoothOptions = { stiffness: 200, damping: 40, mass: 1 };
  const smoothPointerX = useSpring(pointerX, smoothOptions);
  const smoothPointerY = useSpring(pointerY, smoothOptions);

  // Map smoothed pointer values to 3D rotation and camera position
  const rotateY = useTransform(smoothPointerX, [-1, 1], [-0.4, 0.4]);
  const rotateX = useTransform(smoothPointerY, [-1, 1], [0.2, -0.2]);
  const cameraX = useTransform(smoothPointerX, [-1, 1], [0.1, -0.1]);
  const cameraY = useTransform(smoothPointerY, [-1, 1], [0.1, -0.1]);

  // Update motion values from the raw pointer data in the render loop
  useFrame(() => {
    pointerX.set(pointer.current.x);
    pointerY.set(pointer.current.y);
  });

  // Handle static mode by resetting pointer values, letting the spring animate back
  useEffect(() => {
    if (isStatic) {
      pointerX.set(0);
      pointerY.set(0);
    }
  }, [isStatic, pointerX, pointerY]);

  // Declarative camera movement
  useFrame((state) => {
    const targetX = isStatic ? 0 : cameraX.get();
    const targetY = isStatic ? 0 : cameraY.get();
    state.camera.position.x = MathUtils.lerp(state.camera.position.x, targetX, 0.05);
    state.camera.position.y = MathUtils.lerp(state.camera.position.y, targetY, 0.05);
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <React.Suspense fallback={null}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 2, 5]} intensity={1.5} />

      <PointerLight smoothPointerX={smoothPointerX} smoothPointerY={smoothPointerY} isStatic={isStatic} />

      <motion.group rotation-x={rotateX} rotation-y={rotateY}>
        <LayeredImage
          ref={layeredImageRef}
          imageUrl={imageUrl}
          depthUrl={depthUrl}
          depthScale={depthScale}
          layerBlending={layerBlending}
          backgroundCutoff={backgroundCutoff}
          middlegroundCutoff={middlegroundCutoff}
        />
      </motion.group>

      <FloatingParticles key={particleCount} count={particleCount} pointer={pointer} />

      
    </React.Suspense>
  );
};


export const ParallaxScene: React.FC<ParallaxSceneProps> = (props) => {
  return (
    <Canvas camera={{ position: [0, 0, 2], fov: 50, near: 0.1, far: 20 }}>
      <SceneContent {...props} />
    </Canvas>
  );
};