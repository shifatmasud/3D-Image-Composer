
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

    // Discard fragment if it's part of the background, handled by the displacement mesh
    if (depth < uDepthThreshold) {
      discard;
    }

    // --- New Volumetric Blending Logic ---
    
    // Calculate the total depth range for the foreground slices
    float foregroundDepthRange = 1.0 - uDepthThreshold;

    // Determine the ideal depth for this specific layer (from 0.0 to foregroundDepthRange)
    float layerDepth = (uLayerIndex / (uNumLayers - 1.0)) * foregroundDepthRange;
    
    // Get the depth of the current pixel within the foreground range
    float pixelDepth = depth - uDepthThreshold;

    // Calculate the distance of the pixel's depth from this layer's ideal depth
    float depthDifference = abs(pixelDepth - layerDepth);

    // Use smoothstep to create a falloff curve based on the blend range.
    // The alpha is 1.0 when the pixel's depth is exactly at the layer's depth,
    // and it fades to 0.0 as it moves away, controlled by uBlendRange.
    float alpha = 1.0 - smoothstep(0.0, uBlendRange, depthDifference);

    if (alpha < 0.01) {
      discard;
    }

    gl_FragColor = vec4(color.rgb, color.a * alpha);
  }
`;

interface LayeredImageProps {
  imageUrl: string;
  depthUrl: string;
  layerCount: number;
  depthScale: number;
  baseDepth: number;
  layerBlending: number;
  normalIntensity: number;
}

export const LayeredImage = React.forwardRef<THREE.Group, LayeredImageProps>(({ 
  imageUrl, 
  depthUrl, 
  layerCount, 
  depthScale,
  baseDepth,
  layerBlending,
  normalIntensity,
}, ref) => {
  const [colorMap, depthMap] = useLoader(THREE.TextureLoader, [imageUrl, depthUrl]);
  const { viewport } = useThree();

  const scale = useMemo(() => {
    const aspect = colorMap.image.width / colorMap.image.height;
    const baseScale = Math.min(viewport.width / aspect, viewport.height) * 0.9;
    return [baseScale * aspect, baseScale, 1];
  }, [viewport, colorMap]);

  // Fix: Corrected the type of the 'shader' parameter to 'any'. The `THREE.WebGLProgramParameters`
  // type is incorrect for the onBeforeCompile callback and lacks the 'uniforms' property in
  // some `@types/three` versions, leading to a compile error. The correct internal 'Shader' type
  // is not exported from Three.js, so 'any' is used as a workaround.
  const onBeforeCompile = (shader: any) => {
    // Pass custom uniforms to the shader for dynamic normal mapping
    shader.uniforms.uDepthMap = { value: depthMap };
    shader.uniforms.uNormalIntensity = { value: normalIntensity };
    shader.uniforms.uBaseDepth = { value: baseDepth };

    const uniformDeclarations = `
        uniform sampler2D uDepthMap;
        uniform float uNormalIntensity;
        uniform float uBaseDepth;
        varying vec2 vUv;
    `;
    
    const customNormalLogic = `
        vec2 texelSize = 1.0 / vec2(textureSize(uDepthMap, 0));
        float scale = uBaseDepth * 10.0 * uNormalIntensity;

        float hx0 = (1.0 - texture2D(uDepthMap, vUv - vec2(texelSize.x, 0.0)).r);
        float hx1 = (1.0 - texture2D(uDepthMap, vUv + vec2(texelSize.x, 0.0)).r);
        float hy0 = (1.0 - texture2D(uDepthMap, vUv - vec2(0.0, texelSize.y)).r);
        float hy1 = (1.0 - texture2D(uDepthMap, vUv + vec2(0.0, texelSize.y)).r);

        vec3 va = normalize(vec3(texelSize.x * 2.0, 0.0, (hx1 - hx0) * scale));
        vec3 vb = normalize(vec3(0.0, texelSize.y * 2.0, (hy1 - hy0) * scale));
        
        vec3 detailNormal = cross(vb, va);
        
        normal = normalize(normal - detailNormal);
    `;
    
    // Modify Vertex Shader to pass UV coordinates to fragment shader
    shader.vertexShader = `
        varying vec2 vUv;
        ${shader.vertexShader}
    `.replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>\n        vUv = uv;`
    );

    // Modify Fragment Shader to declare uniforms and inject custom logic
    shader.fragmentShader = `
        ${uniformDeclarations}
        ${shader.fragmentShader}
    `.replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>\n${customNormalLogic}`
    );
  };

  const layers = useMemo(() => {
    // This threshold separates the background (handled by displacement) 
    // from the foreground (handled by slicing).
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
      {/* Base Layer: 2D Mesh with Displacement for the background */}
      <mesh
        // Position it at the very back of the depth range
        position-z={-depthScale}
      >
        {/* Higher-resolution plane for smoother displacement and anti-noise */}
        <planeGeometry args={[1, 1, 512, 512]} />
        <meshStandardMaterial
          map={colorMap}
          displacementMap={depthMap}
          displacementScale={baseDepth}
          // Tweak material properties for a smoother, less noisy appearance
          roughness={0.6}
          metalness={0.1}
          onBeforeCompile={onBeforeCompile}
        />
      </mesh>
      
      {/* Top Layers: Sliced planes for foreground hyper-realism */}
      {layers}
    </group>
  );
});