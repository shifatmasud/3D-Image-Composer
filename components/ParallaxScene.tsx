// Fix: Removed triple-slash directive which was causing a type resolution error.
// Types for @react-three/fiber are correctly inferred from the import statements below.

import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Environment, PerformanceMonitor } from '@react-three/drei';
import { EffectComposer, DepthOfField, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import { Mesh, PlaneGeometry, TextureLoader, Vector2, PointLight, MathUtils } from 'three';

interface SceneContentProps {
  imageUrl: string;
  depthUrl: string;
  pointer: React.MutableRefObject<Vector2>;
  displacementScale: number;
  meshDetail: number;
}

const PointerLight: React.FC<{ pointer: React.MutableRefObject<Vector2> }> = ({ pointer }) => {
  const lightRef = useRef<PointLight>(null!);
  const { viewport } = useThree();

  useFrame(({ clock }) => {
    // The pointer ref is already smoothed via GSAP in usePointer hook
    lightRef.current.position.x = (pointer.current.x * viewport.width) / 2;
    lightRef.current.position.y = (pointer.current.y * viewport.height) / 2;
    // Add a pulsing effect to the light's intensity for a more "alive" feel
    lightRef.current.intensity = 2.5 + Math.sin(clock.getElapsedTime() * 4) * 0.5;
  });

  // A light that follows the cursor to create dynamic highlights, now warmer and more intense
  return <pointLight ref={lightRef} position-z={1.5} intensity={2.5} distance={7} decay={2} color="#FFDDAA" />;
};


const SceneContent: React.FC<SceneContentProps> = ({ imageUrl, depthUrl, pointer, displacementScale, meshDetail }) => {
  const meshRef = useRef<Mesh<PlaneGeometry>>(null);
  const [colorMap, depthMap] = useLoader(TextureLoader, [imageUrl, depthUrl]);
  const { viewport } = useThree();

  const aspect = useMemo(() => colorMap.image.width / colorMap.image.height, [colorMap]);

  // Use meshDetail prop to control the plane's segmentation
  const planeArgs = useMemo<[number, number, number, number]>(() => [1, 1, meshDetail, meshDetail], [meshDetail]);

  // Set scene scale
  useEffect(() => {
    if (!meshRef.current) return;
    const scale = Math.min(viewport.width / aspect, viewport.height) * 0.8;
    meshRef.current.scale.set(aspect * scale, scale, 1);
  }, [viewport, aspect]);
  
  // Set initial rotation to immediately show the 3D effect
  useEffect(() => {
    if(meshRef.current) {
      meshRef.current.rotation.x = -0.15;
      meshRef.current.rotation.y = 0.4;
    }
  }, []);

  useFrame(() => {
    if (meshRef.current) {
      const targetRotationY = pointer.current.x * 0.6;
      const targetRotationX = pointer.current.y * -0.3;

      // Smoothly interpolate to the target rotation (lerp)
      meshRef.current.rotation.y += (targetRotationY - meshRef.current.rotation.y) * 0.05;
      meshRef.current.rotation.x += (targetRotationX - meshRef.current.rotation.x) * 0.05;
    }
  });

  return (
    // Add key prop to force re-creation of the mesh when detail changes
    <mesh ref={meshRef} key={meshDetail}>
      <planeGeometry args={planeArgs} />
      <meshStandardMaterial
        map={colorMap}
        displacementMap={depthMap}
        displacementScale={displacementScale}
        metalness={0.2}
        roughness={0.4}
      />
    </mesh>
  );
};

const CameraParallaxController: React.FC<{ pointer: React.MutableRefObject<Vector2> }> = ({ pointer }) => {
  // Parallax Motion Engine: Move camera slightly for a better parallax effect
  useFrame((state) => {
    const targetX = pointer.current.x * -0.1;
    const targetY = pointer.current.y * -0.1;

    state.camera.position.x = MathUtils.lerp(state.camera.position.x, targetX, 0.05);
    state.camera.position.y = MathUtils.lerp(state.camera.position.y, targetY, 0.05);
    state.camera.lookAt(0, 0, 0);
  });
  return null;
};

const ChromaticAberrationEffect: React.FC<{ pointer: React.MutableRefObject<Vector2> }> = ({ pointer }) => {
  const aberrationRef = useRef<any>(null!);
  useFrame(() => {
    if (aberrationRef.current) {
      // Base the aberration on the distance from center, making it stronger at edges
      const offsetStrength = pointer.current.length() * 0.002;
      aberrationRef.current.offset.set(pointer.current.x * offsetStrength, pointer.current.y * offsetStrength);
    }
  });
  return <ChromaticAberration ref={aberrationRef} offset={new Vector2(0, 0)} />;
};

interface ParallaxSceneProps {
  imageUrl: string;
  depthUrl: string;
  pointer: React.MutableRefObject<Vector2>;
  displacementScale: number;
  meshDetail: number;
  bloomIntensity: number;
  isPerfSucks: boolean;
  onIncline: () => void;
  onDecline: () => void;
}

export const ParallaxScene: React.FC<ParallaxSceneProps> = ({ 
  imageUrl, 
  depthUrl, 
  pointer, 
  displacementScale, 
  meshDetail,
  bloomIntensity, 
  isPerfSucks,
  onIncline,
  onDecline,
}) => {
  return (
    <Canvas camera={{ position: [0, 0, 2], fov: 50 }}>
      <PerformanceMonitor onIncline={onIncline} onDecline={onDecline} />
      <React.Suspense fallback={null}>
        {/* Softer ambient light to fill in shadows */}
        <ambientLight intensity={0.5} />
        {/* A soft directional light from the side to give shape */}
        <directionalLight position={[3, 2, 5]} intensity={1.5} />
        {/* Interactive point light that follows the cursor */}
        <PointerLight pointer={pointer} />
        <SceneContent
          imageUrl={imageUrl}
          depthUrl={depthUrl}
          pointer={pointer}
          displacementScale={displacementScale}
          meshDetail={meshDetail}
        />
        {/* Beautiful realistic lighting */}
        <Environment preset="sunset" />

        {/* Controller for camera parallax effect */}
        <CameraParallaxController pointer={pointer} />
        
        {/* Conditionally render post-processing effects for performance */}
        {!isPerfSucks && (
          <EffectComposer>
            <DepthOfField
              focusDistance={0.01}
              focalLength={0.2}
              bokehScale={4}
              height={480}
            />
            <Bloom 
              intensity={bloomIntensity} 
              luminanceThreshold={0.1}
              luminanceSmoothing={0.9}
              mipmapBlur
            />
            <ChromaticAberrationEffect pointer={pointer} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
          </EffectComposer>
        )}
      </React.Suspense>
    </Canvas>
  );
};