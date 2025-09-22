import styled, { createGlobalStyle, keyframes } from 'styled-components';

export const theme = {
  colors: {
    background: '#121212',
    primaryText: '#EAEAEA',
    secondaryText: '#A0A0A0',
  },
  fonts: {
    body: "'Inter', sans-serif",
  },
  effects: {
    transition: 'all 0.8s cubic-bezier(0.25, 1, 0.5, 1)',
  },
};

export type ThemeType = typeof theme;

declare module 'styled-components' {
  export interface DefaultTheme extends ThemeType {}
}

const fadeInOut = keyframes`
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  20%, 80% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(-10px);
  }
`;

// Fix: Add rotate keyframes for loader animation
const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: ${({ theme }) => theme.fonts.body};
    background-color: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.primaryText};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow: hidden;
    cursor: none;
  }
  
  body:before {
    content: '';
    position: fixed;
    width: 8px;
    height: 8px;
    background: white;
    border-radius: 100%;
    transform: translate(-50%, -50%);
    mix-blend-mode: difference;
    pointer-events: none;
    z-index: 1000;
    left: var(--x);
    top: var(--y);
    transition: transform 0.1s ease-out;
  }
`;

export const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background-color: ${({ theme }) => theme.colors.background};
`;

export const MainContent = styled.main`
  flex-grow: 1;
  position: relative;
`;

export const CanvasContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
`;

export const InstructionText = styled.p`
  position: absolute;
  bottom: 15%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  color: ${({ theme }) => theme.colors.primaryText};
  font-size: 16px;
  font-weight: 500;
  background-color: rgba(0,0,0,0.5);
  padding: 8px 16px;
  border-radius: 8px;
  pointer-events: none;
  animation: ${fadeInOut} 6s ease-in-out forwards;
`;

export const ControlsContainer = styled.div`
  position: absolute;
  bottom: 5%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  background-color: rgba(0, 0, 0, 0.5);
  padding: 15px 20px;
  border-radius: 12px;
  width: 300px;
`;

export const SliderLabel = styled.label`
  color: ${({ theme }) => theme.colors.primaryText};
  font-size: 14px;
  font-weight: 500;
  width: 100%;
  text-align: center;
`;

export const Slider = styled.input.attrs({ type: 'range' })`
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 8px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.3);
  outline: none;
  opacity: 0.8;
  transition: opacity 0.2s;
  cursor: pointer;

  &:hover {
    opacity: 1;
  }

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.primaryText};
    cursor: pointer;
  }

  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.primaryText};
    cursor: pointer;
  }
`;

// Fix: Add missing styled components for Uploader
export const UploadBox = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  gap: 20px;
  z-index: 10;
  background: rgba(0, 0, 0, 0.7);
  padding: 40px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

export const FileInputLabel = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  border: 2px dashed ${({ theme }) => theme.colors.secondaryText};
  border-radius: 8px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.secondaryText};
  transition: ${({ theme }) => theme.effects.transition};
  width: 300px;
  text-align: center;

  p {
    margin: 10px 0 5px;
    color: ${({ theme }) => theme.colors.primaryText};
  }
  
  span {
    font-size: 12px;
  }

  &:hover {
    border-color: ${({ theme }) => theme.colors.primaryText};
    color: ${({ theme }) => theme.colors.primaryText};
  }
`;

export const HiddenInput = styled.input`
  display: none;
`;

// Fix: Add missing styled component for Loader
export const LoaderContainer = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 50px;
  height: 50px;
  margin-left: -25px;
  margin-top: -25px;
  border: 5px solid rgba(255, 255, 255, 0.2);
  border-top-color: ${({ theme }) => theme.colors.primaryText};
  border-radius: 50%;
  animation: ${rotate} 1s linear infinite;
  z-index: 10;
`;