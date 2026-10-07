// by Cleyvin

import { File } from 'expo-file-system';
import { api } from './client';
import { isMissingEndpoint } from './errors';
import { API_PATHS } from '../constants';

const CHUNK_SIZE = 5 * 1024 * 1024;
const CHUNK_RETRIES = 3;

export interface UploadSource {
  uri: string;
  name: string;
  size: number;
}

const sendChunks = async (
  uploadId: string,
  file: File,
  size: number,
  onProgress: (fraction: number) => void,
): Promise<void> => {
  const uploadUrl = `${API_PATHS.ROMS}/upload/${uploadId}`;
  const totalChunks = Math.ceil(size / CHUNK_SIZE);
  const handle = file.open();
  try {
    for (let index = 0; index < totalChunks; index++) {
      handle.offset = index * CHUNK_SIZE;
      const chunk = handle.readBytes(Math.min(CHUNK_SIZE, size - index * CHUNK_SIZE));

      for (let attempt = 1; ; attempt++) {
        try {
          await api.put(uploadUrl, chunk.buffer, {
            headers: { 'Content-Type': 'application/octet-stream', 'x-chunk-index': String(index) },
            timeout: 120000,
            onUploadProgress: (event) => {
              const sent = index * CHUNK_SIZE + Math.min(event.loaded, chunk.length);
              onProgress(Math.min(sent / size, 1));
            },
          });
          break;
        } catch (err) {
          if (attempt >= CHUNK_RETRIES) throw err;
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
      onProgress(Math.min(((index + 1) * CHUNK_SIZE) / size, 1));
    }
    await api.post(`${uploadUrl}/complete`, null, { timeout: 300000 });
  } catch (err) {
    api.post(`${uploadUrl}/cancel`).catch(() => {});
    throw err;
  } finally {
    handle.close();
  }
};

// Older RoMM releases take the whole file as one multipart request whose
// field name is the file name.
const uploadSingleRequest = async (
  platformId: number,
  source: UploadSource,
  onProgress: (fraction: number) => void,
): Promise<void> => {
  const form = new FormData();
  form.append(source.name, { uri: source.uri, name: source.name, type: 'application/octet-stream' } as unknown as Blob);
  await api.post(API_PATHS.ROMS, form, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'x-upload-platform': String(platformId),
      'x-upload-filename': encodeURIComponent(source.name),
    },
    timeout: 0,
    onUploadProgress: (event) => {
      if (event.total) onProgress(event.loaded / event.total);
    },
  });
};

export const uploadRom = async (
  platformId: number,
  source: UploadSource,
  onProgress: (fraction: number) => void,
): Promise<void> => {
  const file = new File(source.uri);
  const size = file.size || source.size;

  let uploadId: string;
  try {
    const { data } = await api.post<{ upload_id: string }>(`${API_PATHS.ROMS}/upload/start`, null, {
      headers: {
        'x-upload-platform': String(platformId),
        'x-upload-filename': encodeURIComponent(source.name),
        'x-upload-total-size': String(size),
        'x-upload-total-chunks': String(Math.ceil(size / CHUNK_SIZE)),
      },
    });
    uploadId = data.upload_id;
  } catch (err) {
    if (!isMissingEndpoint(err)) throw err;
    return uploadSingleRequest(platformId, source, onProgress);
  }
  await sendChunks(uploadId, file, size, onProgress);
};
