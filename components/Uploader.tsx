import React, { useState, useEffect } from 'react';
import { UploadSimple, Image as ImageIcon } from 'phosphor-react';
import { FileInputLabel, HiddenInput, UploadBox } from '../style';

interface UploaderProps {
  onFilesSelected: (imageFile: File, depthFile: File) => void;
}

export const Uploader: React.FC<UploaderProps> = ({ onFilesSelected }) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [depthFile, setDepthFile] = useState<File | null>(null);

  useEffect(() => {
    if (imageFile && depthFile) {
      onFilesSelected(imageFile, depthFile);
    }
  }, [imageFile, depthFile, onFilesSelected]);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<File | null>>
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setter(file);
    }
  };

  return (
    <UploadBox>
      <FileInputLabel>
        <ImageIcon size={48} weight="light" />
        <p>{imageFile ? `Selected: ${imageFile.name}` : 'Upload your Image'}</p>
        <span>Max 5MB. PNG, JPG.</span>
        <HiddenInput
          type="file"
          accept="image/png, image/jpeg"
          onChange={(e) => handleFileChange(e, setImageFile)}
        />
      </FileInputLabel>
      <FileInputLabel>
        <UploadSimple size={48} weight="light" />
        <p>{depthFile ? `Selected: ${depthFile.name}` : 'Upload your Depth Map'}</p>
        <span>A grayscale image for depth.</span>
        <HiddenInput
          type="file"
          accept="image/png, image/jpeg"
          onChange={(e) => handleFileChange(e, setDepthFile)}
        />
      </FileInputLabel>
    </UploadBox>
  );
};
