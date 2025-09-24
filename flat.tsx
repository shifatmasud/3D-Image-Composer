// Fix: Added a side-effect import of '@react-three/fiber' to provide JSX type augmentation for three.js elements.
import '@react-three/fiber';
import React, { useState, useRef, useEffect, useMemo, forwardRef } from 'react';
import { DownloadSimple, UploadSimple, ArchiveBox, Image as ImageIcon } from 'phosphor-react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { motion as motion3d } from 'framer-motion-3d';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';

// --- Style Objects (replacing styled-components) ---

const theme = {
  colors: {
    background: '#121212',
    primaryText: '#EAEAEA',
    secondaryText: '#A0A0A0',
  },
  fonts: {
    body: "'Inter', sans-serif",
  },
};

const appContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  height: '100%',
  width: '100%',
  backgroundColor: theme.colors.background,
  color: theme.colors.primaryText,
  fontFamily: theme.fonts.body,
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
  overflow: 'hidden',
  boxSizing: 'border-box',
};

const mainContentStyle: React.CSSProperties = {
  flexGrow: 1,
  position: 'relative',
  height: '100%',
};

const canvasContainerStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  zIndex: 1,
};

const sidePanelStyle: React.CSSProperties = {
  width: '320px',
  flexShrink: 0,
  backgroundColor: 'rgba(18, 18, 18, 0.8)',
  backdropFilter: 'blur(10px)',
  borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
  padding: '40px 20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '15px',
  zIndex: 20,
  overflowY: 'auto',
};

const panelTitleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 700,
  color: theme.colors.primaryText,
  textAlign: 'left',
  marginBottom: '5px',
  marginTop: '10px',
};

const controlGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const sliderLabelStyle: React.CSSProperties = {
  color: theme.colors.primaryText,
  fontSize: '14px',
  fontWeight: 500,
  width: '100%',
  textAlign: 'left',
};

const uploadContainerStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'rgba(18, 18, 18, 0.7)',
  backdropFilter: 'blur(10px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
};

const uploadBoxStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  background: 'rgba(0, 0, 0, 0.7)',
  padding: '40px',
  borderRadius: '12px',
  border: '1px solid rgba(255, 255, 255, 0.2)',
};

const fileInputLabelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
  border: `2px dashed ${theme.colors.secondaryText}`,
  borderRadius: '8px',
  cursor: 'pointer',
  color: theme.colors.secondaryText,
  transition: 'all 0.3s ease',
  width: '300px',
  textAlign: 'center',
};

const hiddenInputStyle: React.CSSProperties = {
  display: 'none',
};

const loaderStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  width: '50px',
  height: '50px',
  marginLeft: '-25px',
  marginTop: '-25px',
  border: '5px solid rgba(255, 255, 255, 0.2)',
  borderTopColor: theme.colors.primaryText,
  borderRadius: '50%',
  zIndex: 10,
};

const toggleContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
};

const toggleLabelStyle: React.CSSProperties = {
  color: theme.colors.primaryText,
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
  userSelect: 'none',
};

const presetButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px 15px',
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  color: theme.colors.primaryText,
  borderRadius: '6px',
  fontSize: '14px',
  fontFamily: theme.fonts.body,
  fontWeight: 500,
  cursor: 'pointer',
  justifyContent: 'center',
  width: '100%',
};

const separatorStyle: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  margin: '10px 0',
};

// --- Hooks ---

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

// --- Rebuilt Components ---

const Loader: React.FC = () => {
  return <motion.div style={loaderStyle} animate={{ rotate: 360 }} transition={{ duration: 1, ease: 'linear', repeat: Infinity }} />;
};

