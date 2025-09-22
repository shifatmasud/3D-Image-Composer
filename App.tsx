import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ThemeProvider } from 'styled-components';
import { ParallaxScene } from './components/ParallaxScene';
import { Uploader } from './components/Uploader';
import { Loader } from './components/Loader';
import { usePointer } from './hooks/usePointer';
import {
  theme,
  GlobalStyle,
  AppContainer,
  MainContent,
  CanvasContainer,
  InstructionText,
  ControlsContainer,
  SliderLabel,
  Slider,
  PerformanceWarning,
  ToggleContainer,
  ToggleLabel,
  HiddenCheckbox,
  StyledToggle,
} from './style';

interface AppState {
  imageUrl: string | null;
  depthUrl: string | null;
}

function App() {
  const [files, setFiles] = useState<AppState>({ imageUrl: null, depthUrl: null });
  const [realism, setRealism] = useState(0.5); // Single control slider state
  const [isPerfSucks, setPerfSucks] = useState(false);
  const [isStatic, setStatic] = useState(false);
  const sceneContainerRef = useRef<HTMLDivElement>(null);
  const pointer = usePointer(sceneContainerRef);

  // Generate a neutral depth map for static mode
  const neutralDepthMap = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = 'rgb(128, 128, 128)'; // Neutral gray for no displacement
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    return canvas.toDataURL();
  }, []);

  // Derive all rendering parameters from the single "realism" state
  const renderingParams = useMemo(() => {
    // baseDepth: increases with realism for more background pop
    const baseDepth = realism * 0.4;
    // depthScale: the main driver of the 3D effect
    const depthScale = realism * 1.0;
    // layerCount: more layers for more realism, rounded to steps of 8
    const layerCount = Math.round((32 + realism * 96) / 8) * 8; // Maps 0-1 to 32-128
    // layerBlending: becomes sharper as realism and detail increase
    const layerBlending = 0.4 - realism * 0.3; // Maps 0-1 to 0.4-0.1
    // bloomIntensity: more cinematic glow at higher realism
    const bloomIntensity = 0.2 + realism * 0.8; // Maps 0-1 to 0.2-1.0 (Reduced from 1.5)
    // atmosphere: more intense god rays at higher realism
    const atmosphere = 0.1 + realism * 0.9; // Maps 0-1 to 0.1-1.0

    // New Params for the upgraded engine
    // normalIntensity: controls the strength of the detail lighting on the base layer.
    const normalIntensity = realism * 1.0;
    // ssaoIntensity: adds realistic contact shadows.
    const ssaoIntensity = realism * 25;
    // ssaoRadius: defines how far the SSAO effect looks for shadows.
    const ssaoRadius = realism * 0.1;

    return { 
      baseDepth, 
      depthScale, 
      layerCount, 
      layerBlending, 
      bloomIntensity, 
      atmosphere,
      normalIntensity,
      ssaoIntensity,
      ssaoRadius,
    };
  }, [realism]);

  useEffect(() => {
    return () => {
      if (files.imageUrl) URL.revokeObjectURL(files.imageUrl);
      if (files.depthUrl) URL.revokeObjectURL(files.depthUrl);
    };
  }, [files]);

  const handleFilesSelected = (imageFile: File, depthFile: File) => {
    if (files.imageUrl) URL.revokeObjectURL(files.imageUrl);
    if (files.depthUrl) URL.revokeObjectURL(files.depthUrl);
    
    setFiles({
      imageUrl: URL.createObjectURL(imageFile),
      depthUrl: URL.createObjectURL(depthFile),
    });
  };

  const isSceneReady = files.imageUrl && files.depthUrl;

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <AppContainer>
        <MainContent ref={sceneContainerRef}>
          {isSceneReady ? (
            <>
              {isPerfSucks && <PerformanceWarning>Performance mode enabled: Detail reduced.</PerformanceWarning>}
              <CanvasContainer>
                <React.Suspense fallback={<Loader />}>
                   <ParallaxScene 
                    imageUrl={files.imageUrl!} 
                    depthUrl={isStatic ? neutralDepthMap : files.depthUrl!}
                    pointer={pointer}
                    baseDepth={renderingParams.baseDepth}
                    depthScale={renderingParams.depthScale}
                    layerCount={isPerfSucks ? 32 : renderingParams.layerCount}
                    layerBlending={renderingParams.layerBlending}
                    bloomIntensity={renderingParams.bloomIntensity}
                    atmosphere={renderingParams.atmosphere}
                    isPerfSucks={isPerfSucks}
                    onIncline={() => setPerfSucks(false)}
                    onDecline={() => setPerfSucks(true)}
                    normalIntensity={renderingParams.normalIntensity}
                    ssaoIntensity={renderingParams.ssaoIntensity}
                    ssaoRadius={renderingParams.ssaoRadius}
                    isStatic={isStatic}
                  />
                </React.Suspense>
              </CanvasContainer>
              <InstructionText>Move your cursor to experience the effect.</InstructionText>
              <ControlsContainer>
                <SliderLabel htmlFor="realism-slider">
                  Realism: {realism.toFixed(2)}
                </SliderLabel>
                <Slider
                  id="realism-slider"
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.01"
                  value={realism}
                  onChange={(e) => setRealism(parseFloat(e.target.value))}
                />
                <ToggleContainer>
                  <ToggleLabel htmlFor="static-toggle">Static Mode</ToggleLabel>
                  <HiddenCheckbox
                    id="static-toggle"
                    type="checkbox"
                    checked={isStatic}
                    onChange={(e) => setStatic(e.target.checked)}
                  />
                  <StyledToggle htmlFor="static-toggle" />
                </ToggleContainer>
              </ControlsContainer>
            </>
          ) : (
            <Uploader onFilesSelected={handleFilesSelected} />
          )}
        </MainContent>
      </AppContainer>
    </ThemeProvider>
  );
}

export default App;