// Fix: Use a side-effect import to ensure React Three Fiber's JSX type definitions are loaded correctly. This resolves issues with TypeScript not recognizing custom R3F elements.
import '@react-three/fiber';
import React, { useMemo } from 'react';
import { useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D uColorMap;
  uniform sampler2D uDepthMap;
  uniform float uLayerIndex;
  uniform float uNumLayers;
  uniform float uDepthThreshold; // Defines the start of the foreground slicing
  uniform float uBlendRange; // Controls the softness of the blend between layers
  varying vec2 vUv;

  void main() {
    vec4 color = texture2D(uColorMap, vUv);
    // Invert depth map (convention: white = near, black = far)
    float depth = 1.0 - texture2D(uDepthMap, vUv).r;

    // --- New Anti-Aliased Edge Feathering ---
    // Instead of a hard discard, create a soft transition (feather) at the edge
    // of the foreground object. The feather amount is based on the blend range.
    float featherAmount = uBlendRange * 0.5;
    float edgeAlpha = smoothstep(uDepthThreshold - featherAmount, uDepthThreshold + featherAmount, depth);

    // --- Volumetric Blending Logic ---
    float foregroundDepthRange = 1.0 - uDepthThreshold;
    float layerDepth = (uLayerIndex / (uNumLayers - 1.0)) * foregroundDepthRange;
    float pixelDepth = depth - uDepthThreshold;
    float depthDifference = abs(pixelDepth - layerDepth);
    float layerAlpha = 1.0 - smoothstep(0.0, uBlendRange, depthDifference);

    // Combine edge feathering with the volumetric layer alpha
    float finalAlpha = edgeAlpha * layerAlpha;
    
    // Discard pixels that are fully transparent to improve performance
    if (finalAlpha < 0.01) {
      discard;
    }

    gl_FragColor = vec4(color.rgb, color.a * finalAlpha);
  }
`;

interface LayeredImageProps {
  imageUrl: string;
  depthUrl: string;
  layerCount: number;
  depthScale: number;
  layerBlending: number;
}

export const LayeredImage = React.forwardRef<THREE.Group, LayeredImageProps>(({ 
  imageUrl, 
  depthUrl, 
  layerCount, 
  depthScale,
  layerBlending,
}, ref) => {
  const [colorMap, depthMap] = useLoader(THREE.TextureLoader, [imageUrl, depthUrl]);
  const { viewport } = useThree();

  const scale = useMemo(() => {
    const aspect = colorMap.image.width / colorMap.image.height;
    const baseScale = Math.min(viewport.width / aspect, viewport.height) * 0.9;
    return [baseScale * aspect, baseScale, 1];
  }, [viewport, colorMap]);

  const layers = useMemo(() => {
    // This threshold separates the background from the foreground (handled by slicing).
    const depthThreshold = 0.5;

    return Array.from({ length: layerCount }, (_, i) => (
      <mesh
        key={i}
        // Distribute layers across the depth scale
        position-z={-(i / (layerCount -1)) * depthScale}
      >
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          uniforms={{
            uColorMap: { value: colorMap },
            uDepthMap: { value: depthMap },
            uLayerIndex: { value: i },
            uNumLayers: { value: layerCount },
            uDepthThreshold: { value: depthThreshold },
            uBlendRange: { value: layerBlending },
          }}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          transparent={true}
        />
      </mesh>
    ));
  }, [layerCount, depthScale, colorMap, depthMap, layerBlending]);

  return (
    <group ref={ref} scale={scale as [number, number, number]}>
      {/* Top Layers: Sliced planes for foreground hyper-realism */}
      {layers}
    </group>
  );
});