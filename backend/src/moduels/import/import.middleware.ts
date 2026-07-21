import multer from "multer";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_MIMES: Record<string, string[]> = {
  csv: ["text/csv", "application/csv", "text/plain"],
  xlsx: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  xls: ["application/vnd.ms-excel"],
};

const ALLOWED_EXTENSIONS = [".csv", ".xlsx", ".xls"];

function isAllowedMime(mime: string): boolean {
  return Object.values(ALLOWED_MIMES).some((list) => list.includes(mime));
}

function isAllowedExtension(filename: string): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
  return ALLOWED_EXTENSIONS.includes(ext);
}

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!isAllowedMime(file.mimetype) && !isAllowedExtension(file.originalname)) {
      cb(new Error(`Unsupported file type "${file.mimetype}". Accepted: .csv, .xlsx, .xls`));
      return;
    }
    if (!isAllowedExtension(file.originalname)) {
      cb(new Error(`Unsupported file extension. Accepted: .csv, .xlsx, .xls`));
      return;
    }
    cb(null, true);
  },
});
