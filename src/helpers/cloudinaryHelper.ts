import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import fs from "fs";
import path from "path";
import config from "../config/index.js";

// Configure Cloudinary instance
if (
  config.cloudinary.cloud_name &&
  config.cloudinary.api_key &&
  config.cloudinary.api_secret
) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloud_name,
    api_key: config.cloudinary.api_key,
    api_secret: config.cloudinary.api_secret,
    secure: true,
  });
}

/**
 * Checks if Cloudinary credentials are fully provided and active
 */
export const isCloudinaryConfigured = (): boolean => {
  const { cloud_name, api_key, api_secret } = config.cloudinary;
  return Boolean(
    cloud_name &&
      api_key &&
      api_secret &&
      !cloud_name.includes("your_") &&
      !api_key.includes("your_") &&
      !api_secret.includes("your_"),
  );
};

/**
 * Determine Cloudinary resource type based on file extension
 */
const getResourceType = (filePath: string): "image" | "video" | "raw" => {
  const ext = path.extname(filePath).toLowerCase();
  const videoExts = [".mp4", ".mov", ".webm", ".avi", ".mkv", ".mp3", ".wav", ".m4a", ".ogg"];
  const docExts = [".pdf", ".csv", ".xlsx", ".xls", ".doc", ".docx", ".txt", ".json", ".zip"];

  if (videoExts.includes(ext)) return "video";
  if (docExts.includes(ext)) return "raw";
  return "image";
};

/**
 * Upload a local file to Cloudinary and delete the local temporary file
 */
export const uploadToCloudinary = async (
  filePath: string,
  subfolder: string = "image",
): Promise<UploadApiResponse | null> => {
  if (!isCloudinaryConfigured()) {
    return null;
  }

  if (!fs.existsSync(filePath)) {
    console.warn(`[Cloudinary] File not found at path: ${filePath}`);
    return null;
  }

  const resourceType = getResourceType(filePath);
  const rootFolder = config.cloudinary.folder || "chaim";
  const targetFolder = `${rootFolder}/${subfolder}`;

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: targetFolder,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
    });

    // Remove local temporary file after successful upload to Cloudinary
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (cleanupErr) {
      console.warn(`[Cloudinary] Failed to delete temp file ${filePath}:`, cleanupErr);
    }

    return result;
  } catch (error: any) {
    console.error(`[Cloudinary] Upload failed for ${filePath}:`, error?.message || error);
    throw error;
  }
};

/**
 * Delete a media or document file from Cloudinary by public ID
 */
export const deleteFromCloudinary = async (
  publicId: string,
  resourceType: "image" | "video" | "raw" = "image",
): Promise<any> => {
  if (!isCloudinaryConfigured() || !publicId) {
    return null;
  }

  try {
    return await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  } catch (error: any) {
    console.warn(`[Cloudinary] Delete failed for ${publicId}:`, error?.message || error);
    return null;
  }
};

export default cloudinary;
