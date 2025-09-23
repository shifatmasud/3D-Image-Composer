import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ThemeProvider } from 'styled-components';
import { DownloadSimple, UploadSimple, ArchiveBox } from 'phosphor-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ParallaxScene } from './components/ParallaxScene';
import { Uploader } from './components/Uploader';
import { Loader } from './components/Loader';
import { usePointer } from './hooks/usePointer';
import { LayeredImageRef } from './components/LayeredImage';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
// Fix: Import 'HiddenInput' from './style' to resolve the 'Cannot find name' error.
import {
  theme,
  GlobalStyle,
  AppContainer,
  MainContent,
  CanvasContainer,
  SidePanel,
  PanelTitle,
  ControlGroup,
  SliderLabel,
  Slider,
  ToggleContainer,
  ToggleLabel,
  HiddenCheckbox,
  StyledToggle,
  Separator,
  PresetButton,
  HiddenInput,
} from './style';

interface AppState {
  imageUrl: string | null;
  depthUrl: string | null;
}

function App() {
  const [files, setFiles] = useState<AppState>({ imageUrl: null, depthUrl: null });
  const [isStatic, setStatic] = useState(false);
  const sceneContainerRef = useRef<HTMLDivElement>(null);
  const pointer = usePointer(sceneContainerRef);
  const importRef = useRef<HTMLInputElement>(null);
  const layeredImageRef = useRef<LayeredImageRef>(null);

  // State for new rendering parameters
  const [backgroundCutoff, setBackgroundCutoff] = useState(0.25);
  const [middlegroundCutoff, setMiddlegroundCutoff] = useState(0.5); // New state for mid-layer
  const [depthScale, setDepthScale] = useState(0.5);
  const [layerBlending, setLayerBlending] = useState(0.1);


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

  const handleExport = () => {
    const settings = {
      backgroundCutoff,
      middlegroundCutoff,
      depthScale,
      layerBlending,
      isStatic,
    };
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
    if (value > middlegroundCutoff) {
      setMiddlegroundCutoff(value);
    }
  };

  const handleMiddlegroundCutoffChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setMiddlegroundCutoff(value);
    if (value < backgroundCutoff) {
      setBackgroundCutoff(value);
    }
  };


  const isSceneReady = files.imageUrl && files.depthUrl;

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
        {isSceneReady && (
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
              {/* Fix: Corrected closing tags for PresetButton components from <P> to </PresetButton> to resolve JSX parsing errors. */}
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
          {!isSceneReady && <Uploader onFilesSelected={handleFilesSelected} />}
        </AnimatePresence>
      </AppContainer>
    </ThemeProvider>
  );
}

export default App;