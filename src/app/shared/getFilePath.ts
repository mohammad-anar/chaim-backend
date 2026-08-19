/* eslint-disable @typescript-eslint/no-explicit-any */
type IFolderName =
  | "image"
  | "images"
  | "coverImage"
  | "profileImage"
  | "avatar"
  | "media"
  | "doc"
  | "csv"
  | "file";

const resolveSubdir = (folderName: string) => {
  const f = folderName.toLowerCase();
  if (["image", "images", "coverimage", "profileimage", "avatar"].includes(f)) {
    return "image";
  }
  if (["media", "video", "audio"].includes(f)) {
    return "media";
  }
  return "doc";
};

//single file
export const getSingleFilePath = (files: any, folderName: IFolderName) => {
  const fileField = files && files[folderName];
  if (fileField && Array.isArray(fileField) && fileField.length > 0) {
    const subdir = resolveSubdir(folderName);
    return `/${subdir}/${fileField[0].filename}`;
  }

  return undefined;
};

//multiple files
export const getMultipleFilesPath = (files: any, folderName: IFolderName) => {
  const folderFiles = files && files[folderName];
  if (folderFiles) {
    if (Array.isArray(folderFiles)) {
      const subdir = resolveSubdir(folderName);
      return folderFiles.map((file: any) => `/${subdir}/${file.filename}`);
    }
  }

  return undefined;
};
