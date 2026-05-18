import { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { logger } from "@/server/lib/logger";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { getUploadDir } from "@/server/lib/upload-dir";
import { randomUUID } from "crypto";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_UPLOAD_SIZE_BYTES,
  MIME_TO_EXT,
  detectImageMimeType,
} from "@/server/lib/upload-validation";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return Response.json(
      { error: `Invalid file type. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return Response.json(
      { error: `File too large. Max: ${process.env.MAX_UPLOAD_SIZE_MB ?? 10}MB` },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const detectedMime = detectImageMimeType(buffer);
  if (!detectedMime) {
    return Response.json(
      { error: "File content does not match an allowed image type" },
      { status: 400 }
    );
  }

  const uploadDir = getUploadDir();
  const qrDir = join(uploadDir, "qr");
  await mkdir(qrDir, { recursive: true });

  const ext = MIME_TO_EXT[detectedMime] ?? "jpg";
  const filename = `${randomUUID()}.${ext}`;
  const filepath = join(qrDir, filename);
  const qrPath = `qr/${filename}`;

  try {
    await writeFile(filepath, buffer);
  } catch (error) {
    logger.error("upload.qr.writeFailed", {
      error: error instanceof Error ? error.message : "Unknown",
      filepath,
    });
    return Response.json({ error: "Failed to save QR image" }, { status: 500 });
  }

  logger.info("upload.qr", {
    userId,
    mimeType: detectedMime,
    fileSize: file.size,
    qrPath,
  });

  return Response.json({ qrPath });
}
