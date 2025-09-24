import React, { useState, useRef, useEffect, useMemo } from 'react';
import { DownloadSimple, UploadSimple, Image as ImageIcon } from 'phosphor-react';
import * as THREE from 'three';

// --- Style Objects (Self-contained for portability) ---

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


// --- UI Components ---

const Loader: React.FC = () => <div style={loaderStyle} />;

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
        padding: '2.5px',
    };
    const toggleHandleStyle: React.CSSProperties = {
        width: '20px',
        height: '20px',
        background: '#fff',
        borderRadius: '90px',
        transition: 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
        transform: checked ? 'translateX(25px)' : 'translateX(0px)',
    };
    return (
        <label htmlFor={id} style={toggleSwitchStyle}>
            <input id={id} type="checkbox" checked={checked} onChange={onChange} style={{ display: 'none' }} />
            <div style={toggleHandleStyle} />
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
    <div style={uploadContainerStyle}>
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
    </div>
  );
};


// --- Shaders ---
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


// --- Imperative Three.js Scene Component ---

interface ParallaxCanvasProps {
    imageUrl: string;
    depthUrl: string;
    pointer: React.MutableRefObject<THREE.Vector2>;
    depthScale: number;
    layerBlending: number;
    backgroundCutoff: number;
    middlegroundCutoff: number;
    isStatic: boolean;
}

