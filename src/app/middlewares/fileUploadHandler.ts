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
      const fileName =
        file.originalname
          .replace(fileExt, "")
          .toLowerCase()
          .split(" ")
          .join("-") +
        "-" +
        Date.now();
      cb(null, fileName + fileExt);
    },
  });

  const filterFilter = (req: Request, file: any, cb: FileFilterCallback) => {
    const field = file.fieldname.toLowerCase();

    if (
      ["image", "images", "coverimage", "profileimage", "avatar"].includes(field)
    ) {
      if (
        file.mimetype === "image/jpeg" ||
        file.mimetype === "image/png" ||
        file.mimetype === "image/webp" ||
        file.mimetype === "image/jpg" ||
        file.mimetype.startsWith("image/")
      ) {
        cb(null, true);
      } else {
        cb(
          new ApiError(
            StatusCodes.BAD_REQUEST,
            "Only image files (.jpeg, .png, .jpg, .webp) are supported",
          ),
        );
      }
    } else if (["media", "video", "audio"].includes(field)) {
      if (
        file.mimetype === "video/mp4" ||
        file.mimetype === "audio/mpeg" ||
        file.mimetype.startsWith("video/") ||
        file.mimetype.startsWith("audio/")
      ) {
        cb(null, true);
      } else {
        cb(
          new ApiError(
            StatusCodes.BAD_REQUEST,
            "Only video and audio files (.mp4, .mp3) are supported",
          ),
        );
      }
    } else if (["doc", "docs", "document", "csv", "file", "files"].includes(field)) {
      const ext = path.extname(file.originalname).toLowerCase();
      if (
        file.mimetype === "application/pdf" ||
        file.mimetype === "text/csv" ||
        file.mimetype === "application/vnd.ms-excel" ||
        file.mimetype ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        ext === ".csv" ||
        ext === ".pdf" ||
        ext === ".xlsx" ||
        ext === ".xls"
      ) {
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
      fileSize: 20 * 1024 * 1024, // 20MB per file
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
