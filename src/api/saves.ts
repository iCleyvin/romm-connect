// by Cleyvin

import { getApiClient } from './client';

export interface SaveFile {
  id: number;
  rom_id: number;
  emulator?: string;
  slot?: number;
  device_id?: string;
  file_name: string;
  file_size_bytes: number;
  created_at: string;
  updated_at: string;
}

export const getSaves = async (romId: number): Promise<SaveFile[]> => {
  const client = getApiClient();
  const response = await client.get('/api/saves', { params: { rom_id: romId } });
  return response.data;
};

export const uploadSave = async (
  romId: number,
  saveData: string,
  fileName: string,
  emulator?: string,
): Promise<SaveFile> => {
  const client = getApiClient();
  const formData = new FormData();
  formData.append('rom_id', romId.toString());
  if (emulator) formData.append('emulator', emulator);
  formData.append('file', {
    uri: saveData,
    name: fileName,
    type: 'application/octet-stream',
  } as any);

  const response = await client.post('/api/saves', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const downloadSave = async (saveId: number): Promise<string> => {
  const client = getApiClient();
  const response = await client.get(`/api/saves/${saveId}/content`, {
    responseType: 'arraybuffer',
  });
  return response.data;
};
