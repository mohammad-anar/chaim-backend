import { createClient, SupabaseClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import config from "../config/index.js";

let supabaseClient: SupabaseClient | null = null;

export const isSupabaseConfigured = (): boolean => {
  const url = config.supabase?.url || process.env.SUPABASE_URL;
  const key =
    config.supabase?.key ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY;
  return Boolean(url && key && url.trim() !== "" && key.trim() !== "");
};

const getSupabaseClient = (): SupabaseClient | null => {
  if (supabaseClient) return supabaseClient;
  if (!isSupabaseConfigured()) return null;

  const url = (config.supabase?.url || process.env.SUPABASE_URL)!.trim();
  const key = (
    config.supabase?.key ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY
  )!.trim();

  try {
    supabaseClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return supabaseClient;
  } catch (err) {
    console.error("[SupabaseStorage] Failed to initialize Supabase client:", err);
    return null;
  }
};

const getMimeType = (filePath: string): string => {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".heic": "image/heic",
    ".heif": "image/heif",
    ".mp4": "video/mp4",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".pdf": "application/pdf",
    ".csv": "text/csv",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xls": "application/vnd.ms-excel",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  return mimeMap[ext] || "application/octet-stream";
};

/**
 * Upload a local file to Supabase Storage and return its public URL
 */
export const uploadToSupabaseStorage = async (
  localFilePath: string,
  subfolder: string = "image",
  originalName?: string,
): Promise<{ publicUrl: string; storagePath: string } | null> => {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  const bucketName =
    config.supabase?.bucket ||
    process.env.SUPABASE_BUCKET_NAME ||
    process.env.SUPABASE_STORAGE_BUCKET ||
    "images";

  if (!fs.existsSync(localFilePath)) {
    console.warn(`[SupabaseStorage] File not found at path: ${localFilePath}`);
    return null;
  }

  try {
    const fileBuffer = fs.readFileSync(localFilePath);
    const ext = path.extname(localFilePath);
    const baseName = path
      .basename(originalName || localFilePath, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    const uniqueFileName = `${baseName || "file"}-${Date.now()}${ext}`;
    const storagePath = `${subfolder}/${uniqueFileName}`;
    const contentType = getMimeType(localFilePath);

    // Upload to Supabase Bucket
    const { error: uploadError } = await client.storage
      .from(bucketName)
      .upload(storagePath, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error("[SupabaseStorage] Upload error:", uploadError.message);
      return null;
    }

    // Get public URL
    const { data: urlData } = client.storage
      .from(bucketName)
      .getPublicUrl(storagePath);

    const publicUrl = urlData?.publicUrl;

    // Clean up temporary local file
    try {
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    } catch (_) {}

    return {
      publicUrl,
      storagePath,
    };
  } catch (err: any) {
    console.error("[SupabaseStorage] Exception during upload:", err?.message || err);
    return null;
  }
};

/**
 * Delete a file from Supabase Storage
 */
export const deleteFromSupabaseStorage = async (
  storagePathOrUrl: string,
): Promise<boolean> => {
  const client = getSupabaseClient();
  if (!client || !storagePathOrUrl) return false;

  const bucketName =
    config.supabase?.bucket ||
    process.env.SUPABASE_BUCKET_NAME ||
    process.env.SUPABASE_STORAGE_BUCKET ||
    "images";

  try {
    let storagePath = storagePathOrUrl;
    if (storagePathOrUrl.startsWith("http://") || storagePathOrUrl.startsWith("https://")) {
      const parts = storagePathOrUrl.split(`/public/${bucketName}/`);
      if (parts.length > 1) {
        storagePath = parts[1];
      }
    }

    const { error } = await client.storage
      .from(bucketName)
      .remove([storagePath]);

    if (error) {
      console.error("[SupabaseStorage] Delete error:", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[SupabaseStorage] Delete exception:", err);
    return false;
  }
};

export default {
  isSupabaseConfigured,
  uploadToSupabaseStorage,
  deleteFromSupabaseStorage,
};
