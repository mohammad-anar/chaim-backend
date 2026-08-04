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
      fs.mkdirSync(dirPath);
    }
  };

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      let uploadDir;
      switch (file.fieldname) {
        case "image":
          uploadDir = path.join(baseUploadDir, "image");
          break;
        case "media":
          uploadDir = path.join(baseUploadDir, "media");
          break;
        case "doc":
          uploadDir = path.join(baseUploadDir, "doc");
          break;
        default:
          throw new ApiError(StatusCodes.BAD_REQUEST, "File is not supported");
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
    if (file.fieldname === "image") {
      if (
        file.mimetype === "image/jpeg" ||
        file.mimetype === "image/png" ||
        file.mimetype === "image/webp" ||
        file.mimetype === "image/jpg"
      ) {
        cb(null, true);
      } else {
        cb(
          new ApiError(
            StatusCodes.BAD_REQUEST,
            "Only .jpeg, .png, .jpg file supported",
          ),
        );
      }
    } else if (file.fieldname === "media") {
      if (file.mimetype === "video/mp4" || file.mimetype === "audio/mpeg") {
        cb(null, true);
      } else {
        cb(
          new ApiError(
            StatusCodes.BAD_REQUEST,
            "Only .mp4, .mp3, file supported",
          ),
        );
      }
    } else if (file.fieldname === "doc") {
      const ext = path.extname(file.originalname).toLowerCase();
      if (
        file.mimetype === "application/pdf" ||
        file.mimetype === "text/csv" ||
        file.mimetype === "application/vnd.ms-excel" ||
        ext === ".csv"
      ) {
        cb(null, true);
      } else {
        cb(new ApiError(StatusCodes.BAD_REQUEST, "Only PDF and CSV files supported"));
      }
    } else {
      cb(new ApiError(StatusCodes.BAD_REQUEST, "This file is not supported"));
    }
  };

  const upload = multer({
    storage: storage,
    fileFilter: filterFilter,
  }).fields([
    { name: "image", maxCount: 3 },
    { name: "media", maxCount: 3 },
    { name: "doc", maxCount: 3 },
  ]);
  return upload;
};

export default fileUploadHandler;
