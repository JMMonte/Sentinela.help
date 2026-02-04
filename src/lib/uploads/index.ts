import type { StoredUpload } from "./local-public-storage";

export type { StoredUpload };
export { isAllowedImageMimeType } from "./local-public-storage";

/**
 * Save an image to storage.
 * Uses Vercel Blob in production (when BLOB_READ_WRITE_TOKEN is set),
 * falls back to local public/uploads/ in development.
 */
export async function saveImage(file: File): Promise<StoredUpload> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { saveImageToVercelBlob } = await import("./vercel-blob-storage");
    return saveImageToVercelBlob(file);
  }

  const { saveImageToPublicUploads } = await import("./local-public-storage");
  return saveImageToPublicUploads(file);
}
