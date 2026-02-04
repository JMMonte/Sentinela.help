import { put } from "@vercel/blob";
import { env } from "@/lib/env";
import { randomUUID } from "node:crypto";
import type { StoredUpload } from "./local-public-storage";

const allowedImageMimeTypes = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export async function saveImageToVercelBlob(file: File): Promise<StoredUpload> {
  const mimeType = file.type;

  const extension = allowedImageMimeTypes.get(mimeType);
  if (!extension) throw new Error(`Unsupported image type: ${mimeType}`);

  if (file.size > env.MAX_UPLOAD_BYTES) {
    throw new Error(
      `File too large (max ${env.MAX_UPLOAD_BYTES} bytes, got ${file.size})`
    );
  }

  const bytes = file.size;
  const filename = `${randomUUID()}.${extension}`;

  const blob = await put(filename, file, {
    access: "public",
    contentType: mimeType,
  });

  return { url: blob.url, bytes, mimeType };
}
