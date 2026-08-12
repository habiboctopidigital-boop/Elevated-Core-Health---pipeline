import type { Request, Response } from "express";

import { getRequestContext } from "@/lib/audit";
import { handleServiceResponse } from "@/utils/httpHandlers";
import { ServiceResponse } from "@/utils/serviceResponse";
import { authService } from "./auth.service";

export const authController = {
	async login(req: Request, res: Response): Promise<void> {
		const serviceResponse = await authService.login(req.body, getRequestContext(req));
		handleServiceResponse(serviceResponse, res);
	},

	async refresh(req: Request, res: Response): Promise<void> {
		const serviceResponse = await authService.refresh(req.body);
		handleServiceResponse(serviceResponse, res);
	},

	async me(req: Request, res: Response): Promise<void> {
		const userId = req.user?.id;
		if (!userId) {
			handleServiceResponse(ServiceResponse.failure("Not authenticated", null, 401), res);
			return;
		}
		const serviceResponse = await authService.me(userId);
		handleServiceResponse(serviceResponse, res);
	},

	async updateProfile(req: Request, res: Response): Promise<void> {
		const userId = req.user?.id;
		if (!userId) {
			handleServiceResponse(ServiceResponse.failure("Not authenticated", null, 401), res);
			return;
		}
		const serviceResponse = await authService.updateProfile(userId, req.body, getRequestContext(req));
		handleServiceResponse(serviceResponse, res);
	},

	async uploadAvatar(req: Request, res: Response): Promise<void> {
		const userId = req.user?.id;
		if (!userId) {
			handleServiceResponse(ServiceResponse.failure("Not authenticated", null, 401), res);
			return;
		}
		if (!req.file) {
			handleServiceResponse(ServiceResponse.failure("No image file was provided.", null, 400), res);
			return;
		}
		const serviceResponse = await authService.uploadAvatar(userId, req.file, getRequestContext(req));
		handleServiceResponse(serviceResponse, res);
	},

	async changePassword(req: Request, res: Response): Promise<void> {
		const userId = req.user?.id;
		if (!userId) {
			handleServiceResponse(ServiceResponse.failure("Not authenticated", null, 401), res);
			return;
		}
		const serviceResponse = await authService.changePassword(userId, req.body, getRequestContext(req));
		handleServiceResponse(serviceResponse, res);
	},

	async forgotPassword(req: Request, res: Response): Promise<void> {
		const serviceResponse = await authService.forgotPassword(req.body, getRequestContext(req));
		handleServiceResponse(serviceResponse, res);
	},

	async resetPassword(req: Request, res: Response): Promise<void> {
		const serviceResponse = await authService.resetPassword(req.body, getRequestContext(req));
		handleServiceResponse(serviceResponse, res);
	},

	async logout(req: Request, res: Response): Promise<void> {
		const refreshToken = req.body?.refreshToken;
		if (!refreshToken) {
			handleServiceResponse(ServiceResponse.success("Signed out successfully.", null), res);
			return;
		}
		const serviceResponse = await authService.logout(refreshToken, getRequestContext(req));
		handleServiceResponse(serviceResponse, res);
	},
};
