import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, ChromaticAberration, Vignette, GodRays, SMAA } from '@react-three/postprocessing';
import { Vector2, Mesh } from 'three';
import { KernelSize } from 'postprocessing';

interface EffectsProps {
  pointer: React.MutableRefObject<Vector2>;
  bloomIntensity: number;
  atmosphere: number;
  sunRef: React.RefObject<Mesh>;
}

const ChromaticAberrationEffect: React.FC<{ pointer: React.MutableRefObject<Vector2> }> = ({ pointer }) => {
  const aberrationRef = useRef<any>(null!);
  useFrame(() => {
    if (aberrationRef.current) {
      // Reduced strength for a more subtle effect
      const offsetStrength = pointer.current.length() * 0.001;
      aberrationRef.current.offset.set(pointer.current.x * offsetStrength, pointer.current.y * offsetStrength);
    }
  });
  return <ChromaticAberration ref={aberrationRef} offset={new Vector2(0, 0)} />;
};

export const Effects: React.FC<EffectsProps> = ({ pointer, bloomIntensity, atmosphere, sunRef }) => {
  return (
    <EffectComposer multisampling={0} depthBuffer={true}>
      <SMAA />
      <Bloom 
        intensity={bloomIntensity} 
        luminanceThreshold={0.1}
        luminanceSmoothing={0.9}
        mipmapBlur
        kernelSize={KernelSize.HUGE}
      />
      {sunRef.current && (
        <GodRays
          sun={sunRef.current}
          kernelSize={KernelSize.SMALL}
          density={0.96}
          decay={0.93}
          weight={atmosphere}
          exposure={0.54}
          samples={60}
          clampMax={1}
        />
      )}
      <ChromaticAberrationEffect pointer={pointer} />
      {/* Reduced vignette for a less intrusive effect */}
      <Vignette eskil={false} offset={0.1} darkness={0.9} />
    </EffectComposer>
  );
};