const CustomToggle: React.FC<{ id: string; checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ id, checked, onChange }) => {
    const toggleSwitchStyle: React.CSSProperties = {
        cursor: 'pointer',
        width: '50px',
        height: '25px',
        display: 'flex',
        alignItems: 'center',
        backgroundColor: checked ? '#4caf50' : 'grey',
        borderRadius: '100px',
        position: 'relative',
        transition: 'background-color 0.3s',
    };
    const toggleHandleStyle: React.CSSProperties = {
        width: '20px',
        height: '20px',
        background: '#fff',
        borderRadius: '90px',
    };
    return (
        <label htmlFor={id} style={toggleSwitchStyle}>
            <input id={id} type="checkbox" checked={checked} onChange={onChange} style={{ display: 'none' }} />
            <motion.div style={toggleHandleStyle} layout transition={{ type: 'spring', stiffness: 700, damping: 30 }} />
        </label>
    );
};

interface UploaderProps {
  onFilesSelected: (imageFile: File, depthFile: File) => void;
}
const Uploader: React.FC<UploaderProps> = ({ onFilesSelected }) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [depthFile, setDepthFile] = useState<File | null>(null);
  useEffect(() => {
    if (imageFile && depthFile) onFilesSelected(imageFile, depthFile);
  }, [imageFile, depthFile, onFilesSelected]);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<File | null>>) => {
    if (e.target.files && e.target.files[0]) setter(e.target.files[0]);
  };
  return (
    <motion.div style={uploadContainerStyle} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: 'easeInOut' }}>
      <div style={uploadBoxStyle}>
        <label style={fileInputLabelStyle}>
          <ImageIcon size={48} weight="light" />
          <p style={{ margin: '10px 0 5px', color: theme.colors.primaryText }}>{imageFile ? `Selected: ${imageFile.name}` : 'Upload your Image'}</p>
          <span style={{ fontSize: '12px' }}>Max 5MB. PNG, JPG.</span>
          <input type="file" style={hiddenInputStyle} accept="image/png, image/jpeg" onChange={(e) => handleFileChange(e, setImageFile)} />
        </label>
        <label style={fileInputLabelStyle}>
          <UploadSimple size={48} weight="light" />
          <p style={{ margin: '10px 0 5px', color: theme.colors.primaryText }}>{depthFile ? `Selected: ${depthFile.name}` : 'Upload your Depth Map'}</p>
          <span style={{ fontSize: '12px' }}>A grayscale image for depth.</span>
          <input type="file" style={hiddenInputStyle} accept="image/png, image/jpeg" onChange={(e) => handleFileChange(e, setDepthFile)} />
        </label>
      </div>
    </motion.div>
  );
};

// --- 3D Components ---

interface FloatingParticlesProps {
  count: number;
  pointer: React.MutableRefObject<THREE.Vector2>;
}
const FloatingParticles: React.FC<FloatingParticlesProps> = ({ count, pointer }) => {
  const pointsRef = useRef<THREE.Points>(null!);
  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 5 - 1;
      vel[i * 3 + 0] = (Math.random() - 0.5) * 0.002;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.002;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
    }
    return [pos, vel];
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
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} usage={THREE.DynamicDrawUsage} />
      </bufferGeometry>
      <pointsMaterial size={0.015} color="#aaaaaa" sizeAttenuation fog={false} transparent opacity={0.5} />
    </points>
  );
};

const displaceVertexShader = `
  uniform sampler2D uDepthMap; uniform float uDepthScale; out vec2 vUv;
  void main() { vUv = uv; float depth = texture(uDepthMap, vUv).r; vec3 displacedPosition = position; displacedPosition.z += (depth - 0.5) * uDepthScale; gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0); }`;
const foregroundFragmentShader = `
  uniform sampler2D uColorMap; uniform sampler2D uDepthMap; uniform float uMiddlegroundCutoff; uniform float uLayerBlending; in vec2 vUv; out vec4 outColor;
  void main() { vec4 color = texture(uColorMap, vUv); float depth = texture(uDepthMap, vUv).r; float alpha = smoothstep(uMiddlegroundCutoff - uLayerBlending, uMiddlegroundCutoff + uLayerBlending, depth); if (alpha < 0.01) discard; outColor = vec4(color.rgb, color.a * alpha); }`;
