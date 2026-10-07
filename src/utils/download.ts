// by Cleyvin

import { Directory, File, Paths } from 'expo-file-system';
import { createDownloadResumable } from 'expo-file-system/legacy';

const COPY_CHUNK_SIZE = 4 * 1024 * 1024;

export interface DownloadProgress {
  receivedBytes: number;
  /** Null when the server streams without a length (zipped multi-file ROMs). */
  totalBytes: number | null;
}

interface DownloadRequest {
  url: string;
  fileName: string;
  bearer: string | null;
  onProgress: (progress: DownloadProgress) => void;
}

/**
 * Downloads a file into a folder the user picks. Resolves to false when the
 * folder picker is dismissed.
 *
 * The file is streamed to the app cache and then copied out in chunks, so a
 * multi-gigabyte ROM never has to fit in memory.
 */
export const downloadToUserFolder = async ({ url, fileName, bearer, onProgress }: DownloadRequest): Promise<boolean> => {
  let folder: Directory;
  try {
    folder = await Directory.pickDirectoryAsync();
  } catch (err) {
    if (/cancel/i.test(String((err as Error)?.message ?? err))) return false;
    throw err;
  }

  const temp = new File(Paths.cache, `romm-download-${Date.now()}.tmp`);
  try {
    const task = createDownloadResumable(
      url,
      temp.uri,
      { headers: bearer ? { Authorization: `Bearer ${bearer}` } : {} },
      ({ totalBytesWritten, totalBytesExpectedToWrite }) =>
        onProgress({
          receivedBytes: totalBytesWritten,
          totalBytes: totalBytesExpectedToWrite > 0 ? totalBytesExpectedToWrite : null,
        }),
    );
    const result = await task.downloadAsync();
    if (!result || result.status < 200 || result.status >= 300) {
      throw new Error(`The server refused the download (${result?.status ?? 'no response'})`);
    }

    const target = folder.createFile(fileName, 'application/octet-stream');
    const source = temp.open();
    try {
      for (;;) {
        const chunk = source.readBytes(COPY_CHUNK_SIZE);
        if (chunk.length === 0) break;
        target.write(chunk, { append: true });
      }
    } finally {
      source.close();
    }
    return true;
  } finally {
    if (temp.exists) temp.delete();
  }
};
