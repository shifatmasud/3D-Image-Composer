// Fix: Added a side-effect import of '@react-three/fiber' to provide JSX type augmentation for three.js elements.
import '@react-three/fiber';
import React, { useState, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { ThemeProvider, createGlobalStyle, keyframes } from 'styled-components';
import styled from 'styled-components';
import { DownloadSimple, UploadSimple, ArchiveBox, Image as ImageIcon } from 'phosphor-react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { motion as motion3d } from 'framer-motion-3d';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

// From style.tsx

export const theme = {
  colors: {
    background: '#121212',
    primaryText: '#EAEAEA',
    secondaryText: '#A0A0A0',
    warning: '#FFD700',
  },
  fonts: {
    body: "'Inter', sans-serif",
  },
  effects: {
    transition: 'all 0.8s cubic-bezier(0.25, 1, 0.5, 1)',
  },
};

export type ThemeType = typeof theme;

declare module 'styled-components' {
  export interface DefaultTheme extends ThemeType {}
}

const fadeInOut = keyframes`
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  20%, 80% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(-10px);
  }
`;

const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: ${({ theme }) => theme.fonts.body};
    background-color: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.primaryText};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow: hidden;
  }
`;

export const AppContainer = styled.div`
  display: flex;
  flex-direction: row;
  height: 100vh;
  width: 100vw;
  background-color: ${({ theme }) => theme.colors.background};
`;

export const MainContent = styled.main`
  flex-grow: 1;
  position: relative;
  height: 100%;
`;

export const CanvasContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
`;

export const SidePanel = styled(motion.aside)`
  width: 320px;
  flex-shrink: 0;
  background-color: rgba(18, 18, 18, 0.8);
  backdrop-filter: blur(10px);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  z-index: 20;
  overflow-y: auto;
`;

export const PanelTitle = styled.h2`
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primaryText};
  text-align: left;
  margin-bottom: 5px;
  margin-top: 10px;

  &:first-child {
    margin-top: 0;
  }
`;

export const ControlGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;


export const SliderLabel = styled.label`
  color: ${({ theme }) => theme.colors.primaryText};
  font-size: 14px;
  font-weight: 500;
  width: 100%;
  text-align: left;
`;

export const Slider = styled.input.attrs({ type: 'range' })`
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 8px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.3);
  outline: none;
  opacity: 0.8;
  transition: opacity 0.2s;
  cursor: pointer;

  &:hover {
    opacity: 1;
  }

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.primaryText};
    cursor: pointer;
  }

  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.primaryText};
    cursor: pointer;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;

    &::-webkit-slider-thumb {
      background: ${({ theme }) => theme.colors.secondaryText};
      cursor: not-allowed;
    }

    &::-moz-range-thumb {
      background: ${({ theme }) => theme.colors.secondaryText};
      cursor: not-allowed;
    }
  }
`;

export const UploadContainer = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(18, 18, 18, 0.7);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
`;

export const UploadBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: rgba(0, 0, 0, 0.7);
  padding: 40px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

export const FileInputLabel = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  border: 2px dashed ${({ theme }) => theme.colors.secondaryText};
  border-radius: 8px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.secondaryText};
  transition: ${({ theme }) => theme.effects.transition};
  width: 300px;
  text-align: center;

  p {
    margin: 10px 0 5px;
    color: ${({ theme }) => theme.colors.primaryText};
  }
  
  span {
    font-size: 12px;
  }

  &:hover {
    border-color: ${({ theme }) => theme.colors.primaryText};
    color: ${({ theme }) => theme.colors.primaryText};
  }
`;

export const HiddenInput = styled.input`
  display: none;
`;

export const LoaderContainer = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 50px;
  height: 50px;
  margin-left: -25px;
  margin-top: -25px;
  border: 5px solid rgba(255, 255, 255, 0.2);
  border-top-color: ${({ theme }) => theme.colors.primaryText};
  border-radius: 50%;
  animation: ${rotate} 1s linear infinite;
  z-index: 10;