const ParallaxCanvas: React.FC<ParallaxCanvasProps> = ({
    imageUrl, depthUrl, pointer, depthScale, layerBlending, backgroundCutoff, middlegroundCutoff, isStatic,
}) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const smoothedPointer = useRef(new THREE.Vector2(0, 0));

    const fgMatRef = useRef<THREE.ShaderMaterial>();
    const midMatRef = useRef<THREE.ShaderMaterial>();
    const bgMatRef = useRef<THREE.ShaderMaterial>();
    
    useEffect(() => {
        const currentMount = mountRef.current;
        if (!currentMount) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, currentMount.clientWidth / currentMount.clientHeight, 0.1, 20);
        camera.position.z = 2;
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        currentMount.appendChild(renderer.domElement);

        const textureLoader = new THREE.TextureLoader();
        const colorMap = textureLoader.load(imageUrl, tex => {
            tex.generateMipmaps = true;
            tex.minFilter = THREE.LinearMipmapLinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.wrapS = THREE.ClampToEdgeWrapping;
            tex.wrapT = THREE.ClampToEdgeWrapping;
            tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
            tex.needsUpdate = true;
        });
        const depthMap = textureLoader.load(depthUrl, tex => {
            tex.minFilter = THREE.NearestFilter;
            tex.magFilter = THREE.NearestFilter;
            tex.wrapS = THREE.ClampToEdgeWrapping;
            tex.wrapT = THREE.ClampToEdgeWrapping;
            tex.needsUpdate = true;
        });

        // Fix: Changed uniform definitions from functions to objects to resolve errors.
        const baseUniforms = {
            uColorMap: { value: colorMap }, uDepthMap: { value: depthMap },
            uBackgroundCutoff: { value: backgroundCutoff }, uMiddlegroundCutoff: { value: middlegroundCutoff }, uLayerBlending: { value: layerBlending },
        };
        const displacedUniforms = { ...baseUniforms, uDepthScale: { value: depthScale } };
        const infillUniforms = { uColorMap: { value: colorMap }, uBlurLevel: { value: 5.0 } };

        const infillMaterial = new THREE.ShaderMaterial({ uniforms: infillUniforms, vertexShader: simpleVertexShader, fragmentShader: infillFragmentShader, glslVersion: THREE.GLSL3 });
        const backgroundMaterial = new THREE.ShaderMaterial({ uniforms: baseUniforms, vertexShader: simpleVertexShader, fragmentShader: backgroundFragmentShader, transparent: true, glslVersion: THREE.GLSL3 });
        const middlegroundMaterial = new THREE.ShaderMaterial({ uniforms: displacedUniforms, vertexShader: displaceVertexShader, fragmentShader: middlegroundFragmentShader, transparent: true, glslVersion: THREE.GLSL3 });
        const foregroundMaterial = new THREE.ShaderMaterial({ uniforms: displacedUniforms, vertexShader: displaceVertexShader, fragmentShader: foregroundFragmentShader, transparent: true, glslVersion: THREE.GLSL3 });

        fgMatRef.current = foregroundMaterial; midMatRef.current = middlegroundMaterial; bgMatRef.current = backgroundMaterial;

        const mainGroup = new THREE.Group();
        const planeGeom = new THREE.PlaneGeometry(1, 1);
        const displacedGeom = new THREE.PlaneGeometry(1, 1, 256, 256);

        const infillMesh = new THREE.Mesh(planeGeom, infillMaterial);
        const bgMesh = new THREE.Mesh(planeGeom, backgroundMaterial);
        const midMesh = new THREE.Mesh(displacedGeom, middlegroundMaterial);
        const fgMesh = new THREE.Mesh(displacedGeom, foregroundMaterial);
        mainGroup.add(infillMesh, bgMesh, midMesh, fgMesh);
        scene.add(mainGroup);
        
        const updateMeshDepths = (scale: number) => {
            infillMesh.position.z = -scale * 0.76;
            bgMesh.position.z = -scale * 0.75;
            midMesh.position.z = -scale * 0.25;
        };
        updateMeshDepths(depthScale);

        scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(3, 2, 5);
        scene.add(dirLight);
        const pointLight = new THREE.PointLight(0xFFDDAA, 2.5, 7, 2);
        pointLight.position.z = 1.5;
        scene.add(pointLight);

        let animationFrameId: number;
        const clock = new THREE.Clock();
        const animate = () => {
            const delta = clock.getDelta();
            const elapsedTime = clock.getElapsedTime();
            
            smoothedPointer.current.lerp(isStatic ? new THREE.Vector2(0,0) : pointer.current, 0.1);
            
            const mapRange = (v:number, iMin:number, iMax:number, oMin:number, oMax:number) => ((v - iMin) * (oMax - oMin)) / (iMax - iMin) + oMin;
            
            const targetRotateY = mapRange(smoothedPointer.current.x, -1, 1, -0.4, 0.4);
            const targetRotateX = mapRange(smoothedPointer.current.y, -1, 1, 0.2, -0.2);
            const targetCameraX = mapRange(smoothedPointer.current.x, -1, 1, 0.1, -0.1);
            const targetCameraY = mapRange(smoothedPointer.current.y, -1, 1, 0.1, -0.1);

            mainGroup.rotation.y = THREE.MathUtils.lerp(mainGroup.rotation.y, targetRotateY, 0.1);
            mainGroup.rotation.x = THREE.MathUtils.lerp(mainGroup.rotation.x, targetRotateX, 0.1);
            camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCameraX, 0.1);
            camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCameraY, 0.1);
            camera.lookAt(0, 0, 0);

            pointLight.position.x = smoothedPointer.current.x * (width / 2);
            pointLight.position.y = smoothedPointer.current.y * (height / 2);
            pointLight.intensity = THREE.MathUtils.lerp(pointLight.intensity, isStatic ? 1.5 : 2.5 + Math.sin(elapsedTime * 4) * 0.5, 0.1);
            
            renderer.render(scene, camera);
            animationFrameId = requestAnimationFrame(animate);
        };
        
        let width = 0, height = 0;
        const handleResize = () => {
             if (currentMount) {
                const w = currentMount.clientWidth; const h = currentMount.clientHeight;
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
                renderer.setSize(w, h);

                const aspect = (colorMap.image?.width || w) / (colorMap.image?.height || h);
                const distance = camera.position.z;
                const vFov = (camera.fov * Math.PI) / 180;
                height = 2 * Math.tan(vFov / 2) * distance;
                width = height * camera.aspect;
                const baseScale = Math.min(width / aspect, height) * 0.9;
                mainGroup.scale.set(baseScale * aspect, baseScale, 1);
            }
        };
        handleResize();
        animate();
        window.addEventListener('resize', handleResize);
        
        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
            scene.traverse(obj => {
                if (obj instanceof THREE.Mesh) {
                    obj.geometry.dispose();
                    if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                    else obj.material.dispose();
                }
            });
            colorMap.dispose();
            depthMap.dispose();
            renderer.dispose();
            if (currentMount && renderer.domElement) currentMount.removeChild(renderer.domElement);
        };
    }, [imageUrl, depthUrl]);

    useEffect(() => {
        const mats = [fgMatRef.current, midMatRef.current, bgMatRef.current];
        mats.forEach(mat => {
            if (mat) {
                mat.uniforms.uBackgroundCutoff.value = backgroundCutoff;
                mat.uniforms.uMiddlegroundCutoff.value = middlegroundCutoff;
                mat.uniforms.uLayerBlending.value = layerBlending;
            }
        });
    }, [backgroundCutoff, middlegroundCutoff, layerBlending]);
    
    useEffect(() => {
        if(fgMatRef.current) fgMatRef.current.uniforms.uDepthScale.value = depthScale;
        if(midMatRef.current) midMatRef.current.uniforms.uDepthScale.value = depthScale;
    }, [depthScale]);

    return <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />;
};


