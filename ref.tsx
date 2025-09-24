import React, { useState, useCallback, useRef, useEffect, useImperativeHandle, forwardRef, useId, ReactNode } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'https://aistudiocdn.com/three@0.180.0/examples/jsm/controls/OrbitControls.js';
import { SVGLoader } from 'https://aistudiocdn.com/three@0.180.0/examples/jsm/loaders/SVGLoader.js';
import { GLTFExporter } from 'https://aistudiocdn.com/three@0.180.0/examples/jsm/exporters/GLTFExporter.js';
import { EffectComposer } from 'https://aistudiocdn.com/three@0.180.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://aistudiocdn.com/three@0.180.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://aistudiocdn.com/three@0.180.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'https://aistudiocdn.com/three@0.180.0/examples/jsm/postprocessing/ShaderPass.js';

// --- STYLES (from styles.ts) ---

const colors = {
  background: '#0a0a0a',
  surface: 'rgba(16, 16, 16, 0.7)',
  surfaceGlow: 'rgba(26, 26, 26, 0.9)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  textPrimary: '#f0f0f0',
  textSecondary: '#a0a0a0',
  textPlaceholder: '#666666',
  accent: '#0099FF',
  accentHover: '#33B2FF',
  accentActive: '#0077CC',
  accentGlow: 'rgba(0, 153, 255, 0.3)',
};

const spacing = {
  xxs: '4px',
  xs: '8px',
  sm: '12px',
  md: '16px',
  lg: '24px',
  xl: '32px',
};

const radii = {
  sm: '4px',
  md: '8px',
  lg: '16px',
  full: '9999px',
};

const transitions = {
  fast: 'all 150ms ease-in-out',
  medium: 'all 300ms ease-in-out',
};

const shadows = {
  soft: '0 8px 32px rgba(0, 0, 0, 0.4)',
  glow: `0 0 0 2px ${colors.background}, 0 0 0 4px ${colors.accent}`,
};

const typography = {
  fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif`,
  h1: { fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em', margin: 0 },
  h2: { fontSize: '20px', fontWeight: 500, margin: 0 },
  body: { fontSize: '14px', fontWeight: 400, margin: 0 },
  label: { fontSize: '13px', fontWeight: 500, color: colors.textSecondary },
  mono: { fontFamily: 'monospace', fontSize: '13px' },
};

const styles = { colors, spacing, radii, transitions, shadows, typography };


// --- SERVICES ---

// from services/svgTo3D.ts
interface MaterialProps {
    color: string;
    roughness: number;
    metalness: number;
    transmission: number;
    ior: number;
    thickness: number;
}

const createModelFromSVG = (svgString: string, extrusionDepth: number, bevelSegments: number, materialProps: MaterialProps): THREE.Group => {
  const loader = new SVGLoader();
  const data = loader.parse(svgString);

  const group = new THREE.Group();
  const extrudeSettings = {
    depth: extrusionDepth,
    bevelEnabled: true,
    bevelThickness: 0.5,
    bevelSize: 0.5,
    bevelSegments: bevelSegments,
  };

  data.paths.forEach((path) => {
    const fillColor = path.userData?.style?.fill;
    
    const initialColor = (fillColor && fillColor !== 'none') ? fillColor : materialProps.color;

    const material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(initialColor),
        roughness: materialProps.roughness,
        metalness: materialProps.metalness,
        side: THREE.DoubleSide,
        transmission: materialProps.transmission,
        ior: materialProps.ior,
        thickness: materialProps.thickness,
        // FIX: The 'morphTargets' property should be passed in the material constructor.
        morphTargets: true,
    });
    material.color.convertSRGBToLinear();

    if (path.userData?.style?.fill !== 'none' && path.userData?.style?.fill !== undefined) {
      const shapes = SVGLoader.createShapes(path);

      shapes.forEach((shape) => {
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const mesh = new THREE.Mesh(geometry, material);
        group.add(mesh);
      });
    }
  });
  
  group.scale.y *= -1;

  const box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  group.position.sub(center);

  return group;
};


// --- ICONS ---

interface IconProps extends React.SVGProps<SVGSVGElement> {}

const BloomIcon: React.FC<IconProps> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
  </svg>
);

const ChevronDownIcon: React.FC<IconProps> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
  </svg>
);

const ChromaticAberrationIcon: React.FC<IconProps> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" transform="translate(1.5, -1)" opacity="0.6" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" transform="translate(-1.5, 1)" opacity="0.6" />
  </svg>
);

const CubeIcon: React.FC<IconProps> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 7L12 12L22 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 12V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const GridIcon: React.FC<IconProps> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5V18M15 3.75V21m-6-17.25V21m-6-17.25v17.25M3 12h18M3 7.5h18M3 16.5h18" />
  </svg>
);

const PaletteIcon: React.FC<IconProps> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402a3.75 3.75 0 0 0-5.304-5.304L4.098 14.6a3.75 3.75 0 0 0 0 5.304Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 19.5h.008v.008h-.008v-.008Zm-.75.75h.008v.008h-.008v-.008Zm-1.5-1.5h.008v.008h-.008v-.008Zm-1.5-1.5h.008v.008h-.008v-.008Zm-3-3h.008v.008h-.008v-.008Zm-1.5-1.5h.008v.008h-.008v-.008Zm-1.5-1.5h.008v.008h-.008v-.008Zm-1.5-1.5h.008v.008h-.008v-.008Z" />
  </svg>
);

const PixelationIcon: React.FC<IconProps> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5h3v3h-3v-3z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 4.5h3v3h-3v-3z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5h3v3h-3v-3z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 4.5h3v3h-3v-3z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 10.5h9v9h-9v-9z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 16.5h3v3h-3v-3z" />
  </svg>
);

const ScanLinesIcon: React.FC<IconProps> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 9.75h16.5m-16.5 3h16.5m-16.5 3h16.5" />
  </svg>
);

const SettingsIcon: React.FC<IconProps> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
  </svg>
);

const SparklesIcon: React.FC<IconProps> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
  </svg>
);

const UploadIcon: React.FC<IconProps> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);

const VectorPenIcon: React.FC<IconProps> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
  </svg>
);


// --- UI COMPONENTS ---

// from components/Button.tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', style, ...props }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const baseStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${styles.spacing.xs} ${styles.spacing.md}`,
    border: '1px solid',
    fontSize: '14px',
    fontWeight: 500,
    borderRadius: styles.radii.md,
    cursor: 'pointer',
    transition: styles.transitions.fast,
    width: '100%',
    outline: 'none',
  };

  const variantStyles = {
    primary: {
      backgroundColor: styles.colors.accent,
      color: 'white',
      borderColor: styles.colors.accent,
    },
    secondary: {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      color: styles.colors.textPrimary,
      borderColor: styles.colors.glassBorder,
    },
  };

  const hoverStyles = {
    primary: {
      backgroundColor: styles.colors.accentHover,
      borderColor: styles.colors.accentHover,
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
    },
    secondary: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
  };

  const activeStyles = {
    primary: {
      backgroundColor: styles.colors.accentActive,
      transform: 'translateY(0)',
      boxShadow: 'none',
    },
    secondary: {
      backgroundColor: 'rgba(255, 255, 255, 0.02)',
      transform: 'scale(0.98)',
    },
  };
  
  const disabledStyle: React.CSSProperties = {
      opacity: 0.5,
      cursor: 'not-allowed',
  };

  let combinedStyle = { ...baseStyle, ...variantStyles[variant] };
  if (props.disabled) {
    combinedStyle = { ...combinedStyle, ...disabledStyle };
  } else {
    if (isHovered) combinedStyle = { ...combinedStyle, ...hoverStyles[variant] };
    if (isActive) combinedStyle = { ...combinedStyle, ...activeStyles[variant] };
  }
  
  combinedStyle = { ...combinedStyle, ...style };

  return (
    <button
      {...props}
      style={combinedStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsActive(false); }}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
    >
      {children}
    </button>
  );
};


