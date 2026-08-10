import multer from "multer";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ALLOWED_MIMES = ["image/png", "image/jpeg", "image/webp"];
const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

function isAllowedExtension(filename: string): boolean {
	const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
	return ALLOWED_EXTENSIONS.includes(ext);
}

export const avatarUpload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: MAX_FILE_SIZE, files: 1 },
	fileFilter: (_req, file, cb) => {
		if (!ALLOWED_MIMES.includes(file.mimetype) || !isAllowedExtension(file.originalname)) {
			cb(new Error("Unsupported file type. Accepted: PNG, JPG, WEBP (max 5MB)."));
			return;
		}
		cb(null, true);
	},
});
