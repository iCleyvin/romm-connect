// by Cleyvin

import { getApiClient } from './client';

export const uploadRom = async (
  platformId: number,
  fileName: string,
  fileUri: string,
  onProgress?: (progress: number) => void,
): Promise<any> => {
  const client = getApiClient();

  // The multipart field name MUST match the filename exactly
  const formData = new FormData();
  formData.append(fileName, {
    uri: fileUri,
    name: fileName,
    type: 'application/octet-stream',
  } as any);

  const response = await client.post('/api/roms', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'x-upload-platform': platformId.toString(),
      'x-upload-filename': fileName,
    },
    timeout: 600000,
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
      }
    },
  });
  return response.data;
};
