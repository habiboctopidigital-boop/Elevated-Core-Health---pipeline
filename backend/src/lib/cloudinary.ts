import { v2 as cloudinary } from "cloudinary";
import { env } from "@/utils/envConfig";

export const isCloudinaryConfigured = Boolean(
	env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
);

if (isCloudinaryConfigured) {
	cloudinary.config({
		cloud_name: env.CLOUDINARY_CLOUD_NAME,
		api_key: env.CLOUDINARY_API_KEY,
		// The API secret never leaves this process — it's only used here, server-side, to sign
		// the upload request. The client never sees it or any signature derived from it.
		api_secret: env.CLOUDINARY_API_SECRET,
		secure: true,
	});
}

/**
 * Uploads an in-memory image buffer to Cloudinary and returns its secure URL.
 * Only ever called after the caller has already validated mimetype/size — this
 * function assumes a trusted, pre-validated buffer.
 */
export function uploadAvatarBuffer(buffer: Buffer, userId: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const stream = cloudinary.uploader.upload_stream(
			{
				folder: "ech-pipeline/avatars",
				public_id: userId,
				overwrite: true,
				resource_type: "image",
				transformation: [{ width: 512, height: 512, crop: "fill", gravity: "face" }],
			},
			(error, result) => {
				if (error || !result) {
					reject(error ?? new Error("Cloudinary upload returned no result"));
					return;
				}
				resolve(result.secure_url);
			},
		);
		stream.end(buffer);
	});
}
