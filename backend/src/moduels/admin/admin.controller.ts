import type { Request, Response } from "express";

import { handleServiceResponse } from "@/utils/httpHandlers";
import { adminService } from "./admin.service";

function paramId(req: Request): string {
	const id = req.params.id;
	return Array.isArray(id) ? id[0] : id;
}

export const adminController = {
	// Users
	async listUsers(_req: Request, res: Response): Promise<void> {
		const serviceResponse = await adminService.listUsers();
		handleServiceResponse(serviceResponse, res);
	},

	async createUser(req: Request, res: Response): Promise<void> {
		const serviceResponse = await adminService.createUser(req.body);
		handleServiceResponse(serviceResponse, res);
	},

	async updateUser(req: Request, res: Response): Promise<void> {
		const serviceResponse = await adminService.updateUser(paramId(req), req.body);
		handleServiceResponse(serviceResponse, res);
	},

	async deleteUser(req: Request, res: Response): Promise<void> {
		const serviceResponse = await adminService.deleteUser(paramId(req));
		handleServiceResponse(serviceResponse, res);
	},

	// Checklist
	async createChecklistItem(req: Request, res: Response): Promise<void> {
		const serviceResponse = await adminService.createChecklistItem(req.body);
		handleServiceResponse(serviceResponse, res);
	},

	async listChecklistItems(_req: Request, res: Response): Promise<void> {
		const serviceResponse = await adminService.listChecklistItems();
		handleServiceResponse(serviceResponse, res);
	},

	async deleteChecklistItem(req: Request, res: Response): Promise<void> {
		const serviceResponse = await adminService.deleteChecklistItem(paramId(req));
		handleServiceResponse(serviceResponse, res);
	},

	// Analytics
	async getAnalytics(_req: Request, res: Response): Promise<void> {
		const serviceResponse = await adminService.getAnalytics();
		handleServiceResponse(serviceResponse, res);
	},
};