// from components/Toggle.tsx
interface ToggleProps {
  id: string;
  isEnabled: boolean;
  onToggle: (isEnabled: boolean) => void;
}

const Toggle: React.FC<ToggleProps> = ({ id, isEnabled, onToggle }) => {
  const [isFocused, setIsFocused] = useState(false);
  const thumbSize = 20;
  const trackHeight = 24;
  const trackWidth = 44;
  const trackPadding = (trackHeight - thumbSize) / 2;
  const translateX = isEnabled ? trackWidth - thumbSize - trackPadding : trackPadding;

  const containerStyle: React.CSSProperties = {
    position: 'relative', display: 'inline-flex', alignItems: 'center',
    height: `${trackHeight}px`, width: `${trackWidth}px`, flexShrink: 0,
    cursor: 'pointer', borderRadius: styles.radii.full,
    transition: 'background-color 200ms ease-in-out, box-shadow 150ms ease-in-out',
    backgroundColor: isEnabled ? styles.colors.accent : 'rgba(255, 255, 255, 0.1)',
    border: 'none', outline: 'none',
  };

  const shadowParts = [
    'inset 0 1px 2px rgba(0,0,0,0.2)',
    `0 0 0 1px ${styles.colors.glassBorder}`
  ];
  if (isEnabled) shadowParts.push(`0 0 6px ${styles.colors.accentGlow}`);
  if (isFocused) shadowParts.push(styles.shadows.glow);
  containerStyle.boxShadow = shadowParts.join(', ');

  const thumbStyle: React.CSSProperties = {
    pointerEvents: 'none', display: 'inline-block',
    height: `${thumbSize}px`, width: `${thumbSize}px`,
    transform: `translateX(${translateX}px)`,
    borderRadius: styles.radii.full, backgroundColor: 'white',
    boxShadow: '0 1px 3px rgba(0,0,0,0.25), 0 0 0 0.5px rgba(0,0,0,0.1)',
    transition: 'transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1)',
    position: 'absolute', top: `${trackPadding}px`, left: '0px'
  };

  return (
    <button type="button" id={id} onClick={() => onToggle(!isEnabled)}
      onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
      style={containerStyle} role="switch" aria-checked={isEnabled}>
      <span aria-hidden="true" style={thumbStyle} />
    </button>
  );
};


// from components/EffectToggle.tsx
interface EffectToggleProps {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  isEnabled: boolean;
  onToggle: (isEnabled: boolean) => void;
}

const EffectToggle: React.FC<EffectToggleProps> = ({ id, icon, title, description, isEnabled, onToggle }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: styles.spacing.md, padding: `${styles.spacing.sm} 0`, borderBottom: `1px solid ${styles.colors.glassBorder}` }}>
      <div style={{ color: styles.colors.accent, flexShrink: 0, width: '24px', height: '24px' }}>
        {icon}
      </div>
      <div style={{ flexGrow: 1 }}>
        <label htmlFor={id} style={{ ...styles.typography.label, color: styles.colors.textPrimary, cursor: 'pointer', fontWeight: 500 }}>
          {title}
        </label>
        <p style={{ ...styles.typography.body, fontSize: '13px', color: styles.colors.textSecondary, marginTop: '2px' }}>
          {description}
        </p>
      </div>
      <Toggle id={id} isEnabled={isEnabled} onToggle={onToggle} />
    </div>
  );
};


// from components/Slider.tsx
interface SliderProps {
  label: string;
  id?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  decimals?: number;
}

const Slider: React.FC<SliderProps> = ({ label, id, min, max, step, value, onChange, unit = '', decimals = 0 }) => {
  const generatedId = useId();
  const controlId = id || generatedId;
  const progress = ((value - min) / (max - min)) * 100;
  const rangeStyle = { '--value-percent': `${progress}%` } as React.CSSProperties;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: styles.spacing.xs }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <label htmlFor={controlId} style={styles.typography.label}>{label}</label>
        <span style={{ ...styles.typography.mono, color: styles.colors.textSecondary, backgroundColor: 'rgba(0,0,0,0.2)', padding: `2px ${styles.spacing.xs}`, borderRadius: styles.radii.sm }}>
          {value.toFixed(decimals)}{unit}
        </span>
      </div>
      <input id={controlId} type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} style={rangeStyle} />
    </div>
  );
};


