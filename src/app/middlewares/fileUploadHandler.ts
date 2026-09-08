import ApiError from "../../errors/ApiError.js";
import { NextFunction, Request, Response } from "express";
import fs from "fs";
import { StatusCodes } from "http-status-codes";
import multer, { FileFilterCallback } from "multer";
import path from "path";

const fileUploadHandler = () => {
  const baseUploadDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(baseUploadDir)) {
    fs.mkdirSync(baseUploadDir);
  }

  const createDir = (dirPath: string) => {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  };

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      let uploadDir: string;
      const field = file.fieldname.toLowerCase();

      if (
        ["image", "images", "coverimage", "profileimage", "avatar"].includes(field)
      ) {
        uploadDir = path.join(baseUploadDir, "image");
      } else if (["media", "video", "audio"].includes(field)) {
        uploadDir = path.join(baseUploadDir, "media");
      } else if (["doc", "docs", "document", "csv", "file", "files"].includes(field)) {
        uploadDir = path.join(baseUploadDir, "doc");
      } else {
        uploadDir = path.join(baseUploadDir, "image");
      }

      createDir(uploadDir);
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const fileExt = path.extname(file.originalname);
      const baseName = path
        .basename(file.originalname, fileExt)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      const fileName = (baseName || "file") + "-" + Date.now();
      cb(null, fileName + fileExt);
    },
  });

  const filterFilter = (req: Request, file: any, cb: FileFilterCallback) => {
    // If no file was actually uploaded (empty file field in form-data), skip it cleanly
    if (!file || !file.originalname || file.originalname.trim() === "") {
      return cb(null, false);
    }

    const field = file.fieldname.toLowerCase();
    const ext = path.extname(file.originalname).toLowerCase();

    if (
      ["image", "images", "coverimage", "profileimage", "avatar"].includes(field)
    ) {
      const isImageMime =
        file.mimetype &&
        (file.mimetype.startsWith("image/") ||
          [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/jpg",
            "image/gif",
            "image/svg+xml",
          ].includes(file.mimetype));
      const isImageExt = [
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".gif",
        ".svg",
        ".heic",
        ".heif",
      ].includes(ext);

      if (isImageMime || isImageExt) {
        cb(null, true);
      } else {
        cb(
          new ApiError(
            StatusCodes.BAD_REQUEST,
            "Only image files (.jpeg, .png, .jpg, .webp, .svg, .gif, .heic) are supported",
          ),
        );
      }
    } else if (["media", "video", "audio"].includes(field)) {
      const isMediaMime =
        file.mimetype &&
        (file.mimetype.startsWith("video/") ||
          file.mimetype.startsWith("audio/") ||
          ["video/mp4", "audio/mpeg", "audio/mp3", "audio/wav"].includes(
            file.mimetype,
          ));
      const isMediaExt = [
        ".mp4",
        ".mp3",
        ".wav",
        ".m4a",
        ".webm",
        ".ogg",
        ".mov",
        ".avi",
      ].includes(ext);

      if (isMediaMime || isMediaExt) {
        cb(null, true);
      } else {
        cb(
          new ApiError(
            StatusCodes.BAD_REQUEST,
            "Only video and audio files (.mp4, .mp3, .wav, .m4a, .webm, .mov) are supported",
          ),
        );
      }
    } else if (["doc", "docs", "document", "csv", "file", "files"].includes(field)) {
      const isDocMime =
        file.mimetype &&
        [
          "application/pdf",
          "text/csv",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ].includes(file.mimetype);
      const isDocExt = [
        ".csv",
        ".pdf",
        ".xlsx",
        ".xls",
        ".doc",
        ".docx",
        ".txt",
      ].includes(ext);

      if (isDocMime || isDocExt) {
        cb(null, true);
      } else {
        cb(
          new ApiError(
            StatusCodes.BAD_REQUEST,
            "Only PDF, CSV, and Excel (.xlsx, .xls) files are supported",
          ),
        );
      }
    } else {
      cb(null, true);
    }
  };

  const upload = multer({
    storage: storage,
    fileFilter: filterFilter,
    limits: {
      fileSize: 500 * 1024 * 1024, // 500MB per file
    },
  }).fields([
    { name: "image", maxCount: 20 },
    { name: "images", maxCount: 20 },
    { name: "coverImage", maxCount: 5 },
    { name: "profileImage", maxCount: 5 },
    { name: "avatar", maxCount: 5 },
    { name: "media", maxCount: 10 },
    { name: "doc", maxCount: 10 },
    { name: "file", maxCount: 10 },
    { name: "csv", maxCount: 10 },
  ]);

  return upload;
};

export default fileUploadHandler;
