import React, { useState, useRef, useEffect } from 'react';
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
  PerformanceWarning
} from './style';

interface AppState {
  imageUrl: string | null;
  depthUrl: string | null;
}

function App() {
  const [files, setFiles] = useState<AppState>({ imageUrl: null, depthUrl: null });
  const [displacementScale, setDisplacementScale] = useState(0.3);
  const [meshDetail, setMeshDetail] = useState(256);
  const [bloomIntensity, setBloomIntensity] = useState(0.5);
  const [isPerfSucks, setPerfSucks] = useState(false);
  const sceneContainerRef = useRef<HTMLDivElement>(null);
  const pointer = usePointer(sceneContainerRef);

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
              {isPerfSucks && <PerformanceWarning>Performance mode enabled</PerformanceWarning>}
              <CanvasContainer>
                <React.Suspense fallback={<Loader />}>
                   <ParallaxScene 
                    imageUrl={files.imageUrl!} 
                    depthUrl={files.depthUrl!}
                    pointer={pointer}
                    displacementScale={displacementScale}
                    meshDetail={meshDetail}
                    bloomIntensity={bloomIntensity}
                    isPerfSucks={isPerfSucks}
                    onIncline={() => setPerfSucks(false)}
                    onDecline={() => setPerfSucks(true)}
                  />
                </React.Suspense>
              </CanvasContainer>
              <InstructionText>Move your cursor to experience the effect.</InstructionText>
              <ControlsContainer>
                <SliderLabel htmlFor="depth-slider">
                  3D Depth: {displacementScale.toFixed(2)}
                </SliderLabel>
                <Slider
                  id="depth-slider"
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.01"
                  value={displacementScale}
                  onChange={(e) => setDisplacementScale(parseFloat(e.target.value))}
                />
                <SliderLabel htmlFor="detail-slider">
                  Model Detail: {meshDetail}
                </SliderLabel>
                <Slider
                  id="detail-slider"
                  type="range"
                  min="32"
                  max="512"
                  step="16"
                  value={meshDetail}
                  onChange={(e) => setMeshDetail(parseInt(e.target.value, 10))}
                />
                <SliderLabel htmlFor="bloom-slider">
                  Bloom Intensity: {bloomIntensity.toFixed(2)}
                </SliderLabel>
                <Slider
                  id="bloom-slider"
                  type="range"
                  min="0"
                  max="2.0"
                  step="0.05"
                  value={bloomIntensity}
                  onChange={(e) => setBloomIntensity(parseFloat(e.target.value))}
                />
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