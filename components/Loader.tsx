import React from 'react';
import { LoaderWrapper, LoaderSpinner, LoadingText } from '../style';

interface LoaderProps {
  message?: string;
}

export const Loader: React.FC<LoaderProps> = ({ message }) => {
  return (
    <LoaderWrapper>
      <LoaderSpinner />
      {message && <LoadingText>{message}</LoadingText>}
    </LoaderWrapper>
  );
};
