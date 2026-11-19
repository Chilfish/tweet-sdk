import type { HttpRequest } from '../http/types'

/**
 * Collection of requests related to media.
 *
 * Upload payloads are `Uint8Array` / `Blob`, so the core stays file-system
 * free. The `./node` entry exposes a helper that reads a path into a `Blob`.
 *
 * @public
 */
export class MediaRequests {
  /**
   * @param id - The allocated id of the media item to be uploaded.
   * @param media - The media bytes to upload.
   */
  public static appendUpload(id: string, media: Uint8Array | Blob): HttpRequest {
    const data = new FormData()
    data.append('media', media instanceof Blob
      ? media
      : new Blob([media as BlobPart]))
    return {
      method: 'post',
      headers: { referer: 'https://x.com' },
      url: 'https://upload.x.com/i/media/upload.json',
      params: {

        command: 'APPEND',
        media_id: id,
        segment_index: 0,

      },
      data,
    }
  }

  /**
   * @param id - The allocated id of the media item.
   */
  public static finalizeUpload(id: string): HttpRequest {
    return {
      method: 'post',
      headers: { referer: 'https://x.com' },
      url: 'https://upload.x.com/i/media/upload.json',
      params: {

        command: 'FINALIZE',
        media_id: id,

      },
    }
  }

  /**
   * @param size - The size (in bytes) of the media item to be uploaded.
   */
  public static initializeUpload(size: number): HttpRequest {
    return {
      method: 'post',
      headers: { referer: 'https://x.com' },
      url: 'https://upload.x.com/i/media/upload.json',
      params: {

        command: 'INIT',
        total_bytes: size,

      },
    }
  }
}