// from components/FileUpload.tsx
interface FileUploadProps {
  onFileLoad: (svgContent: string) => void;
  disabled: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileLoad, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File | null) => {
    if (file && file.type === "image/svg+xml") {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target && typeof e.target.result === 'string') onFileLoad(e.target.result);
      };
      reader.readAsText(file);
    } else {
      alert("Please upload a valid SVG file.");
    }
  }, [onFileLoad]);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]); e.dataTransfer.clearData();
    }
  }, [disabled, handleFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) handleFile(e.target.files[0]);
  };
  
  const baseStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    padding: `${styles.spacing.lg}`, border: `2px dashed ${styles.colors.glassBorder}`,
    borderRadius: styles.radii.lg, transition: styles.transitions.medium,
    opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer',
    backgroundColor: 'rgba(0,0,0,0.2)', minHeight: '180px'
  };

  const draggingStyle: React.CSSProperties = {
    borderColor: styles.colors.accent, borderStyle: 'solid',
    backgroundColor: 'rgba(0, 153, 255, 0.1)',
    boxShadow: `0 0 24px ${styles.colors.accentGlow}`, transform: 'scale(1.02)'
  };

  return (
    <div onDrop={handleDrop} onDragOver={handleDragOver} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave}
      style={isDragging ? { ...baseStyle, ...draggingStyle } : baseStyle}
      onClick={() => document.getElementById('file-upload')?.click()}>
      <div style={{ textAlign: 'center', pointerEvents: 'none' }}>
        <UploadIcon style={{ margin: '0 auto', height: '48px', width: '48px', color: styles.colors.textPlaceholder }} />
        <div style={{ ...styles.typography.body, color: styles.colors.textSecondary, marginTop: styles.spacing.sm }}>
          <span style={{ cursor: 'pointer', fontWeight: 500, color: styles.colors.accent }}>
            Upload a file
            <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".svg" onChange={handleChange} disabled={disabled} />
          </span>
          <p style={{ margin: 0 }}>or drag and drop</p>
        </div>
        <p style={{fontSize: '12px', color: styles.colors.textPlaceholder, marginTop: '4px'}}>SVG files only</p>
      </div>
    </div>
  );
};


// from components/ControlPanel.tsx
interface ControlPanelProps {
  onFileLoad: (svgContent: string) => void;
  onClear: () => void;
  extrusion: number;
  setExtrusion: (value: number) => void;
  bevelSegments: number;
  setBevelSegments: (value: number) => void;
  isLoading: boolean;
  hasModel: boolean;
  error: string | null;
  color: string;
  setColor: (value: string) => void;
  roughness: number;
  setRoughness: (value: number) => void;
  metalness: number;
  setMetalness: (value: number) => void;
  transmission: number;
  setTransmission: (value: number) => void;
  ior: number;
  setIor: (value: number) => void;
  thickness: number;
  setThickness: (value: number) => void;
  lightingPreset: string;
  setLightingPreset: (value: string) => void;
  backgroundColor: string;
  setBackgroundColor: (value: string) => void;
  isGridVisible: boolean;
  setIsGridVisible: (value: boolean) => void;
  isGlitchEffectEnabled: boolean;
  setIsGlitchEffectEnabled: (value: boolean) => void;
  isBloomEffectEnabled: boolean;
  setIsBloomEffectEnabled: (value: boolean) => void;
  isPixelationEffectEnabled: boolean;
  setIsPixelationEffectEnabled: (value: boolean) => void;
  isChromaticAberrationEnabled: boolean;
  setIsChromaticAberrationEnabled: (value: boolean) => void;
  isScanLinesEnabled: boolean;
  setIsScanLinesEnabled: (value: boolean) => void;
  onExport: () => void;
}

type Tab = 'upload' | 'geometry' | 'material' | 'effects';

