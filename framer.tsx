import React, { useRef, useEffect, useMemo } from "react"
import * as THREE from 'three';
// @ts-ignore
import { addPropertyControls, ControlType } from "framer"

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

    const fgMatRef = useRef<THREE.ShaderMaterial | null>(null);
    const midMatRef = useRef<THREE.ShaderMaterial | null>(null);
    const bgMatRef = useRef<THREE.ShaderMaterial | null>(null);
    const depthMapRef = useRef<THREE.Texture | null>(null);
    const neutralDepthMapRef = useRef<THREE.Texture | null>(null);
    
    const neutralDepthMapUrl = useMemo(() => {
        const canvas = document.createElement('canvas'); canvas.width = 2; canvas.height = 2;
        const ctx = canvas.getContext('2d');
        if (ctx) { ctx.fillStyle = 'rgb(128, 128, 128)'; ctx.fillRect(0, 0, 2, 2); }
        return canvas.toDataURL();
    }, []);
    
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
        let colorMap: THREE.Texture;

        let width = 0, height = 0;
        const handleResize = () => {
             if (currentMount && colorMap?.image) {
                const w = currentMount.clientWidth; const h = currentMount.clientHeight;
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
                renderer.setSize(w, h);

                const aspect = colorMap.image.width / colorMap.image.height;
                const distance = camera.position.z;
                const vFov = (camera.fov * Math.PI) / 180;
                height = 2 * Math.tan(vFov / 2) * distance;
                width = height * camera.aspect;
                const baseScale = Math.min(width / aspect, height) * 0.9;
                mainGroup.scale.set(baseScale * aspect, baseScale, 1);
            }
        };

        colorMap = textureLoader.load(imageUrl, tex => {
            tex.generateMipmaps = true;
            tex.minFilter = THREE.LinearMipmapLinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.wrapS = THREE.ClampToEdgeWrapping;
            tex.wrapT = THREE.ClampToEdgeWrapping;
            tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
            tex.needsUpdate = true;
            handleResize();
        });
        
        depthMapRef.current = textureLoader.load(depthUrl, tex => {
            tex.minFilter = THREE.NearestFilter;
            tex.magFilter = THREE.NearestFilter;
            tex.wrapS = THREE.ClampToEdgeWrapping;
            tex.wrapT = THREE.ClampToEdgeWrapping;
            tex.needsUpdate = true;
        });

        neutralDepthMapRef.current = textureLoader.load(neutralDepthMapUrl, tex => {
            tex.minFilter = THREE.NearestFilter;
            tex.magFilter = THREE.NearestFilter;
            tex.wrapS = THREE.ClampToEdgeWrapping;
            tex.wrapT = THREE.ClampToEdgeWrapping;
            tex.needsUpdate = true;
        });

        const baseUniforms = {
            uColorMap: { value: colorMap }, uDepthMap: { value: isStatic ? neutralDepthMapRef.current : depthMapRef.current },
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
        const zeroVector = new THREE.Vector2(0, 0);

        const animate = () => {
            const elapsedTime = clock.getElapsedTime();
            
            smoothedPointer.current.lerp(isStatic ? zeroVector : pointer.current, 0.1);
            
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
            depthMapRef.current?.dispose();
            neutralDepthMapRef.current?.dispose();
            renderer.dispose();
            if (currentMount && renderer.domElement) currentMount.removeChild(renderer.domElement);
        };
    }, [imageUrl, depthUrl, neutralDepthMapUrl]);

    useEffect(() => {
        const newDepthMap = isStatic ? neutralDepthMapRef.current : depthMapRef.current;
        if (!newDepthMap) return;

        const mats = [fgMatRef.current, midMatRef.current, bgMatRef.current];
        mats.forEach(mat => {
            if (mat) {
                mat.uniforms.uDepthMap.value = newDepthMap;
            }
        });
    }, [isStatic]);

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


// --- Framer Component ---

export default function New(props: any) {
    const { 
        imageUrl, 
        depthUrl, 
        depthScale, 
        layerBlending, 
        backgroundCutoff, 
        middlegroundCutoff, 
        isStatic,
        ...rest 
    } = props;

    const sceneContainerRef = useRef<HTMLDivElement>(null);
    const pointer = usePointer(sceneContainerRef);

    const containerStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#121212',
    };

    const placeholderStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '10px',
        height: '100%',
        width: '100%',
        color: '#A0A0A0',
        fontFamily: "'Inter', sans-serif",
        border: '1px dashed #A0A0A0',
        borderRadius: '8px',
        boxSizing: 'border-box'
    };

    return (
        <div ref={sceneContainerRef} style={containerStyle} {...rest}>
            {imageUrl && depthUrl ? (
                <ParallaxCanvas
                    imageUrl={imageUrl}
                    depthUrl={depthUrl}
                    pointer={pointer}
                    depthScale={depthScale}
                    layerBlending={layerBlending}
                    backgroundCutoff={backgroundCutoff}
                    middlegroundCutoff={middlegroundCutoff}
                    isStatic={isStatic}
                />
            ) : (
                <div style={placeholderStyle}>
                    <span>Parallax Scene</span>
                    <span style={{ fontSize: '12px' }}>Connect Image and Depth Map properties</span>
                </div>
            )}
        </div>
    )
}

// @ts-ignore
New.defaultProps = {
    width: 600,
    height: 400,
    imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800",
    depthUrl: "https://i.imgur.com/tO1Jq0N.png",
    depthScale: 0.5,
    layerBlending: 0.1,
    backgroundCutoff: 0.25,
    middlegroundCutoff: 0.5,
    isStatic: false,
};

addPropertyControls(New, {
    imageUrl: {
        type: ControlType.Image,
        title: "Image",
    },
    depthUrl: {
        type: ControlType.Image,
        title: "Depth Map",
    },
    depthScale: {
        type: ControlType.Number,
        title: "Depth Scale",
        min: 0,
        max: 2,
        step: 0.01,
        defaultValue: 0.5,
        display: "slider",
    },
    layerBlending: {
        type: ControlType.Number,
        title: "Layer Blending",
        min: 0.01,
        max: 0.5,
        step: 0.01,
        defaultValue: 0.1,
        display: "slider",
    },
    backgroundCutoff: {
        type: ControlType.Number,
        title: "Far-plane Cutoff",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.25,
        display: "slider",
    },
    middlegroundCutoff: {
        type: ControlType.Number,
        title: "Mid-plane Cutoff",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.5,
        display: "slider",
    },
    isStatic: {
        type: ControlType.Boolean,
        title: "Static Mode",
        defaultValue: false,
    },

});