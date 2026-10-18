import "server-only";
import { db } from "./db";
import { randomToken } from "./crypto";

// Private file storage backed by Postgres (works on serverless hosts with no
// writable disk). Files are only ever served through authenticated handlers.
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export type ImageType = "image/jpeg" | "image/png" | "image/webp";

/** Detects the real type from magic bytes — never trust the client's Content-Type. */
export function sniffImage(buf: Buffer): ImageType | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

export async function readUploadedImage(file: File | null) {
  if (!file || typeof file === "string") return { error: "No image received." } as const;
  if (file.size > MAX_IMAGE_BYTES) return { error: "That image is too large (max 8 MB)." } as const;
  const buf = Buffer.from(await file.arrayBuffer());
  const type = sniffImage(buf);
  if (!type) return { error: "Please upload a JPEG, PNG or WebP image." } as const;
  return { buf, type } as const;
}

export async function saveFile(prefix: string, buf: Buffer, mimeType: string) {
  if (!/^[\w-]+$/.test(prefix)) throw new Error("bad prefix");
  const key = `${prefix}/${randomToken(18)}`;
  await db.storedFile.create({ data: { key, mimeType, size: buf.length, data: new Uint8Array(buf) } });
  return key;
}

export async function readStored(key: string) {
  const f = await db.storedFile.findUnique({ where: { key } });
  if (!f) throw new Error("not found");
  return Buffer.from(f.data);
}

export const deleteStored = (key: string) => db.storedFile.deleteMany({ where: { key } }).then(() => undefined);