// --- Main App Component ---

interface AppState { imageUrl: string | null; depthUrl: string | null; }
interface NewProps { imageUrl?: string; depthUrl?: string; depthScale?: number; layerBlending?: number; backgroundCutoff?: number; middlegroundCutoff?: number; isStatic?: boolean; showUI?: boolean; }

export default function New({ imageUrl: pImageUrl, depthUrl: pDepthUrl, depthScale: pDepthScale, layerBlending: pLayerBlending, backgroundCutoff: pBgCutoff, middlegroundCutoff: pMidCutoff, isStatic: pIsStatic, showUI = true }: NewProps) {
  const [files, setFiles] = useState<AppState>({ imageUrl: pImageUrl || null, depthUrl: pDepthUrl || null });
  const [isStatic, setStatic] = useState(pIsStatic ?? false);
  const [bgCutoff, setBgCutoff] = useState(pBgCutoff ?? 0.25);
  const [midCutoff, setMidCutoff] = useState(pMidCutoff ?? 0.5);
  const [depthScale, setDepthScale] = useState(pDepthScale ?? 0.5);
  const [layerBlending, setLayerBlending] = useState(pLayerBlending ?? 0.1);
  const sceneContainerRef = useRef<HTMLDivElement>(null);
  const pointer = usePointer(sceneContainerRef);
  const importRef = useRef<HTMLInputElement>(null);
  
  const neutralDepthMap = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 2; canvas.height = 2;
    const ctx = canvas.getContext('2d');
    if (ctx) { ctx.fillStyle = 'rgb(128, 128, 128)'; ctx.fillRect(0, 0, 2, 2); }
    return canvas.toDataURL();
  }, []);

  useEffect(() => { return () => {
      if (files.imageUrl?.startsWith('blob:')) URL.revokeObjectURL(files.imageUrl);
      if (files.depthUrl?.startsWith('blob:')) URL.revokeObjectURL(files.depthUrl);
  }; }, [files]);
  
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
          setBgCutoff(settings.backgroundCutoff ?? 0.25); setMidCutoff(settings.middlegroundCutoff ?? 0.5);
          setDepthScale(settings.depthScale ?? 0.5); setLayerBlending(settings.layerBlending ?? 0.1);
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
              <ParallaxCanvas imageUrl={files.imageUrl!} depthUrl={isStatic ? neutralDepthMap : files.depthUrl!} pointer={pointer} depthScale={depthScale} layerBlending={layerBlending} backgroundCutoff={bgCutoff} middlegroundCutoff={midCutoff} isStatic={isStatic} />
            </React.Suspense>
          </div>
        )}
      </main>
      {isSceneReady && showUI && (
          <aside key="side-panel" style={sidePanelStyle}>
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
              <button style={presetButtonStyle} onClick={handleExport}><DownloadSimple weight="bold" />Export Preset</button>
              <button style={presetButtonStyle} onClick={() => importRef.current?.click()}><UploadSimple weight="bold" />Import Preset</button>
              <input type="file" ref={importRef} style={hiddenInputStyle} onChange={handleImport} accept="application/json" />
            </div>
          </aside>
      )}
      {!isSceneReady && showUI && <Uploader key="uploader" onFilesSelected={handleFilesSelected} />}
    </div>
  );
}