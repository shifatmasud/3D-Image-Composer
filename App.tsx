import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ThemeProvider } from 'styled-components';
import { GoogleGenAI, Modality } from '@google/genai';
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
  ErrorDisplay,
} from './style';

const loadingMessages = [
  'Generating 3D Scene with AI...',
  'Analyzing image pixels...',
  'Conjuring dimensions...',
  'Building your 3D world...',
  'Almost there...',
];

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

function App() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [depthUrl, setDepthUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);
  const [error, setError] = useState<string | null>(null);

  const [displacementScale, setDisplacementScale] = useState(0.3);
  const [meshDetail, setMeshDetail] = useState(256);
  const [isPerfSucks, setPerfSucks] = useState(false);
  
  const sceneContainerRef = useRef<HTMLDivElement>(null);
  const pointer = usePointer(sceneContainerRef);

  // Manages the lifecycle of the image object URL.
  useEffect(() => {
    // The effect returns a cleanup function that will be called when imageUrl changes or the component unmounts.
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  // Manages the lifecycle of the depth map object URL.
  useEffect(() => {
    return () => {
      if (depthUrl) {
        URL.revokeObjectURL(depthUrl);
      }
    };
  }, [depthUrl]);

  // Manages the loading message interval based on the isLoading state.
  useEffect(() => {
    let intervalId: number | null = null;
    if (isLoading) {
      setLoadingMessage(loadingMessages[0]); // Reset to first message on new load
      intervalId = window.setInterval(() => {
        setLoadingMessage(prev => {
          const currentIndex = loadingMessages.indexOf(prev);
          return loadingMessages[(currentIndex + 1) % loadingMessages.length];
        });
      }, 2500);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isLoading]);

  const resetState = useCallback(() => {
    // Setting state to null will trigger the cleanup effects for the URLs and interval.
    setImageUrl(null);
    setDepthUrl(null);
    setError(null);
    setIsLoading(false);
  }, []);

  const generateDepthMap = useCallback(async (imageFile: File) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      const imagePart = await fileToGenerativePart(imageFile);

      const prompt = `Analyze this image and generate a detailed depth map for it. A depth map is a grayscale image where white represents objects closest to the viewer, and black represents objects farthest away. The background should be black, and foreground elements should be progressively lighter. The output must be only the depth map image, with no other text, explanation, or artifacts.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
      });

      const imagePartResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

      if (imagePartResponse?.inlineData) {
        const { data, mimeType } = imagePartResponse.inlineData;
        const blob = await (await fetch(`data:${mimeType};base64,${data}`)).blob();
        setDepthUrl(URL.createObjectURL(blob));
      } else {
        throw new Error('AI did not return a valid depth map. Please try a different image.');
      }
    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(`Failed to generate depth map. ${errorMessage}`);
      setImageUrl(null); // This triggers cleanup for the just-created image URL.
    } finally {
      setIsLoading(false); // This triggers cleanup for the loading interval.
    }
  }, []);

  const handleFileSelected = (imageFile: File) => {
    // First, reset all state. This clears the old scene and revokes old URLs via effects.
    resetState();
    
    // Then, create the new image URL and start the loading process.
    setImageUrl(URL.createObjectURL(imageFile));
    setIsLoading(true); // This will trigger the loading interval effect to start.

    generateDepthMap(imageFile);
  };

  const isSceneReady = imageUrl && depthUrl && !isLoading;

  const renderContent = () => {
    if (error) {
      return (
        <ErrorDisplay>
          <p>{error}</p>
          <button onClick={resetState}>Try Again</button>
        </ErrorDisplay>
      );
    }
    if (isLoading || (imageUrl && !depthUrl)) {
      return <Loader message={loadingMessage} />;
    }
    if (isSceneReady) {
      return (
        <>
          {isPerfSucks && <PerformanceWarning>Performance mode enabled</PerformanceWarning>}
          <CanvasContainer>
            <React.Suspense fallback={<Loader />}>
              <ParallaxScene
                imageUrl={imageUrl!}
                depthUrl={depthUrl!}
                pointer={pointer}
                displacementScale={displacementScale}
                meshDetail={meshDetail}
                isPerfSucks={isPerfSucks}
                onIncline={() => setPerfSucks(false)}
                onDecline={() => setPerfSucks(true)}
              />
            </React.Suspense>
          </CanvasContainer>
          <InstructionText>Move your cursor to experience the effect.</InstructionText>
          <ControlsContainer>
            <SliderLabel htmlFor="depth-slider">3D Depth: {displacementScale.toFixed(2)}</SliderLabel>
            <Slider id="depth-slider" type="range" min="0" max="1.5" step="0.01" value={displacementScale} onChange={(e) => setDisplacementScale(parseFloat(e.target.value))} />
            <SliderLabel htmlFor="detail-slider">Model Detail: {meshDetail}</SliderLabel>
            <Slider id="detail-slider" type="range" min="32" max="512" step="16" value={meshDetail} onChange={(e) => setMeshDetail(parseInt(e.target.value, 10))} />
          </ControlsContainer>
        </>
      );
    }
    return <Uploader onFileSelected={handleFileSelected} />;
  };

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <AppContainer>
        <MainContent ref={sceneContainerRef}>{renderContent()}</MainContent>
      </AppContainer>
    </ThemeProvider>
  );
}

export default App;