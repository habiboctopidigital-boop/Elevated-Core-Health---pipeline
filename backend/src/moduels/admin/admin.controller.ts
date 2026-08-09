import type { Request, Response } from "express";

import { handleServiceResponse } from "@/utils/httpHandlers";
import { ServiceResponse } from "@/utils/serviceResponse";
import { adminService } from "./admin.service";

function paramId(req: Request): string {
	const id = req.params.id;
	return Array.isArray(id) ? id[0] : id;
}

function paramKey(req: Request): string {
	const key = req.params.key;
	return Array.isArray(key) ? key[0] : key;
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

	// Stages
	async listStages(_req: Request, res: Response): Promise<void> {
		const serviceResponse = await adminService.listStages();
		handleServiceResponse(serviceResponse, res);
	},

	async createStage(req: Request, res: Response): Promise<void> {
		const serviceResponse = await adminService.createStage(req.body);
		handleServiceResponse(serviceResponse, res);
	},

	async updateStage(req: Request, res: Response): Promise<void> {
		const serviceResponse = await adminService.updateStage(paramKey(req), req.body);
		handleServiceResponse(serviceResponse, res);
	},

	async reorderStages(req: Request, res: Response): Promise<void> {
		const serviceResponse = await adminService.reorderStages(req.body);
		handleServiceResponse(serviceResponse, res);
	},

	async deleteStage(req: Request, res: Response): Promise<void> {
		const serviceResponse = await adminService.deleteStage(paramKey(req));
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

	async updateChecklistItem(req: Request, res: Response): Promise<void> {
		const serviceResponse = await adminService.updateChecklistItem(paramId(req), req.body);
		handleServiceResponse(serviceResponse, res);
	},

	// Eligibility rules
	async listEligibilityRules(_req: Request, res: Response): Promise<void> {
		const serviceResponse = await adminService.listEligibilityRules();
		handleServiceResponse(serviceResponse, res);
	},

	async createEligibilityRule(req: Request, res: Response): Promise<void> {
		const serviceResponse = await adminService.createEligibilityRule(req.body);
		handleServiceResponse(serviceResponse, res);
	},

	async updateEligibilityRule(req: Request, res: Response): Promise<void> {
		const serviceResponse = await adminService.updateEligibilityRule(paramId(req), req.body);
		handleServiceResponse(serviceResponse, res);
	},

	async deleteEligibilityRule(req: Request, res: Response): Promise<void> {
		const serviceResponse = await adminService.deleteEligibilityRule(paramId(req));
		handleServiceResponse(serviceResponse, res);
	},

	// Analytics
	async getAnalytics(_req: Request, res: Response): Promise<void> {
		const serviceResponse = await adminService.getAnalytics();
		handleServiceResponse(serviceResponse, res);
	},

	// CRM Connect settings
	async getCrmIntegration(_req: Request, res: Response): Promise<void> {
		const serviceResponse = await adminService.getCrmIntegration();
		handleServiceResponse(serviceResponse, res);
	},

	async connectCrm(req: Request, res: Response): Promise<void> {
		if (!req.user) {
			handleServiceResponse(ServiceResponse.failure("Not authenticated", null, 401), res);
			return;
		}
		const serviceResponse = await adminService.connectCrm(req.body, req.user);
		handleServiceResponse(serviceResponse, res);
	},

	async disconnectCrm(_req: Request, res: Response): Promise<void> {
		const serviceResponse = await adminService.disconnectCrm();
		handleServiceResponse(serviceResponse, res);
	},

	async updateCrmPermission(req: Request, res: Response): Promise<void> {
		const serviceResponse = await adminService.updateCrmPermission(req.body);
		handleServiceResponse(serviceResponse, res);
	},
};