const ControlPanel: React.FC<ControlPanelProps> = (props) => {
  const [activeTab, setActiveTab] = useState<Tab>('upload');

  useEffect(() => {
    if (props.hasModel && !props.error && activeTab === 'upload') setActiveTab('geometry');
    if (!props.hasModel) setActiveTab('upload');
  }, [props.hasModel, props.error, activeTab]);

  const handlePresetClick = (preset: 'matte' | 'plastic' | 'metal' | 'glass') => {
    switch (preset) {
        case 'matte': props.setColor('#cccccc'); props.setRoughness(1.0); props.setMetalness(0.0); props.setTransmission(0.0); break;
        case 'plastic': props.setColor('#ffffff'); props.setRoughness(0.1); props.setMetalness(0.1); props.setTransmission(0.0); break;
        case 'metal': props.setColor('#FFD700'); props.setRoughness(0.2); props.setMetalness(1.0); props.setTransmission(0.0); break;
        case 'glass': props.setColor('#ffffff'); props.setRoughness(0.05); props.setMetalness(0.0); props.setTransmission(1.0); props.setIor(1.5); props.setThickness(1.5); break;
    }
  }
  
  const TabButton = ({ tab, icon, label }: { tab: Tab; icon: React.ReactNode; label: string }) => {
    const isActive = activeTab === tab;
    const baseStyle: React.CSSProperties = {
        position: 'relative', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent', border: 'none', borderRadius: styles.radii.md, cursor: 'pointer',
        color: isActive ? styles.colors.accent : styles.colors.textSecondary, transition: styles.transitions.fast,
    };
    return (
      <button style={baseStyle}
        onMouseEnter={(e) => e.currentTarget.style.color = styles.colors.textPrimary}
        onMouseLeave={(e) => e.currentTarget.style.color = isActive ? styles.colors.accent : styles.colors.textSecondary}
        onClick={() => setActiveTab(tab)} aria-label={label} title={label}>
        <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: '4px', height: '24px', backgroundColor: styles.colors.accent, borderRadius: `0 ${styles.radii.sm} ${styles.radii.sm} 0`, transition: styles.transitions.fast, opacity: isActive ? 1 : 0, }}></div>
        {icon}
      </button>
    );
  };
  
  const renderContent = () => {
    const textInputStyle: React.CSSProperties = { flexGrow: 1, backgroundColor: 'rgba(0,0,0,0.2)', border: `1px solid ${styles.colors.glassBorder}`, borderRadius: styles.radii.md, padding: styles.spacing.xs, textAlign: 'center', ...styles.typography.mono, color: styles.colors.textPrimary, outline: 'none' };
    const colorPickerStyle: React.CSSProperties = { WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', width: '36px', height: '36px', padding: 0, border: 'none', backgroundColor: 'transparent', borderRadius: styles.radii.md, cursor: 'pointer', overflow: 'hidden' };
    
    const tabContent = {
        'upload': (<> <h2 style={styles.typography.h2}>Load SVG Model</h2> <FileUpload onFileLoad={props.onFileLoad} disabled={props.isLoading} /> {props.error && <p style={{ fontSize: '13px', color: '#ff8080', margin: `${styles.spacing.sm} 0 0`, textAlign: 'center' }}>{props.error}</p>} </>),
        'geometry': (<> <h2 style={styles.typography.h2}>Scene & Model</h2> <Slider label="Extrusion Depth" id="extrusion-depth" min={1} max={100} step={1} value={props.extrusion} onChange={props.setExtrusion} /> <Slider label="Bevel Smoothness" id="bevel-smoothness" min={0} max={10} step={1} value={props.bevelSegments} onChange={props.setBevelSegments} /> <div style={{ height: '1px', background: styles.colors.glassBorder, margin: `${styles.spacing.md} 0` }} /> <div style={{ display: 'flex', flexDirection: 'column', gap: styles.spacing.xs }}> <label style={styles.typography.label}>Lighting</label> <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: styles.spacing.xs }}> <Button variant={props.lightingPreset === 'studio' ? 'primary' : 'secondary'} onClick={() => props.setLightingPreset('studio')}>Studio</Button> <Button variant={props.lightingPreset === 'dramatic' ? 'primary' : 'secondary'} onClick={() => props.setLightingPreset('dramatic')}>Dramatic</Button> <Button variant={props.lightingPreset === 'soft' ? 'primary' : 'secondary'} onClick={() => props.setLightingPreset('soft')}>Soft</Button> </div> </div> <div style={{ display: 'flex', flexDirection: 'column', gap: styles.spacing.xs }}> <label htmlFor="bg-color" style={styles.typography.label}>Background Color</label> <div style={{ display: 'flex', alignItems: 'center', gap: styles.spacing.sm }}> <input id="bg-color" type="color" value={props.backgroundColor} onChange={(e) => props.setBackgroundColor(e.target.value)} style={colorPickerStyle} /> <input type="text" value={props.backgroundColor} onChange={(e) => props.setBackgroundColor(e.target.value)} style={textInputStyle} /> </div> </div> <EffectToggle id="grid-toggle" icon={<GridIcon style={{ width: 24, height: 24 }} />} title="Show Grid" description="Toggle the floor grid visibility." isEnabled={props.isGridVisible} onToggle={props.setIsGridVisible} /> </>),
        'material': (<> <h2 style={styles.typography.h2}>Material Editor</h2> <div style={{ display: 'flex', flexDirection: 'column', gap: styles.spacing.xs }}> <label style={styles.typography.label}>Material Presets</label> <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: styles.spacing.xs }}> <Button variant="secondary" onClick={() => handlePresetClick('matte')}>Matte</Button> <Button variant="secondary" onClick={() => handlePresetClick('plastic')}>Glossy</Button> <Button variant="secondary" onClick={() => handlePresetClick('metal')}>Metal</Button> <Button variant="secondary" onClick={() => handlePresetClick('glass')}>Glass</Button> </div> </div> <div style={{ display: 'flex', flexDirection: 'column', gap: styles.spacing.xs }}> <label htmlFor="model-color" style={styles.typography.label}>Base Color</label> <div style={{ display: 'flex', alignItems: 'center', gap: styles.spacing.sm }}> <input id="model-color" type="color" value={props.color} onChange={(e) => props.setColor(e.target.value)} style={colorPickerStyle} /> <input type="text" value={props.color} onChange={(e) => props.setColor(e.target.value)} style={textInputStyle} /> </div> </div> <Slider label="Roughness" id="roughness-slider" min={0} max={1} step={0.01} value={props.roughness} onChange={props.setRoughness} decimals={2} /> <Slider label="Metalness" id="metalness-slider" min={0} max={1} step={0.01} value={props.metalness} onChange={props.setMetalness} decimals={2} /> <Slider label="Transmission" id="transmission-slider" min={0} max={1} step={0.01} value={props.transmission} onChange={props.setTransmission} decimals={2} /> <Slider label="Index of Refraction" id="ior-slider" min={1} max={2.3} step={0.01} value={props.ior} onChange={props.setIor} decimals={2} /> <Slider label="Thickness" id="thickness-slider" min={0} max={5} step={0.01} value={props.thickness} onChange={props.setThickness} decimals={2} /> </>),
        'effects': (<> <h2 style={styles.typography.h2}>Special Effects</h2> <div style={{ display: 'flex', flexDirection: 'column' }}> <EffectToggle id="glitch-toggle" icon={<SparklesIcon style={{ width: 24, height: 24 }} />} title="Glitch" description="Adds a digital distortion and flickering effect." isEnabled={props.isGlitchEffectEnabled} onToggle={props.setIsGlitchEffectEnabled} /> <EffectToggle id="bloom-toggle" icon={<BloomIcon style={{ width: 24, height: 24 }} />} title="Bloom" description="Makes bright areas of the scene glow." isEnabled={props.isBloomEffectEnabled} onToggle={props.setIsBloomEffectEnabled} /> <EffectToggle id="chromatic-aberration-toggle" icon={<ChromaticAberrationIcon style={{ width: 24, height: 24 }} />} title="Chromatic Aberration" description="Mimics lens distortion by splitting colors." isEnabled={props.isChromaticAberrationEnabled} onToggle={props.setIsChromaticAberrationEnabled} /> <EffectToggle id="pixelation-toggle" icon={<PixelationIcon style={{ width: 24, height: 24 }} />} title="Pixelation" description="Renders the scene in a low-resolution, retro style." isEnabled={props.isPixelationEffectEnabled} onToggle={props.setIsPixelationEffectEnabled} /> <EffectToggle id="scanlines-toggle" icon={<ScanLinesIcon style={{ width: 24, height: 24 }} />} title="Scan Lines" description="Overlays horizontal lines for a CRT monitor look." isEnabled={props.isScanLinesEnabled} onToggle={props.setIsScanLinesEnabled} /> </div> </>)
    };
    return props.hasModel ? tabContent[activeTab] : tabContent['upload'];
  };

  return (
    <aside style={{ width: '380px', flexShrink: 0, height: '100vh', display: 'flex', backgroundColor: styles.colors.surface, borderRight: `1px solid ${styles.colors.glassBorder}`, boxShadow: styles.shadows.soft, backdropFilter: 'blur(12px)', zIndex: 10, }}>
        <div style={{ width: '64px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: `${styles.spacing.md} 0`, borderRight: `1px solid ${styles.colors.glassBorder}`, background: 'rgba(0,0,0,0.1)' }}>
             <div style={{ marginBottom: styles.spacing.lg }}>
                <CubeIcon style={{ height: '32px', width: '32px', color: styles.colors.accent }} />
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: styles.spacing.xs }}>
                <TabButton tab="upload" label="Upload Model" icon={<UploadIcon style={{width: 24, height: 24}} />} />
                {props.hasModel && ( <> <TabButton tab="geometry" label="Scene & Model" icon={<SettingsIcon style={{width: 24, height: 24}} />} /> <TabButton tab="material" label="Material Editor" icon={<PaletteIcon style={{width: 24, height: 24}} />} /> <TabButton tab="effects" label="Special Effects" icon={<SparklesIcon style={{width: 24, height: 24}} />} /> </> )}
            </nav>
        </div>
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }} className="custom-scrollbar">
            <div style={{ padding: `${styles.spacing.lg} ${styles.spacing.lg} ${styles.spacing.md}` }}>
                <h1 style={{ ...styles.typography.h1, background: `linear-gradient(to right, ${styles.colors.textPrimary}, ${styles.colors.textSecondary})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>SVG to 3D</h1>
            </div>
            <div style={{ padding: `0 ${styles.spacing.lg}`, display: 'flex', flexDirection: 'column', gap: styles.spacing.lg }}>
                {renderContent()}
            </div>
            {props.hasModel && (
                <div style={{ marginTop: 'auto', padding: `${styles.spacing.lg}`, borderTop: `1px solid ${styles.colors.glassBorder}`, display: 'flex', flexDirection: 'column', gap: styles.spacing.sm, background: 'rgba(0,0,0,0.15)' }}>
                    <Button onClick={props.onExport} disabled={props.isLoading} variant="primary">Export to GLB</Button>
                    <Button onClick={props.onClear} disabled={props.isLoading} variant="secondary">Clear Model</Button>
                </div>
            )}
        </div>
    </aside>
  );
};


// from components/Loader.tsx
const Loader: React.FC = () => {
  return (
    <>
      <style>{`@keyframes pulse-glow { 0%, 100% { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 4px ${styles.colors.accentGlow}); } 50% { opacity: 0.7; transform: scale(0.95); filter: drop-shadow(0 0 12px ${styles.colors.accentGlow}); } }`}</style>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: styles.spacing.lg }}>
        <CubeIcon style={{ height: '64px', width: '64px', color: styles.colors.accent, animation: 'pulse-glow 2s ease-in-out infinite' }} />
        <p style={{ ...styles.typography.h2, fontWeight: 400, color: styles.colors.textPrimary }}>Generating 3D Model...</p>
      </div>
    </>
  );
};


// --- MAIN 3D SCENE COMPONENT ---
// from components/ThreeScene.tsx
interface ThreeSceneProps {
  svgData: string | null;
  extrusionDepth: number;
  bevelSegments: number;
  color: string;
  roughness: number;
  metalness: number;
  transmission: number;
  ior: number;
  thickness: number;
  lightingPreset: string;
  backgroundColor: string;
  isGridVisible: boolean;
  isGlitchEffectEnabled: boolean;
  isBloomEffectEnabled: boolean;
  isPixelationEffectEnabled: boolean;
  isChromaticAberrationEnabled: boolean;
  isScanLinesEnabled: boolean;
}

export interface ThreeSceneRef {
  getModel: () => THREE.Group | null;
  getAnimations: () => THREE.AnimationClip[];
}

const RGBShiftShader = { uniforms: { 'tDiffuse': { value: null }, 'amount': { value: 0.005 }, 'angle': { value: 0.0 } }, vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`, fragmentShader: `uniform sampler2D tDiffuse; uniform float amount; uniform float angle; varying vec2 vUv; void main() { vec2 offset = amount * vec2( cos(angle), sin(angle)); vec4 r = texture2D(tDiffuse, vUv + offset); vec4 g = texture2D(tDiffuse, vUv); vec4 b = texture2D(tDiffuse, vUv - offset); gl_FragColor = vec4(r.r, g.g, b.b, g.a); }` };
const PixelationShader = { uniforms: { 'tDiffuse': { value: null }, 'pixelSize': { value: 8.0 }, 'resolution': { value: new THREE.Vector2() } }, vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`, fragmentShader: `uniform sampler2D tDiffuse; uniform float pixelSize; uniform vec2 resolution; varying vec2 vUv; void main() { vec2 newUv = floor(vUv * resolution / pixelSize) * pixelSize / resolution; gl_FragColor = texture2D(tDiffuse, newUv); }` };
const ScanLineShader = { uniforms: { 'tDiffuse': { value: null } }, vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`, fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv; void main() { vec4 originalColor = texture2D(tDiffuse, vUv); float lineFactor = 400.0; float intensity = sin(vUv.y * lineFactor); vec3 scanLineColor = originalColor.rgb * (1.0 - 0.15 * pow(intensity, 2.0)); gl_FragColor = vec4(scanLineColor, originalColor.a); }` };

const ThreeScene = forwardRef<ThreeSceneRef, ThreeSceneProps>(({ svgData, extrusionDepth, bevelSegments, color, roughness, metalness, transmission, ior, thickness, lightingPreset, backgroundColor, isGridVisible, isGlitchEffectEnabled, isBloomEffectEnabled, isPixelationEffectEnabled, isChromaticAberrationEnabled, isScanLinesEnabled }, ref) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const composerRef = useRef<EffectComposer | null>(null);
    const clockRef = useRef<THREE.Clock | null>(null);
    const modelRef = useRef<THREE.Group | null>(null);
    const lightsRef = useRef<THREE.Group | null>(null);
    const gridHelperRef = useRef<THREE.GridHelper | null>(null);
    const bloomPassRef = useRef<UnrealBloomPass | null>(null);
    const rgbShiftPassRef = useRef<ShaderPass | null>(null);
    const pixelationPassRef = useRef<ShaderPass | null>(null);
    const scanLinesPassRef = useRef<ShaderPass | null>(null);
    const animationsRef = useRef<THREE.AnimationClip[]>([]);
    const mixerRef = useRef<THREE.AnimationMixer | null>(null);
    const originalGeometriesRef = useRef(new Map<string, THREE.BufferGeometry>());
    const isGlitchEffectEnabledRef = useRef(isGlitchEffectEnabled);
    useEffect(() => { isGlitchEffectEnabledRef.current = isGlitchEffectEnabled; }, [isGlitchEffectEnabled]);

    useImperativeHandle(ref, () => ({ getModel: () => modelRef.current, getAnimations: () => animationsRef.current }), []);

    useEffect(() => {
        const currentMount = mountRef.current; if (!currentMount) return;
        clockRef.current = new THREE.Clock();
        const scene = new THREE.Scene(); sceneRef.current = scene;
        const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000); camera.position.z = 50; cameraRef.current = camera;
        const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); renderer.setSize(currentMount.clientWidth, currentMount.clientHeight); renderer.setPixelRatio(window.devicePixelRatio); rendererRef.current = renderer; currentMount.appendChild(renderer.domElement);
        const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controlsRef.current = controls;
        const composer = new EffectComposer(renderer); composerRef.current = composer; composer.addPass(new RenderPass(scene, camera));
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(currentMount.clientWidth, currentMount.clientHeight), 0.4, 0.1, 0.1); composer.addPass(bloomPass); bloomPassRef.current = bloomPass;
        const rgbShiftPass = new ShaderPass(RGBShiftShader); composer.addPass(rgbShiftPass); rgbShiftPassRef.current = rgbShiftPass;
        const pixelationPass = new ShaderPass(PixelationShader); pixelationPass.uniforms['resolution'].value.set(currentMount.clientWidth, currentMount.clientHeight); composer.addPass(pixelationPass); pixelationPassRef.current = pixelationPass;
        const scanLinesPass = new ShaderPass(ScanLineShader); composer.addPass(scanLinesPass); scanLinesPassRef.current = scanLinesPass;
        const lights = new THREE.Group(); lightsRef.current = lights; scene.add(lights);
        const gridHelper = new THREE.GridHelper(200, 50, 0x222222, 0x222222); gridHelperRef.current = gridHelper; scene.add(gridHelper);
        let animationFrameId: number;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            controls.update();
            const clock = clockRef.current;
            if (clock) {
                const delta = clock.getDelta();
                if (mixerRef.current) mixerRef.current.update(delta);
                if (isGlitchEffectEnabledRef.current && rgbShiftPassRef.current) {
                    const time = clock.getElapsedTime();
                    rgbShiftPassRef.current.uniforms['amount'].value = Math.sin(time * 20) * 0.003 + 0.003;
                    rgbShiftPassRef.current.uniforms['angle'].value = Math.sin(time * 5) * Math.PI;
                }
            }
            composer.render();
        };
        animate();
        const handleResize = () => { if (mountRef.current) { const width = mountRef.current.clientWidth, height = mountRef.current.clientHeight; camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height); composer.setSize(width, height); if (pixelationPassRef.current) pixelationPassRef.current.uniforms['resolution'].value.set(width, height); } };
        window.addEventListener('resize', handleResize);
        return () => { cancelAnimationFrame(animationFrameId); window.removeEventListener('resize', handleResize); if(currentMount && renderer.domElement) currentMount.removeChild(renderer.domElement); renderer.dispose(); };
    }, []);

    useEffect(() => {
        const scene = sceneRef.current, camera = cameraRef.current, controls = controlsRef.current; if (!scene || !camera || !controls) return;
        if (modelRef.current) scene.remove(modelRef.current);
        if (svgData) {
            const model = createModelFromSVG(svgData, extrusionDepth, bevelSegments, { color, roughness, metalness, transmission, ior, thickness });
            modelRef.current = model; scene.add(model);
            const box = new THREE.Box3().setFromObject(model); const center = box.getCenter(new THREE.Vector3()); const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z); const fov = camera.fov * (Math.PI / 180); let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)); cameraZ *= 1.5;
            camera.position.copy(center); camera.position.x += size.x / 4; camera.position.y += size.y / 4; camera.position.z += cameraZ;
            controls.target.copy(center); controls.update();
        } else { modelRef.current = null; }
    }, [svgData, extrusionDepth, bevelSegments]);

    useEffect(() => { if (modelRef.current) modelRef.current.traverse((object) => { if (object instanceof THREE.Mesh) { const material = object.material as THREE.MeshPhysicalMaterial; material.color.set(color).convertSRGBToLinear(); material.roughness = roughness; material.metalness = metalness; material.transmission = transmission; material.ior = ior; material.thickness = thickness; material.transparent = transmission > 0; material.needsUpdate = true; } }); }, [color, roughness, metalness, transmission, ior, thickness]);

    useEffect(() => {
        const model = modelRef.current; if (!model) return;
        const removeGlitch = () => {
            if (mixerRef.current) { mixerRef.current.stopAllAction(); mixerRef.current = null; }
            animationsRef.current = [];
            model.traverse((object) => { if (object instanceof THREE.Mesh && originalGeometriesRef.current.has(object.uuid)) { const originalGeo = originalGeometriesRef.current.get(object.uuid); object.geometry.dispose(); if(originalGeo) object.geometry = originalGeo; object.morphTargetInfluences = []; object.morphTargetDictionary = {}; } });
            originalGeometriesRef.current.clear();
            if (rgbShiftPassRef.current && isChromaticAberrationEnabled) { rgbShiftPassRef.current.uniforms['amount'].value = 0.0035; rgbShiftPassRef.current.uniforms['angle'].value = 0.5; }
        };
        const addGlitch = () => {
            const meshes: THREE.Mesh[] = []; originalGeometriesRef.current.clear();
            model.traverse((object) => { if (object instanceof THREE.Mesh) { object.name = object.uuid; originalGeometriesRef.current.set(object.uuid, object.geometry); object.geometry = object.geometry.clone(); meshes.push(object); } }); if (meshes.length === 0) return;
            const bbox = new THREE.Box3().setFromObject(model); const size = bbox.getSize(new THREE.Vector3()); const glitchStrength = Math.max(size.x / 15, 0.2);
            meshes.forEach(mesh => {
                const basePositions = mesh.geometry.attributes.position.array; const glitchedPositions = new Float32Array(basePositions.length); glitchedPositions.set(basePositions);
                for (let i = 0; i < basePositions.length; i+=3) { const y = basePositions[i+1]; const waveOffset = Math.sin(y * 0.25 + 1.5) * glitchStrength * 0.5; glitchedPositions[i] += waveOffset; }
                mesh.geometry.morphAttributes.position = [new THREE.Float32BufferAttribute(glitchedPositions, 3)]; mesh.updateMorphTargets();
            });
            const tracks = meshes.map(mesh => new THREE.NumberKeyframeTrack(`${mesh.name}.morphTargetInfluences[0]`, [0, 0.2, 0.25, 0.3, 0.5, 0.55, 0.8, 0.85, 0.9, 1.1, 1.15, 1.4, 1.45, 1.5, 1.7, 1.75, 2.0], [0, 0, 1.0, 0, 0, 0.8, 0, 1.0, 0.2, 0, 0.7, 0.1, 0.9, 0, 0, 0.6, 0]));
            const clip = new THREE.AnimationClip('Glitch', 2, tracks); animationsRef.current = [clip];
            mixerRef.current = new THREE.AnimationMixer(model); const action = mixerRef.current.clipAction(clip); action.setLoop(THREE.LoopRepeat, Infinity).play();
        };
        if (isGlitchEffectEnabled) addGlitch(); else removeGlitch();
        return () => removeGlitch();
    }, [isGlitchEffectEnabled, isChromaticAberrationEnabled, svgData, extrusionDepth, bevelSegments]);

    useEffect(() => { if (bloomPassRef.current) bloomPassRef.current.enabled = isBloomEffectEnabled; }, [isBloomEffectEnabled]);
    useEffect(() => { if (pixelationPassRef.current) pixelationPassRef.current.enabled = isPixelationEffectEnabled; }, [isPixelationEffectEnabled]);
    useEffect(() => { if (scanLinesPassRef.current) scanLinesPassRef.current.enabled = isScanLinesEnabled; }, [isScanLinesEnabled]);
    useEffect(() => { if (rgbShiftPassRef.current) { const shouldBeEnabled = isGlitchEffectEnabled || isChromaticAberrationEnabled; rgbShiftPassRef.current.enabled = shouldBeEnabled; if (isChromaticAberrationEnabled && !isGlitchEffectEnabled) { rgbShiftPassRef.current.uniforms['amount'].value = 0.0035; rgbShiftPassRef.current.uniforms['angle'].value = 0.5; } } }, [isChromaticAberrationEnabled, isGlitchEffectEnabled]);

    useEffect(() => {
        const lights = lightsRef.current; if (!lights) return;
        while (lights.children.length > 0) lights.remove(lights.children[0]);
        if (lightingPreset === 'studio') { const ambient = new THREE.AmbientLight(0xffffff, 0.7), dir1 = new THREE.DirectionalLight(0xffffff, 1.0), dir2 = new THREE.DirectionalLight(0xffffff, 0.6); dir1.position.set(50, 50, 50); dir2.position.set(-50, 50, -50); lights.add(ambient, dir1, dir2); }
        else if (lightingPreset === 'dramatic') { const ambient = new THREE.AmbientLight(0xffffff, 0.2), key = new THREE.SpotLight(0xffffff, 2.5, 300, Math.PI / 4, 0.5), fill = new THREE.DirectionalLight(0x8888ff, 0.4), rim = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(60, 80, 40); fill.position.set(-50, 30, 20); rim.position.set(-30, 40, -80); lights.add(ambient, key, fill, rim); }
        else if (lightingPreset === 'soft') { const ambient = new THREE.AmbientLight(0xffffff, 0.8), hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.9); hemi.position.set(0, 100, 0); lights.add(ambient, hemi); }
    }, [lightingPreset]);

    useEffect(() => { if (sceneRef.current) sceneRef.current.background = new THREE.Color(backgroundColor); }, [backgroundColor]);
    useEffect(() => { if (gridHelperRef.current) gridHelperRef.current.visible = isGridVisible; }, [isGridVisible]);

    return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
});


// --- MAIN APP COMPONENT (from App.tsx, renamed to New) ---

const GlobalStyles = () => (
  <style>{`
    :root { --color-accent: ${styles.colors.accent}; --color-surface: ${styles.colors.surface}; --color-background: ${styles.colors.background}; }
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font-family: ${styles.typography.fontFamily}; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; background-color: ${styles.colors.background}; color: ${styles.colors.textPrimary}; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 800 800' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E"); background-size: cover; opacity: 0.98; }
    #root { height: 100vh; width: 100vw; overflow: hidden; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0; }
    .custom-scrollbar::-webkit-scrollbar { width: 8px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.15); border-radius: ${styles.radii.full}; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(255, 255, 255, 0.25); }
    input[type=range] { -webkit-appearance: none; appearance: none; background: transparent; cursor: pointer; width: 100%; }
    input[type=range]:focus { outline: none; }
    input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; margin-top: -6px; background-color: ${styles.colors.accent}; height: 20px; width: 20px; border-radius: ${styles.radii.full}; border: 3px solid ${styles.colors.background}; box-shadow: 0 0 0 2px ${styles.colors.surface}, 0 0 8px ${styles.colors.accentGlow}; transition: transform 150ms ease; }
    input[type=range]::-moz-range-thumb { background-color: ${styles.colors.accent}; height: 14px; width: 14px; border-radius: ${styles.radii.full}; border: 3px solid ${styles.colors.background}; box-shadow: 0 0 0 2px ${styles.colors.surface}, 0 0 8px ${styles.colors.accentGlow}; transition: transform 150ms ease; }
    input[type=range]:active::-webkit-slider-thumb { transform: scale(1.15); }
    input[type=range]:active::-moz-range-thumb { transform: scale(1.15); }
    input[type=range]::-webkit-slider-runnable-track { background: linear-gradient(to right, ${styles.colors.accent}, ${styles.colors.accent} var(--value-percent, 0%), rgba(255,255,255,0.1) var(--value-percent, 0%), rgba(255,255,255,0.1)); border-radius: ${styles.radii.md}; height: 8px; }
    input[type=range]::-moz-range-track { background: linear-gradient(to right, ${styles.colors.accent}, ${styles.colors.accent} var(--value-percent, 0%), rgba(255,255,255,0.1) var(--value-percent, 0%), rgba(255,255,255,0.1)); border-radius: ${styles.radii.md}; height: 8px; }
  `}</style>
);

export default function New() {
  const [svgData, setSvgData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState<number>(0);
  const [extrusion, setExtrusion] = useState<number>(10);
  const [bevelSegments, setBevelSegments] = useState<number>(2);
  const [color, setColor] = useState<string>('#cccccc');
  const [roughness, setRoughness] = useState<number>(0.5);
  const [metalness, setMetalness] = useState<number>(0.1);
  const [transmission, setTransmission] = useState<number>(0);
  const [ior, setIor] = useState<number>(1.5);
  const [thickness, setThickness] = useState<number>(0.5);
  const [lightingPreset, setLightingPreset] = useState<string>('studio');
  const [backgroundColor, setBackgroundColor] = useState<string>('#0a0a0a');
  const [isGridVisible, setIsGridVisible] = useState<boolean>(true);
  const [isGlitchEffectEnabled, setIsGlitchEffectEnabled] = useState<boolean>(false);
  const [isBloomEffectEnabled, setIsBloomEffectEnabled] = useState<boolean>(false);
  const [isPixelationEffectEnabled, setIsPixelationEffectEnabled] = useState<boolean>(false);
  const [isChromaticAberrationEnabled, setIsChromaticAberrationEnabled] = useState<boolean>(false);
  const [isScanLinesEnabled, setIsScanLinesEnabled] = useState<boolean>(false);
  const sceneRef = useRef<ThreeSceneRef>(null);

  const handleFileLoad = useCallback((svgContent: string) => {
    setIsLoading(true); setError(null);
    setTimeout(() => {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgContent, "image/svg+xml");
        if (doc.getElementsByTagName("parsererror").length > 0) throw new Error("Invalid SVG file format.");
        setSvgData(svgContent); setKey(prevKey => prevKey + 1);
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
        setError(`Failed to process SVG: ${errorMessage}`); setSvgData(null);
      } finally { setIsLoading(false); }
    }, 100);
  }, []);

  const handleClear = useCallback(() => {
    setSvgData(null); setError(null); setColor('#cccccc'); setRoughness(0.5); setMetalness(0.1); setTransmission(0);
    setIor(1.5); setThickness(0.5); setExtrusion(10); setBevelSegments(2); setLightingPreset('studio');
    setBackgroundColor('#0a0a0a'); setIsGridVisible(true); setIsGlitchEffectEnabled(false); setIsBloomEffectEnabled(false);
    setIsPixelationEffectEnabled(false); setIsChromaticAberrationEnabled(false); setIsScanLinesEnabled(false);
    setKey(prevKey => prevKey + 1);
  }, []);

  const handleExport = () => {
    const model = sceneRef.current?.getModel();
    if (model) {
        const exporter = new GLTFExporter();
        const options = { animations: sceneRef.current?.getAnimations() || [], binary: true };
        exporter.parse(model, (gltf) => {
            const blob = new Blob([gltf as ArrayBuffer], { type: 'application/octet-stream' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob); link.download = 'model.glb'; link.click();
        }, (error) => { console.error('An error happened during parsing', error); alert("Could not export model. See console for details."); }, options);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'row', height: '100%', overflow: 'hidden', position: 'relative' }}>
      <GlobalStyles />
      <ControlPanel onFileLoad={handleFileLoad} onClear={handleClear} extrusion={extrusion} setExtrusion={setExtrusion}
        bevelSegments={bevelSegments} setBevelSegments={setBevelSegments} isLoading={isLoading} hasModel={!!svgData} error={error}
        color={color} setColor={setColor} roughness={roughness} setRoughness={setRoughness} metalness={metalness} setMetalness={setMetalness}
        transmission={transmission} setTransmission={setTransmission} ior={ior} setIor={setIor} thickness={thickness} setThickness={setThickness}
        lightingPreset={lightingPreset} setLightingPreset={setLightingPreset} backgroundColor={backgroundColor} setBackgroundColor={setBackgroundColor}
        isGridVisible={isGridVisible} setIsGridVisible={setIsGridVisible} isGlitchEffectEnabled={isGlitchEffectEnabled} setIsGlitchEffectEnabled={setIsGlitchEffectEnabled}
        isBloomEffectEnabled={isBloomEffectEnabled} setIsBloomEffectEnabled={setIsBloomEffectEnabled} isPixelationEffectEnabled={isPixelationEffectEnabled}
        setIsPixelationEffectEnabled={setIsPixelationEffectEnabled} isChromaticAberrationEnabled={isChromaticAberrationEnabled} setIsChromaticAberrationEnabled={setIsChromaticAberrationEnabled}
        isScanLinesEnabled={isScanLinesEnabled} setIsScanLinesEnabled={setIsScanLinesEnabled} onExport={handleExport} />
      <main style={{ flexGrow: 1, position: 'relative', backgroundColor: styles.colors.background }}>
        {isLoading && ( <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(5, 5, 5, 0.8)', backdropFilter: 'blur(4px)', zIndex: 20 }}> <Loader /> </div> )}
        {!svgData && !isLoading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, pointerEvents: 'none', animation: 'fadeIn 0.5s ease-out both' }}>
              <div style={{ textAlign: 'center', color: styles.colors.textSecondary }}>
                  <VectorPenIcon style={{ margin: '0 auto', height: '80px', width: '80px', color: '#3f3f46' }} />
                  <h2 style={{...styles.typography.h1, color: styles.colors.textPrimary, marginTop: styles.spacing.lg}}>3D Vector Engine</h2>
                  <p style={{...styles.typography.body, color: styles.colors.textSecondary, marginTop: styles.spacing.xs}}>Upload an SVG file to begin</p>
              </div>
          </div>
        )}
        <ThreeScene key={key} ref={sceneRef} svgData={svgData} extrusionDepth={extrusion} bevelSegments={bevelSegments} color={color}
          roughness={roughness} metalness={metalness} transmission={transmission} ior={ior} thickness={thickness} lightingPreset={lightingPreset}
          backgroundColor={backgroundColor} isGridVisible={isGridVisible} isGlitchEffectEnabled={isGlitchEffectEnabled} isBloomEffectEnabled={isBloomEffectEnabled}
          isPixelationEffectEnabled={isPixelationEffectEnabled} isChromaticAberrationEnabled={isChromaticAberrationEnabled} isScanLinesEnabled={isScanLinesEnabled} />
      </main>
    </div>
  );
};