`;

export const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
`;

export const ToggleLabel = styled.label`
  color: ${({ theme }) => theme.colors.primaryText};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
`;

export const HiddenCheckbox = styled.input.attrs({ type: 'checkbox' })`
  border: 0;
  clip: rect(0 0 0 0);
  clippath: inset(50%);
  height: 1px;
  margin: -1px;
  overflow: hidden;
  padding: 0;
  position: absolute;
  white-space: nowrap;
  width: 1px;
`;

export const StyledToggle = styled.label`
  cursor: pointer;
  text-indent: -9999px;
  width: 50px;
  height: 25px;
  background: grey;
  display: block;
  border-radius: 100px;
  position: relative;
  transition: background-color 0.3s;
  
  &:after {
    content: '';
    position: absolute;
    top: 2.5px;
    left: 2.5px;
    width: 20px;
    height: 20px;
    background: #fff;
    border-radius: 90px;
    transition: 0.3s;
  }

  ${HiddenCheckbox}:checked + & {
    background: #4caf50;
  }

  ${HiddenCheckbox}:checked + &:after {
    left: calc(100% - 2.5px);
    transform: translateX(-100%);
  }

  &:active:after {
    width: 25px;
  }
`;

export const PresetButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 15px;
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: ${({ theme }) => theme.colors.primaryText};
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  justify-content: center;

  &:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

export const Separator = styled.hr`
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin: 10px 0;
`;

// From hooks/usePointer.ts
const usePointer = (targetRef: React.RefObject<HTMLElement>) => {
  const pointer = useRef(new THREE.Vector2());

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

// From components/Loader.tsx
const Loader: React.FC = () => {
  return <LoaderContainer />;
};

// From components/Uploader.tsx
interface UploaderProps {
  onFilesSelected: (imageFile: File, depthFile: File) => void;
}

const Uploader: React.FC<UploaderProps> = ({ onFilesSelected }) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [depthFile, setDepthFile] = useState<File | null>(null);

  useEffect(() => {
    if (imageFile && depthFile) {
      onFilesSelected(imageFile, depthFile);
    }
  }, [imageFile, depthFile, onFilesSelected]);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<File | null>>
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setter(file);
    }
  };

  return (
    <UploadContainer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
    >
      <UploadBox>
        <FileInputLabel>
          <ImageIcon size={48} weight="light" />
          <p>{imageFile ? `Selected: ${imageFile.name}` : 'Upload your Image'}</p>
          <span>Max 5MB. PNG, JPG.</span>
          <HiddenInput
            type="file"
            accept="image/png, image/jpeg"
            onChange={(e) => handleFileChange(e, setImageFile)}
          />
        </FileInputLabel>
        <FileInputLabel>
          <UploadSimple size={48} weight="light" />
          <p>{depthFile ? `Selected: ${depthFile.name}` : 'Upload your Depth Map'}</p>
          <span>A grayscale image for depth.</span>
          <HiddenInput
            type="file"
            accept="image/png, image/jpeg"
            onChange={(e) => handleFileChange(e, setDepthFile)}
          />
        </FileInputLabel>
      </UploadBox>
    </UploadContainer>
  );
};

// From components/FloatingParticles.tsx
interface FloatingParticlesProps {
  count: number;
  pointer: React.MutableRefObject<THREE.Vector2>;
}

