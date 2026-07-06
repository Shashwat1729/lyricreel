import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

const api = axios.create({ baseURL: API_URL });

export async function uploadSong(file: File) {
  const formData = new FormData();
  formData.append('audio', file);
  const { data } = await api.post('/upload-song', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function generateTranscript(filename: string, title?: string, artist?: string) {
  const { data } = await api.post('/generate-transcript', { filename, title, artist });
  return data;
}

export async function searchLyrics(title: string, artist?: string) {
  const { data } = await api.post('/generate-transcript/search-lyrics', { title, artist });
  return data;
}

export async function getTranscriptStatus(jobId: string) {
  const { data } = await api.get(`/generate-transcript/status/${jobId}`);
  return data;
}

export async function downloadFromYouTube(url: string, quality: string = '192') {
  const { data } = await api.post('/youtube-download', { url, quality });
  return data;
}

export async function getYouTubeStatus(jobId: string) {
  const { data } = await api.get(`/youtube-download/status/${jobId}`);
  return data;
}

export async function generateVideo(filename: string, words: { word: string; start: number; end: number }[], theme: string) {
  const { data } = await api.post('/generate-video/generate', { filename, words, theme });
  return data;
}

export async function getVideoStatus(jobId: string) {
  const { data } = await api.get(`/generate-video/status/${jobId}`);
  return data;
}

/**
 * Subscribe to real-time job progress via SSE (Server-Sent Events).
 * Falls back to polling if SSE connection fails.
 */
export function subscribeToJob(
  jobId: string,
  onProgress: (data: { status: string; progress: number; error?: string }) => void,
  onComplete: (data: any) => void,
  onError: (err: Error) => void,
): () => void {
  const eventSource = new EventSource(`${API_URL}/events/${jobId}`);
  let closed = false;

  eventSource.onmessage = (event) => {
    if (closed) return;
    try {
      const data = JSON.parse(event.data);
      if (data.error && !data.status) {
        // Job not found
        eventSource.close();
        onError(new Error(data.error));
        return;
      }
      onProgress(data);
      if (data.status === 'complete') {
        eventSource.close();
        onComplete(data);
      } else if (data.status === 'error') {
        eventSource.close();
        onError(new Error(data.error || 'Job failed'));
      }
    } catch {
      // Ignore parse errors
    }
  };

  eventSource.onerror = () => {
    if (closed) return;
    eventSource.close();
    // Fallback to polling
    pollStatus(jobId, getVideoStatus, (p) => onProgress({ status: 'rendering', progress: p }))
      .then(onComplete)
      .catch(onError);
  };

  return () => {
    closed = true;
    eventSource.close();
  };
}

/**
 * Poll-based status checking (fallback for SSE).
 */
export async function pollStatus(
  jobId: string,
  statusFn: (id: string) => Promise<any>,
  onProgress?: (p: number) => void,
  interval = 1500,
  signal?: AbortSignal
): Promise<any> {
  return new Promise((resolve, reject) => {
    const MAX_TIMEOUT = 10 * 60 * 1000; // 10 minute timeout
    const startTime = Date.now();

    const poll = setInterval(async () => {
      if (signal?.aborted) { clearInterval(poll); reject(new Error('Cancelled')); return; }
      if (Date.now() - startTime > MAX_TIMEOUT) {
        clearInterval(poll);
        reject(new Error('Operation timed out'));
        return;
      }
      try {
        const status = await statusFn(jobId);
        if (onProgress) onProgress(status.progress || 0);

        if (status.status === 'complete') {
          clearInterval(poll);
          resolve(status);
        } else if (status.status === 'error') {
          clearInterval(poll);
          reject(new Error(status.error || 'Job failed'));
        }
      } catch (err) {
        clearInterval(poll);
        reject(err);
      }
    }, interval);

    signal?.addEventListener('abort', () => { clearInterval(poll); reject(new Error('Cancelled')); });
  });
}
