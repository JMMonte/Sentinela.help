import { env } from "@/lib/env";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type StoredUpload = {
  url: string;
  bytes: number;
  mimeType: string;
};

const allowedImageMimeTypes = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export function isAllowedImageMimeType(mimeType: string): boolean {
  return allowedImageMimeTypes.has(mimeType);
}

export async function saveImageToPublicUploads(file: File): Promise<StoredUpload> {
  const mimeType = file.type;

  const extension = allowedImageMimeTypes.get(mimeType);
  if (!extension) throw new Error(`Unsupported image type: ${mimeType}`);

  if (file.size > env.MAX_UPLOAD_BYTES) {
    throw new Error(
      `File too large (max ${env.MAX_UPLOAD_BYTES} bytes, got ${file.size})`,
    );
  }

  const bytes = file.size;
  const buffer = Buffer.from(await file.arrayBuffer());

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const filename = `${randomUUID()}.${extension}`;
  const filepath = path.join(uploadsDir, filename);

  await writeFile(filepath, buffer);

  return { url: `/uploads/${filename}`, bytes, mimeType };
}
