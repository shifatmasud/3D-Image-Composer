import React from 'react';
import { Image as ImageIcon } from 'phosphor-react';
import { FileInputLabel, HiddenInput, UploadBox } from '../style';

interface UploaderProps {
  onFileSelected: (imageFile: File) => void;
}

export const Uploader: React.FC<UploaderProps> = ({ onFileSelected }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelected(e.target.files[0]);
      // Reset input to allow uploading the same file again
      e.target.value = '';
    }
  };

  return (
    <UploadBox>
      <FileInputLabel>
        <ImageIcon size={48} weight="light" />
        <p>Create a 3D Photo with AI</p>
        <span>Upload any image and we'll magically add depth.</span>
        <HiddenInput
          type="file"
          accept="image/png, image/jpeg"
          onChange={handleFileChange}
        />
      </FileInputLabel>
    </UploadBox>
  );
};