const FloatingParticles: React.FC<FloatingParticlesProps> = ({ count, pointer }) => {
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
        
        posArray[i3] -= pointer.current.x * delta * 0.5;
        posArray[i3 + 1] -= pointer.current.y * delta * 0.5;

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


// From components/LayeredImage.tsx
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
  uniform float uMiddlegroundCutoff;
  uniform float uLayerBlending;
  in vec2 vUv;
  out vec4 outColor;

  void main() {
    vec4 color = texture(uColorMap, vUv);
    float depth = texture(uDepthMap, vUv).r;
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
    outColor = textureLod(uColorMap, vUv, uBlurLevel);
  }
`;
interface LayeredImageProps {
  imageUrl: string;
  depthUrl: string;
  depthScale: number;
  layerBlending: number;
  backgroundCutoff: number;
  middlegroundCutoff: number;
}
export interface LayeredImageRef {
  exportForGLB: () => THREE.Group | null;
}
const LayeredImage = forwardRef<LayeredImageRef, LayeredImageProps>(({ 
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
    colorMap.generateMipmaps = true;
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
    uBlurLevel: { value: 5.0 },
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
        const v = 1.0 - (y + 0.5);
        const depth = getDepth(u, v);
        positions[i * 3 + 2] = (depth - 0.5) * depthScale;
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.computeVertexNormals();
      const material = new THREE.MeshStandardMaterial({ map: colorMap, metalness: 0.1, roughness: 0.8 });
      const mesh = new THREE.Mesh(geometry, material);
      const group = new THREE.Group();
      group.add(mesh);
      group.scale.set(scale[0], scale[1], scale[2]);
      return group;
    }
  }));
  return (
    <group scale={scale as [number, number, number]}>
      <mesh position-z={-depthScale * 0.76}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial key={`${depthUrl}-infill`} uniforms={infillUniforms} vertexShader={simpleVertexShader} fragmentShader={infillFragmentShader} glslVersion={THREE.GLSL3} />
      </mesh>
      <mesh position-z={-depthScale * 0.75}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial ref={backgroundMaterialRef} key={`${depthUrl}-background`} uniforms={baseUniforms} vertexShader={simpleVertexShader} fragmentShader={backgroundFragmentShader} transparent={true} glslVersion={THREE.GLSL3} />
      </mesh>
      <mesh position-z={-depthScale * 0.25}>
        <planeGeometry args={[1, 1, 256, 256]} />
        <shaderMaterial ref={middlegroundMaterialRef} key={`${depthUrl}-middleground`} uniforms={displacedUniforms} vertexShader={displaceVertexShader} fragmentShader={middlegroundFragmentShader} transparent={true} glslVersion={THREE.GLSL3} />
      </mesh>
      <mesh>
        <planeGeometry args={[1, 1, 256, 256]} />
        <shaderMaterial ref={foregroundMaterialRef} key={`${depthUrl}-foreground`} uniforms={displacedUniforms} vertexShader={displaceVertexShader} fragmentShader={foregroundFragmentShader} transparent={true} glslVersion={THREE.GLSL3} />
      </mesh>
    </group>
  );
});

// From components/ParallaxScene.tsx
const PointerLight: React.FC<{
  smoothPointerX: ReturnType<typeof useSpring>;
  smoothPointerY: ReturnType<typeof useSpring>;
  isStatic: boolean;
}> = ({ smoothPointerX, smoothPointerY, isStatic }) => {
  const lightRef = useRef<THREE.PointLight>(null!);
  const { viewport } = useThree();
  useFrame(({ clock }) => {
    const targetX = isStatic ? 0 : (smoothPointerX.get() * viewport.width) / 2;
    const targetY = isStatic ? 0 : (smoothPointerY.get() * viewport.height) / 2;
    const targetIntensity = isStatic ? 1.5 : 2.5 + Math.sin(clock.getElapsedTime() * 4) * 0.5;
    if (lightRef.current) {
        lightRef.current.position.x = THREE.MathUtils.lerp(lightRef.current.position.x, targetX, 0.1);
        lightRef.current.position.y = THREE.MathUtils.lerp(lightRef.current.position.y, targetY, 0.1);
        lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, targetIntensity, 0.1);
    }
  });
  return <pointLight ref={lightRef} position-z={1.5} intensity={2.5} distance={7} decay={2} color="#FFDDAA" />;
};
interface ParallaxSceneProps {
  imageUrl: string;
  depthUrl: string;
  pointer: React.MutableRefObject<THREE.Vector2>;
  depthScale: number;
  layerBlending: number;
  backgroundCutoff: number;
  middlegroundCutoff: number;
  isStatic: boolean;
  layeredImageRef: React.RefObject<LayeredImageRef>;
}
const SceneContent: React.FC<ParallaxSceneProps> = ({
  imageUrl, depthUrl, pointer, depthScale, layerBlending, backgroundCutoff, middlegroundCutoff, isStatic, layeredImageRef,
}) => {
  const particleCount = 50;
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothOptions = { stiffness: 200, damping: 40, mass: 1 };
  const smoothPointerX = useSpring(pointerX, smoothOptions);
  const smoothPointerY = useSpring(pointerY, smoothOptions);
  const rotateY = useTransform(smoothPointerX, [-1, 1], [-0.4, 0.4]);
  const rotateX = useTransform(smoothPointerY, [-1, 1], [0.2, -0.2]);
  const cameraX = useTransform(smoothPointerX, [-1, 1], [0.1, -0.1]);
  const cameraY = useTransform(smoothPointerY, [-1, 1], [0.1, -0.1]);
  useFrame(() => {
    pointerX.set(pointer.current.x);
    pointerY.set(pointer.current.y);
  });
  useEffect(() => {
    if (isStatic) {
      pointerX.set(0);
      pointerY.set(0);
    }
  }, [isStatic, pointerX, pointerY]);
  useFrame((state) => {
    const targetX = isStatic ? 0 : cameraX.get();
    const targetY = isStatic ? 0 : cameraY.get();
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetX, 0.05);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetY, 0.05);
    state.camera.lookAt(0, 0, 0);
  });
  return (
    <React.Suspense fallback={null}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 2, 5]} intensity={1.5} />
      <PointerLight smoothPointerX={smoothPointerX} smoothPointerY={smoothPointerY} isStatic={isStatic} />
      <motion3d.group rotation-x={rotateX} rotation-y={rotateY}>
        <LayeredImage ref={layeredImageRef} imageUrl={imageUrl} depthUrl={depthUrl} depthScale={depthScale} layerBlending={layerBlending} backgroundCutoff={backgroundCutoff} middlegroundCutoff={middlegroundCutoff} />
      </motion3d.group>
      <FloatingParticles key={particleCount} count={particleCount} pointer={pointer} />
      <Environment preset="sunset" />
    </React.Suspense>
  );
};
const ParallaxScene: React.FC<ParallaxSceneProps> = (props) => {
  return (
    <Canvas camera={{ position: [0, 0, 2], fov: 50, near: 0.1, far: 20 }}>
      <SceneContent {...props} />
    </Canvas>
  );
};


// Main App component, renamed to New
interface AppState {
  imageUrl: string | null;
  depthUrl: string | null;
}

interface NewProps {
  imageUrl?: string;
  depthUrl?: string;
  depthScale?: number;
  layerBlending?: number;
  backgroundCutoff?: number;
  middlegroundCutoff?: number;
  isStatic?: boolean;
  showUI?: boolean;
}

export default function New({
  imageUrl: propImageUrl,
  depthUrl: propDepthUrl,
  depthScale: propDepthScale,
  layerBlending: propLayerBlending,
  backgroundCutoff: propBackgroundCutoff,
  middlegroundCutoff: propMiddlegroundCutoff,
  isStatic: propIsStatic,
  showUI = true,
}: NewProps) {
  const [files, setFiles] = useState<AppState>({ imageUrl: null, depthUrl: null });
  const [isStatic, setStatic] = useState(propIsStatic ?? false);
  const [backgroundCutoff, setBackgroundCutoff] = useState(propBackgroundCutoff ?? 0.25);
  const [middlegroundCutoff, setMiddlegroundCutoff] = useState(propMiddlegroundCutoff ?? 0.5);
  const [depthScale, setDepthScale] = useState(propDepthScale ?? 0.5);
  const [layerBlending, setLayerBlending] = useState(propLayerBlending ?? 0.1);
  
  const sceneContainerRef = useRef<HTMLDivElement>(null);
  const pointer = usePointer(sceneContainerRef);
  const importRef = useRef<HTMLInputElement>(null);
  const layeredImageRef = useRef<LayeredImageRef>(null);

  // Sync state with props
  useEffect(() => { setStatic(propIsStatic ?? false); }, [propIsStatic]);
  useEffect(() => { setBackgroundCutoff(propBackgroundCutoff ?? 0.25); }, [propBackgroundCutoff]);
  useEffect(() => { setMiddlegroundCutoff(propMiddlegroundCutoff ?? 0.5); }, [propMiddlegroundCutoff]);
  useEffect(() => { setDepthScale(propDepthScale ?? 0.5); }, [propDepthScale]);
  useEffect(() => { setLayerBlending(propLayerBlending ?? 0.1); }, [propLayerBlending]);

  useEffect(() => {
    if (propImageUrl && propDepthUrl) {
      // Clean up previously created object URLs if they exist
      if (files.imageUrl?.startsWith('blob:')) URL.revokeObjectURL(files.imageUrl);
      if (files.depthUrl?.startsWith('blob:')) URL.revokeObjectURL(files.depthUrl);
      setFiles({ imageUrl: propImageUrl, depthUrl: propDepthUrl });
    }
  }, [propImageUrl, propDepthUrl]);

  const neutralDepthMap = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = 'rgb(128, 128, 128)';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    return canvas.toDataURL();
  }, []);

  useEffect(() => {
    return () => {
      if (files.imageUrl?.startsWith('blob:')) URL.revokeObjectURL(files.imageUrl);
      if (files.depthUrl?.startsWith('blob:')) URL.revokeObjectURL(files.depthUrl);
    };
  }, [files]);

  const handleFilesSelected = (imageFile: File, depthFile: File) => {
    if (files.imageUrl?.startsWith('blob:')) URL.revokeObjectURL(files.imageUrl);
    if (files.depthUrl?.startsWith('blob:')) URL.revokeObjectURL(files.depthUrl);
    setFiles({
      imageUrl: URL.createObjectURL(imageFile),
      depthUrl: URL.createObjectURL(depthFile),
    });
  };

  const handleExport = () => {
    const settings = { backgroundCutoff, middlegroundCutoff, depthScale, layerBlending, isStatic };
    const blob = new Blob([JSON.stringify({ version: 4, settings }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'parallax-preset.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    importRef.current?.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              if (json.version >= 3 && json.settings) {
                  const { settings } = json;
                  setBackgroundCutoff(settings.backgroundCutoff ?? 0.25);
                  setMiddlegroundCutoff(settings.middlegroundCutoff ?? 0.5);
                  setDepthScale(settings.depthScale ?? 0.5);
                  setLayerBlending(settings.layerBlending ?? settings.edgeFeather ?? 0.1);
                  setStatic(settings.isStatic ?? false);
              } else {
                  alert('Invalid or outdated preset file.');
              }
          } catch (error) {
              console.error("Error reading preset file:", error);
              alert('Error reading preset file.');
          }
      };
      reader.readAsText(file);
      e.target.value = '';
  };
  
  const handleExportGLB = () => {
    if (layeredImageRef.current) {
      const sceneToExport = layeredImageRef.current.exportForGLB();
      if (sceneToExport) {
        const exporter = new GLTFExporter();
        exporter.parse(
          sceneToExport,
          (result) => {
            const blob = new Blob([result as ArrayBuffer], { type: 'application/octet-stream' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'parallax-scene.glb';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
          },
          (error) => {
            console.error('An error happened during GLB export:', error);
            alert('Failed to export GLB file.');
          },
          { binary: true }
        );
      }
    }
  };

  const handleBackgroundCutoffChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setBackgroundCutoff(value);
    if (value > middlegroundCutoff) setMiddlegroundCutoff(value);
  };

  const handleMiddlegroundCutoffChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setMiddlegroundCutoff(value);
    if (value < backgroundCutoff) setBackgroundCutoff(value);
  };

  const isSceneReady = files.imageUrl && files.depthUrl;
  const uploaderVisible = !isSceneReady && showUI;
  const sidePanelVisible = isSceneReady && showUI;

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <AppContainer>
        <MainContent ref={sceneContainerRef}>
          {isSceneReady && (
            <CanvasContainer>
              <React.Suspense fallback={<Loader />}>
                 <ParallaxScene 
                  layeredImageRef={layeredImageRef}
                  imageUrl={files.imageUrl!} 
                  depthUrl={isStatic ? neutralDepthMap : files.depthUrl!}
                  pointer={pointer}
                  depthScale={depthScale}
                  layerBlending={layerBlending}
                  backgroundCutoff={backgroundCutoff}
                  middlegroundCutoff={middlegroundCutoff}
                  isStatic={isStatic}
                />
              </React.Suspense>
            </CanvasContainer>
          )}
        </MainContent>
        <AnimatePresence>
        {sidePanelVisible && (
          <SidePanel
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          >
            <PanelTitle>Image Controls</PanelTitle>
            <ControlGroup>
              <SliderLabel htmlFor="bg-cutoff-slider">Far-plane Cutoff: {backgroundCutoff.toFixed(2)}</SliderLabel>
              <Slider id="bg-cutoff-slider" min="0" max="1" step="0.01" value={backgroundCutoff} onChange={handleBackgroundCutoffChange} />
            </ControlGroup>
            <ControlGroup>
              <SliderLabel htmlFor="mid-cutoff-slider">Mid-plane Cutoff: {middlegroundCutoff.toFixed(2)}</SliderLabel>
              <Slider id="mid-cutoff-slider" min="0" max="1" step="0.01" value={middlegroundCutoff} onChange={handleMiddlegroundCutoffChange} />
            </ControlGroup>
            <ControlGroup>
              <SliderLabel htmlFor="depth-scale-slider">Depth Scale: {depthScale.toFixed(2)}</SliderLabel>
              <Slider id="depth-scale-slider" min="0" max="2" step="0.01" value={depthScale} onChange={(e) => setDepthScale(parseFloat(e.target.value))} />
            </ControlGroup>
            <ControlGroup>
              <SliderLabel htmlFor="layer-blending-slider">Layer Blending: {layerBlending.toFixed(2)}</SliderLabel>
              <Slider id="layer-blending-slider" min="0.01" max="0.5" step="0.01" value={layerBlending} onChange={(e) => setLayerBlending(parseFloat(e.target.value))} />
            </ControlGroup>
            <Separator />
            <PanelTitle>Modes</PanelTitle>
            <ControlGroup>
              <ToggleContainer>
                <ToggleLabel htmlFor="static-toggle">Static Mode</ToggleLabel>
                <HiddenCheckbox id="static-toggle" checked={isStatic} onChange={(e) => setStatic(e.target.checked)} />
                <StyledToggle htmlFor="static-toggle" />
              </ToggleContainer>
            </ControlGroup>
            <Separator />
            <PanelTitle>Presets</PanelTitle>
            <ControlGroup>
              <PresetButton onClick={handleExport}>
                <DownloadSimple weight="bold" />
                Export Preset
              </PresetButton>
              <PresetButton onClick={handleImportClick}>
                <UploadSimple weight="bold" />
                Import Preset
              </PresetButton>
              <HiddenInput type="file" ref={importRef} onChange={handleImport} accept="application/json" />
            </ControlGroup>
            <Separator />
            <PanelTitle>Advanced Export</PanelTitle>
            <ControlGroup>
              <PresetButton onClick={handleExportGLB}>
                <ArchiveBox weight="bold" />
                Export as GLB
              </PresetButton>
            </ControlGroup>
          </SidePanel>
        )}
        </AnimatePresence>
        <AnimatePresence>
          {uploaderVisible && <Uploader onFilesSelected={handleFilesSelected} />}
        </AnimatePresence>
      </AppContainer>
    </ThemeProvider>
  );
}