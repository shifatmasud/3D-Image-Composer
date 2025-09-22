/// <reference types="@react-three/fiber" />

import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { Mesh, PlaneGeometry, TextureLoader, Vector2 } from 'three';

interface SceneContentProps {
  imageUrl: string;
  depthUrl: string;
  pointer: React.MutableRefObject<Vector2>;
  displacementScale: number;
  meshDetail: number;
}

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
        roughness={0.6}
      />
    </mesh>
  );
};

interface ParallaxSceneProps {
  imageUrl: string;
  depthUrl: string;
  pointer: React.MutableRefObject<Vector2>;
  displacementScale: number;
  meshDetail: number;
}

export const ParallaxScene: React.FC<ParallaxSceneProps> = ({ imageUrl, depthUrl, pointer, displacementScale, meshDetail }) => {
  return (
    <Canvas camera={{ position: [0, 0, 2], fov: 50 }}>
      <React.Suspense fallback={null}>
        {/* A soft directional light from the side to give shape */}
        <directionalLight position={[3, 2, 5]} intensity={2.5} />
        <SceneContent
          imageUrl={imageUrl}
          depthUrl={depthUrl}
          pointer={pointer}
          displacementScale={displacementScale}
          meshDetail={meshDetail}
        />
        {/* Beautiful realistic lighting */}
        <Environment preset="sunset" />
      </React.Suspense>
    </Canvas>
  );
};
