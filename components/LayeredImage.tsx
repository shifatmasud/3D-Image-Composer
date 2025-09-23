// Fix: Added a side-effect import of '@react-three/fiber' to provide JSX type augmentation for three.js elements.
import '@react-three/fiber';
import React, { useMemo, useEffect, useRef } from 'react';
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
  uniform float uBackgroundCutoff;
  uniform float uFeather;
  in vec2 vUv;
  out vec4 outColor;

  void main() {
    vec4 color = texture(uColorMap, vUv);
    float depth = texture(uDepthMap, vUv).r;
    
    float alpha = smoothstep(uBackgroundCutoff - uFeather, uBackgroundCutoff + uFeather, depth);
    
    if (alpha < 0.01) discard;

    outColor = vec4(color.rgb, color.a * alpha);
  }
`;

const backgroundFragmentShader = `
  uniform sampler2D uColorMap;
  uniform sampler2D uDepthMap;
  uniform float uBackgroundCutoff;
  uniform float uFeather;
  in vec2 vUv;
  out vec4 outColor;

  void main() {
    vec4 color = texture(uColorMap, vUv);
    float depth = texture(uDepthMap, vUv).r;
    
    float alpha = 1.0 - smoothstep(uBackgroundCutoff - uFeather, uBackgroundCutoff + uFeather, depth);

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
  feather: number;
  backgroundCutoff: number;
}

export const LayeredImage = React.forwardRef<THREE.Group, LayeredImageProps>(({ 
  imageUrl, 
  depthUrl, 
  depthScale,
  feather,
  backgroundCutoff,
}, ref) => {
  const [colorMap, depthMap] = useLoader(THREE.TextureLoader, [imageUrl, depthUrl]);
  const { viewport, gl } = useThree();

  const backgroundMaterialRef = useRef<THREE.ShaderMaterial>(null);
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

  // Imperatively update shader uniforms every frame. This is a robust way to
  // ensure the GPU always has the latest state for frequently changing values.
  useFrame(() => {
    if (backgroundMaterialRef.current) {
        backgroundMaterialRef.current.uniforms.uBackgroundCutoff.value = backgroundCutoff;
        backgroundMaterialRef.current.uniforms.uFeather.value = feather;
    }
    if (foregroundMaterialRef.current) {
        foregroundMaterialRef.current.uniforms.uBackgroundCutoff.value = backgroundCutoff;
        foregroundMaterialRef.current.uniforms.uFeather.value = feather;
        foregroundMaterialRef.current.uniforms.uDepthScale.value = depthScale;
    }
  });

  const scale = useMemo(() => {
    const aspect = colorMap.image.width / colorMap.image.height;
    const baseScale = Math.min(viewport.width / aspect, viewport.height) * 0.9;
    return [baseScale * aspect, baseScale, 1];
  }, [viewport, colorMap]);
  
  // Memoize the uniform objects to create them only when textures change.
  // The values will be updated imperatively in the useFrame hook.
  const backgroundUniforms = useMemo(() => ({
    uColorMap: { value: colorMap },
    uDepthMap: { value: depthMap },
    uBackgroundCutoff: { value: 0 },
    uFeather: { value: 0 },
  }), [colorMap, depthMap]);

  const foregroundUniforms = useMemo(() => ({
    ...backgroundUniforms,
    uDepthScale: { value: 0 },
  }), [backgroundUniforms]);

  const infillUniforms = useMemo(() => ({
    uColorMap: { value: colorMap },
    uBlurLevel: { value: 5.0 }, // Hardcoded blur level for the infill
  }), [colorMap]);

  return (
    <group ref={ref} scale={scale as [number, number, number]}>
      {/* Infill Plane: Fills occlusion gaps with a blurred version of the image */}
      <mesh
        position-z={-depthScale * 0.51} // Positioned just behind the main background
      >
        <planeGeometry args={[1.2, 1.2]} /> {/* Slightly larger to avoid edge seams */}
        <shaderMaterial
          key={`${depthUrl}-infill`}
          uniforms={infillUniforms}
          vertexShader={simpleVertexShader}
          fragmentShader={infillFragmentShader}
          glslVersion={THREE.GLSL3}
        />
      </mesh>
      
      {/* Background Plane: Renders the crisp, visible parts of the background */}
      <mesh
        position-z={-depthScale * 0.5}
      >
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          ref={backgroundMaterialRef}
          key={`${depthUrl}-background`} // Recreate material if the depth map source changes
          uniforms={backgroundUniforms}
          vertexShader={simpleVertexShader}
          fragmentShader={backgroundFragmentShader}
          transparent={true}
          glslVersion={THREE.GLSL3}
        />
      </mesh>

      {/* Foreground Mesh: A single, highly-tessellated plane displaced by the depth map to create a solid 3D object */}
      <mesh>
        <planeGeometry args={[1, 1, 256, 256]} />
        <shaderMaterial
          ref={foregroundMaterialRef}
          key={`${depthUrl}-foreground`} // Recreate material if the depth map source changes
          uniforms={foregroundUniforms}
          vertexShader={displaceVertexShader}
          fragmentShader={foregroundFragmentShader}
          transparent={true}
          glslVersion={THREE.GLSL3}
        />
      </mesh>
    </group>
  );
});