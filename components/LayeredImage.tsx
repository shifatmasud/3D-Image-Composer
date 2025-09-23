// Fix: Added a side-effect import of '@react-three/fiber' to provide JSX type augmentation for three.js elements.
import '@react-three/fiber';
import React, { useMemo, useEffect, useRef, useImperativeHandle } from 'react';
import { useLoader, useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// GLSL 3 Shaders. Note: #version and precision are removed, as Three.js handles them.
// Built-in attributes like 'position' and 'uv' are also provided automatically.
const displaceVertexShader = `
  uniform sampler2D uDepthMap;
  uniform float uDepthScale;
  out vec2 vUv;

  void main() {
    vUv = uv;
    float depth = texture(uDepthMap, vUv).r;
    vec3 displacedPosition = position;
    displacedPosition.z += (depth - 0.5) * uDepthScale;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
  }
`;

const foregroundFragmentShader = `
  uniform sampler2D uColorMap;
  uniform sampler2D uDepthMap;
  uniform float uMiddlegroundCutoff; // New: Use middleground cutoff for foreground
  uniform float uLayerBlending;
  in vec2 vUv;
  out vec4 outColor;

  void main() {
    vec4 color = texture(uColorMap, vUv);
    float depth = texture(uDepthMap, vUv).r;
    
    // Foreground is everything *above* the middleground cutoff
    float alpha = smoothstep(uMiddlegroundCutoff - uLayerBlending, uMiddlegroundCutoff + uLayerBlending, depth);
    
    if (alpha < 0.01) discard;

    outColor = vec4(color.rgb, color.a * alpha);
  }
`;

const middlegroundFragmentShader = `
  uniform sampler2D uColorMap;
  uniform sampler2D uDepthMap;
  uniform float uBackgroundCutoff;
  uniform float uMiddlegroundCutoff;
  uniform float uLayerBlending;
  in vec2 vUv;
  out vec4 outColor;

  void main() {
    vec4 color = texture(uColorMap, vUv);
    float depth = texture(uDepthMap, vUv).r;
    
    // Create a feathered "band" for the middleground
    float alpha1 = smoothstep(uBackgroundCutoff - uLayerBlending, uBackgroundCutoff + uLayerBlending, depth);
    float alpha2 = 1.0 - smoothstep(uMiddlegroundCutoff - uLayerBlending, uMiddlegroundCutoff + uLayerBlending, depth);
    float alpha = min(alpha1, alpha2);

    if (alpha < 0.01) discard;

    outColor = vec4(color.rgb, color.a * alpha);
  }
`;


const backgroundFragmentShader = `
  uniform sampler2D uColorMap;
  uniform sampler2D uDepthMap;
  uniform float uBackgroundCutoff;
  uniform float uLayerBlending;
  in vec2 vUv;
  out vec4 outColor;

  void main() {
    vec4 color = texture(uColorMap, vUv);
    float depth = texture(uDepthMap, vUv).r;
    
    // Background is everything *below* the background cutoff
    float alpha = 1.0 - smoothstep(uBackgroundCutoff - uLayerBlending, uBackgroundCutoff + uLayerBlending, depth);

    if (alpha < 0.01) discard;

    outColor = vec4(color.rgb, color.a * alpha);
  }
`;

const simpleVertexShader = `
  out vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const infillFragmentShader = `
  uniform sampler2D uColorMap;
  uniform float uBlurLevel;
  in vec2 vUv;
  out vec4 outColor;

  void main() {
    // Sample from a lower mipmap level to get a blurred texture, filling occluded areas.
    outColor = textureLod(uColorMap, vUv, uBlurLevel);
  }
`;


interface LayeredImageProps {
  imageUrl: string;
  depthUrl: string;
  depthScale: number;
  layerBlending: number;
  backgroundCutoff: number;
  middlegroundCutoff: number; // New prop for mid-layer
}

export interface LayeredImageRef {
  exportForGLB: () => THREE.Group | null;
}

export const LayeredImage = React.forwardRef<LayeredImageRef, LayeredImageProps>(({ 
  imageUrl, 
  depthUrl, 
  depthScale,
  layerBlending,
  backgroundCutoff,
  middlegroundCutoff,
}, ref) => {
  const [colorMap, depthMap] = useLoader(THREE.TextureLoader, [imageUrl, depthUrl]);
  const { viewport, gl } = useThree();

  const backgroundMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const middlegroundMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const foregroundMaterialRef = useRef<THREE.ShaderMaterial>(null);

  useEffect(() => {
    const maxAnisotropy = gl.capabilities.getMaxAnisotropy();
    colorMap.generateMipmaps = true; // Crucial for the blur-infill effect
    colorMap.minFilter = THREE.LinearMipmapLinearFilter;
    colorMap.magFilter = THREE.LinearFilter;
    colorMap.wrapS = THREE.ClampToEdgeWrapping;
    colorMap.wrapT = THREE.ClampToEdgeWrapping;
    colorMap.anisotropy = maxAnisotropy;
    colorMap.needsUpdate = true;

    depthMap.minFilter = THREE.NearestFilter;
    depthMap.magFilter = THREE.NearestFilter;
    depthMap.wrapS = THREE.ClampToEdgeWrapping;
    depthMap.wrapT = THREE.ClampToEdgeWrapping;
    depthMap.needsUpdate = true;
  }, [colorMap, depthMap, gl]);

  // Imperatively update shader uniforms every frame.
  useFrame(() => {
    const materials = [backgroundMaterialRef.current, middlegroundMaterialRef.current, foregroundMaterialRef.current];
    for (const material of materials) {
        if (material) {
            material.uniforms.uBackgroundCutoff.value = backgroundCutoff;
            material.uniforms.uMiddlegroundCutoff.value = middlegroundCutoff;
            material.uniforms.uLayerBlending.value = layerBlending;
        }
    }
    if (foregroundMaterialRef.current) {
        foregroundMaterialRef.current.uniforms.uDepthScale.value = depthScale;
    }
    if (middlegroundMaterialRef.current) {
        middlegroundMaterialRef.current.uniforms.uDepthScale.value = depthScale;
    }
  });

  const scale = useMemo(() => {
    const aspect = colorMap.image.width / colorMap.image.height;
    const baseScale = Math.min(viewport.width / aspect, viewport.height) * 0.9;
    return [baseScale * aspect, baseScale, 1];
  }, [viewport, colorMap]);
  
  const baseUniforms = useMemo(() => ({
    uColorMap: { value: colorMap },
    uDepthMap: { value: depthMap },
    uBackgroundCutoff: { value: 0 },
    uMiddlegroundCutoff: { value: 0 },
    uLayerBlending: { value: 0 },
  }), [colorMap, depthMap]);

  const displacedUniforms = useMemo(() => ({
    ...baseUniforms,
    uDepthScale: { value: 0 },
  }), [baseUniforms]);

  const infillUniforms = useMemo(() => ({
    uColorMap: { value: colorMap },
    uBlurLevel: { value: 5.0 }, // Hardcoded blur level for the infill
  }), [colorMap]);

  useImperativeHandle(ref, () => ({
    exportForGLB: () => {
      if (!depthMap.image || !colorMap.image) {
        console.error("Images not loaded for export.");
        return null;
      }
  
      const geometry = new THREE.PlaneGeometry(1, 1, 256, 256);
      const positions = geometry.attributes.position.array as Float32Array;
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return null;
      
      canvas.width = depthMap.image.width;
      canvas.height = depthMap.image.height;
      context.drawImage(depthMap.image, 0, 0);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  
      const getDepth = (u: number, v: number) => {
        const x = Math.floor(u * (canvas.width - 1));
        const y = Math.floor(v * (canvas.height - 1));
        const index = (y * canvas.width + x) * 4;
        return imageData.data[index] / 255.0;
      };
  
      for (let i = 0; i < positions.length / 3; i++) {
        const x = positions[i * 3];
        const y = positions[i * 3 + 1];
        
        const u = x + 0.5;
        const v = 1.0 - (y + 0.5); // Flip V for texture sampling
  
        const depth = getDepth(u, v);
        positions[i * 3 + 2] = (depth - 0.5) * depthScale;
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.computeVertexNormals();
  
      const material = new THREE.MeshStandardMaterial({
        map: colorMap,
        metalness: 0.1,
        roughness: 0.8,
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      
      const group = new THREE.Group();
      group.add(mesh);
      group.scale.set(scale[0], scale[1], scale[2]);
  
      return group;
    }
  }));

  return (
    <group scale={scale as [number, number, number]}>
      {/* Infill Plane */}
      <mesh position-z={-depthScale * 0.76}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          key={`${depthUrl}-infill`}
          uniforms={infillUniforms}
          vertexShader={simpleVertexShader}
          fragmentShader={infillFragmentShader}
          glslVersion={THREE.GLSL3}
        />
      </mesh>
      
      {/* Background Plane */}
      <mesh position-z={-depthScale * 0.75}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          ref={backgroundMaterialRef}
          key={`${depthUrl}-background`}
          uniforms={baseUniforms}
          vertexShader={simpleVertexShader}
          fragmentShader={backgroundFragmentShader}
          transparent={true}
          glslVersion={THREE.GLSL3}
        />
      </mesh>

      {/* Middleground Mesh */}
      <mesh position-z={-depthScale * 0.25}>
        <planeGeometry args={[1, 1, 256, 256]} />
        <shaderMaterial
          ref={middlegroundMaterialRef}
          key={`${depthUrl}-middleground`}
          uniforms={displacedUniforms}
          vertexShader={displaceVertexShader}
          fragmentShader={middlegroundFragmentShader}
          transparent={true}
          glslVersion={THREE.GLSL3}
        />
      </mesh>

      {/* Foreground Mesh */}
      <mesh>
        <planeGeometry args={[1, 1, 256, 256]} />
        <shaderMaterial
          ref={foregroundMaterialRef}
          key={`${depthUrl}-foreground`}
          uniforms={displacedUniforms}
          vertexShader={displaceVertexShader}
          fragmentShader={foregroundFragmentShader}
          transparent={true}
          glslVersion={THREE.GLSL3}
        />
      </mesh>
    </group>
  );
});