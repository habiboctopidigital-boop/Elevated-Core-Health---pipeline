import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "@/utils/envConfig";

export interface AccessTokenPayload {
	userId: string;
	role: string;
}

export interface RefreshTokenPayload {
	userId: string;
	tokenId: string;
}

const ACCESS_EXPIRY = "15m";
const REFRESH_EXPIRY = "7d";

export function signAccessToken(userId: string, role: string): string {
	return jwt.sign({ userId, role } satisfies AccessTokenPayload, env.JWT_ACCESS_SECRET, {
		expiresIn: ACCESS_EXPIRY,
	});
}

export function signRefreshToken(userId: string, tokenId: string): string {
	return jwt.sign({ userId, tokenId } satisfies RefreshTokenPayload, env.JWT_REFRESH_SECRET, {
		expiresIn: REFRESH_EXPIRY,
	});
}

export function verifyAccessToken(token: string): AccessTokenPayload {
	return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
	return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
	return bcrypt.compare(password, hash);
}