const middlegroundFragmentShader = `
  uniform sampler2D uColorMap; uniform sampler2D uDepthMap; uniform float uBackgroundCutoff; uniform float uMiddlegroundCutoff; uniform float uLayerBlending; in vec2 vUv; out vec4 outColor;
  void main() { vec4 color = texture(uColorMap, vUv); float depth = texture(uDepthMap, vUv).r; float a1 = smoothstep(uBackgroundCutoff - uLayerBlending, uBackgroundCutoff + uLayerBlending, depth); float a2 = 1.0 - smoothstep(uMiddlegroundCutoff - uLayerBlending, uMiddlegroundCutoff + uLayerBlending, depth); float alpha = min(a1, a2); if (alpha < 0.01) discard; outColor = vec4(color.rgb, color.a * alpha); }`;
const backgroundFragmentShader = `
  uniform sampler2D uColorMap; uniform sampler2D uDepthMap; uniform float uBackgroundCutoff; uniform float uLayerBlending; in vec2 vUv; out vec4 outColor;
  void main() { vec4 color = texture(uColorMap, vUv); float depth = texture(uDepthMap, vUv).r; float alpha = 1.0 - smoothstep(uBackgroundCutoff - uLayerBlending, uBackgroundCutoff + uLayerBlending, depth); if (alpha < 0.01) discard; outColor = vec4(color.rgb, color.a * alpha); }`;
