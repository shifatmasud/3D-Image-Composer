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
} from './style';

interface AppState {
  imageUrl: string | null;
  depthUrl: string | null;
}

function App() {
  const [files, setFiles] = useState<AppState>({ imageUrl: null, depthUrl: null });
  const [displacementScale, setDisplacementScale] = useState(0.3);
  const [meshDetail, setMeshDetail] = useState(256);
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
              <CanvasContainer>
                <React.Suspense fallback={<Loader />}>
                   <ParallaxScene 
                    imageUrl={files.imageUrl!} 
                    depthUrl={files.depthUrl!}
                    pointer={pointer}
                    displacementScale={displacementScale}
                    meshDetail={meshDetail}
                  />
                </React.Suspense>
              </CanvasContainer>
              <InstructionText>Move your cursor to rotate the model.</InstructionText>
              <ControlsContainer>
                <SliderLabel htmlFor="depth-slider">
                  3D Depth: {displacementScale.toFixed(2)}
                </SliderLabel>
                <Slider
                  id="depth-slider"
                  type="range"
                  min="0"
                  max="0.8"
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