const simpleVertexShader = `
  out vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const infillFragmentShader = `
  uniform sampler2D uColorMap; uniform float uBlurLevel; in vec2 vUv; out vec4 outColor;
  void main() { outColor = textureLod(uColorMap, vUv, uBlurLevel); }`;

interface LayeredImageProps { imageUrl: string; depthUrl: string; depthScale: number; layerBlending: number; backgroundCutoff: number; middlegroundCutoff: number; }
const LayeredImage: React.FC<LayeredImageProps> = ({ imageUrl, depthUrl, depthScale, layerBlending, backgroundCutoff, middlegroundCutoff }) => {
  const [colorMap, depthMap] = useLoader(THREE.TextureLoader, [imageUrl, depthUrl]);
  const { viewport, gl } = useThree();
  const bgMatRef = useRef<THREE.ShaderMaterial>(null);
  const midMatRef = useRef<THREE.ShaderMaterial>(null);
  const fgMatRef = useRef<THREE.ShaderMaterial>(null);
  useEffect(() => {
    const maxAnisotropy = gl.capabilities.getMaxAnisotropy();
    [colorMap, depthMap].forEach(map => {
        map.wrapS = THREE.ClampToEdgeWrapping;
        map.wrapT = THREE.ClampToEdgeWrapping;
        map.needsUpdate = true;
    });
    colorMap.generateMipmaps = true;
    colorMap.minFilter = THREE.LinearMipmapLinearFilter;
    colorMap.magFilter = THREE.LinearFilter;
    colorMap.anisotropy = maxAnisotropy;
    depthMap.minFilter = THREE.NearestFilter;
    depthMap.magFilter = THREE.NearestFilter;
  }, [colorMap, depthMap, gl]);
  useFrame(() => {
    [bgMatRef, midMatRef, fgMatRef].forEach(matRef => {
        if (matRef.current) {
            matRef.current.uniforms.uBackgroundCutoff.value = backgroundCutoff;
            matRef.current.uniforms.uMiddlegroundCutoff.value = middlegroundCutoff;
            matRef.current.uniforms.uLayerBlending.value = layerBlending;
        }
    });
    if (fgMatRef.current) fgMatRef.current.uniforms.uDepthScale.value = depthScale;
    if (midMatRef.current) midMatRef.current.uniforms.uDepthScale.value = depthScale;
  });
  const scale = useMemo(() => {
    const aspect = colorMap.image.width / colorMap.image.height;
    const baseScale = Math.min(viewport.width / aspect, viewport.height) * 0.9;
    return [baseScale * aspect, baseScale, 1];
  }, [viewport, colorMap]);
  const baseUniforms = useMemo(() => ({ uColorMap: { value: colorMap }, uDepthMap: { value: depthMap }, uBackgroundCutoff: { value: 0 }, uMiddlegroundCutoff: { value: 0 }, uLayerBlending: { value: 0 }, }), [colorMap, depthMap]);
  const displacedUniforms = useMemo(() => ({ ...baseUniforms, uDepthScale: { value: 0 } }), [baseUniforms]);
  const infillUniforms = useMemo(() => ({ uColorMap: { value: colorMap }, uBlurLevel: { value: 5.0 } }), [colorMap]);

  return (
    <group scale={scale as [number, number, number]}>
      <mesh position-z={-depthScale * 0.76}><planeGeometry args={[1, 1]} /><shaderMaterial key={`${depthUrl}-infill`} uniforms={infillUniforms} vertexShader={simpleVertexShader} fragmentShader={infillFragmentShader} glslVersion={THREE.GLSL3} /></mesh>
      <mesh position-z={-depthScale * 0.75}><planeGeometry args={[1, 1]} /><shaderMaterial ref={bgMatRef} key={`${depthUrl}-bg`} uniforms={baseUniforms} vertexShader={simpleVertexShader} fragmentShader={backgroundFragmentShader} transparent glslVersion={THREE.GLSL3} /></mesh>
      <mesh position-z={-depthScale * 0.25}><planeGeometry args={[1, 1, 256, 256]} /><shaderMaterial ref={midMatRef} key={`${depthUrl}-mid`} uniforms={displacedUniforms} vertexShader={displaceVertexShader} fragmentShader={middlegroundFragmentShader} transparent glslVersion={THREE.GLSL3} /></mesh>
      <mesh><planeGeometry args={[1, 1, 256, 256]} /><shaderMaterial ref={fgMatRef} key={`${depthUrl}-fg`} uniforms={displacedUniforms} vertexShader={displaceVertexShader} fragmentShader={foregroundFragmentShader} transparent glslVersion={THREE.GLSL3} /></mesh>
    </group>
  );
};

const PointerLight: React.FC<{ smoothPointerX: ReturnType<typeof useSpring>; smoothPointerY: ReturnType<typeof useSpring>; isStatic: boolean; }> = ({ smoothPointerX, smoothPointerY, isStatic }) => {
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

interface ParallaxSceneProps { imageUrl: string; depthUrl: string; pointer: React.MutableRefObject<THREE.Vector2>; depthScale: number; layerBlending: number; backgroundCutoff: number; middlegroundCutoff: number; isStatic: boolean; }
const SceneContent: React.FC<ParallaxSceneProps> = ({ imageUrl, depthUrl, pointer, depthScale, layerBlending, backgroundCutoff, middlegroundCutoff, isStatic }) => {
  const pointerX = useMotionValue(0); const pointerY = useMotionValue(0);
  const smoothPointerX = useSpring(pointerX, { stiffness: 200, damping: 40, mass: 1 });
  const smoothPointerY = useSpring(pointerY, { stiffness: 200, damping: 40, mass: 1 });
  const rotateY = useTransform(smoothPointerX, [-1, 1], [-0.4, 0.4]); const rotateX = useTransform(smoothPointerY, [-1, 1], [0.2, -0.2]);
  const cameraX = useTransform(smoothPointerX, [-1, 1], [0.1, -0.1]); const cameraY = useTransform(smoothPointerY, [-1, 1], [0.1, -0.1]);
  useFrame(() => { pointerX.set(pointer.current.x); pointerY.set(pointer.current.y); });
  useEffect(() => { if (isStatic) { pointerX.set(0); pointerY.set(0); } }, [isStatic, pointerX, pointerY]);
  useFrame((state) => {
    const targetX = isStatic ? 0 : cameraX.get(); const targetY = isStatic ? 0 : cameraY.get();
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetX, 0.05);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetY, 0.05);
    state.camera.lookAt(0, 0, 0);
  });
  return (
    <React.Suspense fallback={null}>
      <ambientLight intensity={0.5} /><directionalLight position={[3, 2, 5]} intensity={1.5} />
      <PointerLight smoothPointerX={smoothPointerX} smoothPointerY={smoothPointerY} isStatic={isStatic} />
      <motion3d.group rotation-x={rotateX} rotation-y={rotateY}><LayeredImage imageUrl={imageUrl} depthUrl={depthUrl} depthScale={depthScale} layerBlending={layerBlending} backgroundCutoff={backgroundCutoff} middlegroundCutoff={middlegroundCutoff} /></motion3d.group>
      <FloatingParticles count={50} pointer={pointer} />
      <Environment preset="sunset" />
    </React.Suspense>
  );
};

const ParallaxScene: React.FC<ParallaxSceneProps> = (props) => (
  <Canvas camera={{ position: [0, 0, 2], fov: 50, near: 0.1, far: 20 }}><SceneContent {...props} /></Canvas>
);

// --- Main App Component ---

interface AppState { imageUrl: string | null; depthUrl: string | null; }
interface NewProps { imageUrl?: string; depthUrl?: string; depthScale?: number; layerBlending?: number; backgroundCutoff?: number; middlegroundCutoff?: number; isStatic?: boolean; showUI?: boolean; }
export default function New({ imageUrl: pImageUrl, depthUrl: pDepthUrl, depthScale: pDepthScale, layerBlending: pLayerBlending, backgroundCutoff: pBgCutoff, middlegroundCutoff: pMidCutoff, isStatic: pIsStatic, showUI = true }: NewProps) {
  const [files, setFiles] = useState<AppState>({ imageUrl: null, depthUrl: null });
  const [isStatic, setStatic] = useState(pIsStatic ?? false);
  const [bgCutoff, setBgCutoff] = useState(pBgCutoff ?? 0.25);
  const [midCutoff, setMidCutoff] = useState(pMidCutoff ?? 0.5);
  const [depthScale, setDepthScale] = useState(pDepthScale ?? 0.5);
  const [layerBlending, setLayerBlending] = useState(pLayerBlending ?? 0.1);
  const sceneContainerRef = useRef<HTMLDivElement>(null);
  const pointer = usePointer(sceneContainerRef);
  const importRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => { setStatic(pIsStatic ?? false); }, [pIsStatic]);
  useEffect(() => { setBgCutoff(pBgCutoff ?? 0.25); }, [pBgCutoff]);
  useEffect(() => { setMidCutoff(pMidCutoff ?? 0.5); }, [pMidCutoff]);
  useEffect(() => { setDepthScale(pDepthScale ?? 0.5); }, [pDepthScale]);
  useEffect(() => { setLayerBlending(pLayerBlending ?? 0.1); }, [pLayerBlending]);
  
  useEffect(() => { if (pImageUrl && pDepthUrl) setFiles({ imageUrl: pImageUrl, depthUrl: pDepthUrl }); }, [pImageUrl, pDepthUrl]);
  
  const neutralDepthMap = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 2; canvas.height = 2;
    const ctx = canvas.getContext('2d');
    if (ctx) { ctx.fillStyle = 'rgb(128, 128, 128)'; ctx.fillRect(0, 0, 2, 2); }
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
    setFiles({ imageUrl: URL.createObjectURL(imageFile), depthUrl: URL.createObjectURL(depthFile) });
  };
  
  const handleExport = () => {
    const settings = { bgCutoff, midCutoff, depthScale, layerBlending, isStatic };
    const blob = new Blob([JSON.stringify({ version: 4, settings }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'parallax-preset.json'; a.click(); URL.revokeObjectURL(a.href);
  };
  
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.version >= 3 && json.settings) {
          const { settings } = json;
          setBgCutoff(settings.backgroundCutoff ?? 0.25);
          setMidCutoff(settings.middlegroundCutoff ?? 0.5);
          setDepthScale(settings.depthScale ?? 0.5);
          setLayerBlending(settings.layerBlending ?? 0.1);
          setStatic(settings.isStatic ?? false);
        } else { alert('Invalid preset file.'); }
      } catch (error) { alert('Error reading preset file.'); }
    };
    reader.readAsText(file); e.target.value = '';
  };
    
  const handleBgCutoffChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value); setBgCutoff(value); if (value > midCutoff) setMidCutoff(value);
  };
  const handleMidCutoffChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value); setMidCutoff(value); if (value < bgCutoff) setBgCutoff(value);
  };
  
  const isSceneReady = files.imageUrl && files.depthUrl;
  
  return (
    <div style={appContainerStyle}>
      <main style={mainContentStyle} ref={sceneContainerRef}>
        {isSceneReady && (
          <div style={canvasContainerStyle}>
            <React.Suspense fallback={<Loader />}>
              <ParallaxScene imageUrl={files.imageUrl!} depthUrl={isStatic ? neutralDepthMap : files.depthUrl!} pointer={pointer} depthScale={depthScale} layerBlending={layerBlending} backgroundCutoff={bgCutoff} middlegroundCutoff={midCutoff} isStatic={isStatic} />
            </React.Suspense>
          </div>
        )}
      </main>
      <AnimatePresence>
        {isSceneReady && showUI && (
          <motion.aside key="side-panel" style={sidePanelStyle} initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 200, damping: 25 }}>
            <h2 style={{...panelTitleStyle, marginTop: 0}}>Image Controls</h2>
            <div style={controlGroupStyle}>
              <label style={sliderLabelStyle} htmlFor="bg-cutoff-slider">Far-plane Cutoff: {bgCutoff.toFixed(2)}</label>
              <input type="range" id="bg-cutoff-slider" min="0" max="1" step="0.01" value={bgCutoff} onChange={handleBgCutoffChange} />
            </div>
            <div style={controlGroupStyle}>
              <label style={sliderLabelStyle} htmlFor="mid-cutoff-slider">Mid-plane Cutoff: {midCutoff.toFixed(2)}</label>
              <input type="range" id="mid-cutoff-slider" min="0" max="1" step="0.01" value={midCutoff} onChange={handleMidCutoffChange} />
            </div>
            <div style={controlGroupStyle}>
              <label style={sliderLabelStyle} htmlFor="depth-scale-slider">Depth Scale: {depthScale.toFixed(2)}</label>
              <input type="range" id="depth-scale-slider" min="0" max="2" step="0.01" value={depthScale} onChange={(e) => setDepthScale(parseFloat(e.target.value))} />
            </div>
            <div style={controlGroupStyle}>
              <label style={sliderLabelStyle} htmlFor="layer-blending-slider">Layer Blending: {layerBlending.toFixed(2)}</label>
              <input type="range" id="layer-blending-slider" min="0.01" max="0.5" step="0.01" value={layerBlending} onChange={(e) => setLayerBlending(parseFloat(e.target.value))} />
            </div>
            <hr style={separatorStyle} />
            <h2 style={panelTitleStyle}>Modes</h2>
            <div style={controlGroupStyle}>
                <div style={toggleContainerStyle}>
                    <label style={toggleLabelStyle} htmlFor="static-toggle">Static Mode</label>
                    <CustomToggle id="static-toggle" checked={isStatic} onChange={(e) => setStatic(e.target.checked)} />
                </div>
            </div>
            <hr style={separatorStyle} />
            <h2 style={panelTitleStyle}>Presets</h2>
            <div style={controlGroupStyle}>
              <motion.button style={presetButtonStyle} whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }} onClick={handleExport}><DownloadSimple weight="bold" />Export Preset</motion.button>
              <motion.button style={presetButtonStyle} whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }} onClick={() => importRef.current?.click()}><UploadSimple weight="bold" />Import Preset</motion.button>
              <input type="file" ref={importRef} style={hiddenInputStyle} onChange={handleImport} accept="application/json" />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {!isSceneReady && showUI && <Uploader key="uploader" onFilesSelected={handleFilesSelected} />}
      </AnimatePresence>
    </div>
  );
}