import type { Request, Response } from "express";

import { getRequestContext } from "@/lib/audit";
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

/**
 * Every route on this router runs behind `requireAuth` (see admin.router.ts),
 * so req.user is always populated by the time a controller method runs. This
 * guard only satisfies the type checker (req.user is optional on Request) and
 * should never actually trigger in practice.
 */
function requireUser(req: Request, res: Response): req is Request & { user: NonNullable<Request["user"]> } {
	if (!req.user) {
		handleServiceResponse(ServiceResponse.failure("Not authenticated", null, 401), res);
		return false;
	}
	return true;
}

export const adminController = {
	// Users
	async listUsers(_req: Request, res: Response): Promise<void> {
		const serviceResponse = await adminService.listUsers();
		handleServiceResponse(serviceResponse, res);
	},

	async createUser(req: Request, res: Response): Promise<void> {
		if (!requireUser(req, res)) return;
		const serviceResponse = await adminService.createUser(req.body, req.user, getRequestContext(req));
		handleServiceResponse(serviceResponse, res);
	},

	async updateUser(req: Request, res: Response): Promise<void> {
		if (!requireUser(req, res)) return;
		const serviceResponse = await adminService.updateUser(paramId(req), req.body, req.user, getRequestContext(req));
		handleServiceResponse(serviceResponse, res);
	},

	async deleteUser(req: Request, res: Response): Promise<void> {
		if (!requireUser(req, res)) return;
		const serviceResponse = await adminService.deleteUser(paramId(req), req.user, getRequestContext(req));
		handleServiceResponse(serviceResponse, res);
	},

	// Stages
	async listStages(_req: Request, res: Response): Promise<void> {
		const serviceResponse = await adminService.listStages();
		handleServiceResponse(serviceResponse, res);
	},

	async createStage(req: Request, res: Response): Promise<void> {
		if (!requireUser(req, res)) return;
		const serviceResponse = await adminService.createStage(req.body, req.user, getRequestContext(req));
		handleServiceResponse(serviceResponse, res);
	},

	async updateStage(req: Request, res: Response): Promise<void> {
		if (!requireUser(req, res)) return;
		const serviceResponse = await adminService.updateStage(paramKey(req), req.body, req.user, getRequestContext(req));
		handleServiceResponse(serviceResponse, res);
	},

	async reorderStages(req: Request, res: Response): Promise<void> {
		if (!requireUser(req, res)) return;
		const serviceResponse = await adminService.reorderStages(req.body, req.user, getRequestContext(req));
		handleServiceResponse(serviceResponse, res);
	},

	async deleteStage(req: Request, res: Response): Promise<void> {
		if (!requireUser(req, res)) return;
		const serviceResponse = await adminService.deleteStage(paramKey(req), req.user, getRequestContext(req));
		handleServiceResponse(serviceResponse, res);
	},

	// Checklist
	async createChecklistItem(req: Request, res: Response): Promise<void> {
		if (!requireUser(req, res)) return;
		const serviceResponse = await adminService.createChecklistItem(req.body, req.user, getRequestContext(req));
		handleServiceResponse(serviceResponse, res);
	},

	async listChecklistItems(_req: Request, res: Response): Promise<void> {
		const serviceResponse = await adminService.listChecklistItems();
		handleServiceResponse(serviceResponse, res);
	},

	async deleteChecklistItem(req: Request, res: Response): Promise<void> {
		if (!requireUser(req, res)) return;
		const serviceResponse = await adminService.deleteChecklistItem(paramId(req), req.user, getRequestContext(req));
		handleServiceResponse(serviceResponse, res);
	},

	async updateChecklistItem(req: Request, res: Response): Promise<void> {
		if (!requireUser(req, res)) return;
		const serviceResponse = await adminService.updateChecklistItem(
			paramId(req),
			req.body,
			req.user,
			getRequestContext(req),
		);
		handleServiceResponse(serviceResponse, res);
	},

	// Eligibility rules
	async listEligibilityRules(_req: Request, res: Response): Promise<void> {
		const serviceResponse = await adminService.listEligibilityRules();
		handleServiceResponse(serviceResponse, res);
	},

	async createEligibilityRule(req: Request, res: Response): Promise<void> {
		if (!requireUser(req, res)) return;
		const serviceResponse = await adminService.createEligibilityRule(req.body, req.user, getRequestContext(req));
		handleServiceResponse(serviceResponse, res);
	},

	async updateEligibilityRule(req: Request, res: Response): Promise<void> {
		if (!requireUser(req, res)) return;
		const serviceResponse = await adminService.updateEligibilityRule(
			paramId(req),
			req.body,
			req.user,
			getRequestContext(req),
		);
		handleServiceResponse(serviceResponse, res);
	},

	async deleteEligibilityRule(req: Request, res: Response): Promise<void> {
		if (!requireUser(req, res)) return;
		const serviceResponse = await adminService.deleteEligibilityRule(paramId(req), req.user, getRequestContext(req));
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
		if (!requireUser(req, res)) return;
		const serviceResponse = await adminService.connectCrm(req.body, req.user, getRequestContext(req));
		handleServiceResponse(serviceResponse, res);
	},

	async disconnectCrm(req: Request, res: Response): Promise<void> {
		if (!requireUser(req, res)) return;
		const serviceResponse = await adminService.disconnectCrm(req.user, getRequestContext(req));
		handleServiceResponse(serviceResponse, res);
	},

	async updateCrmPermission(req: Request, res: Response): Promise<void> {
		if (!requireUser(req, res)) return;
		const serviceResponse = await adminService.updateCrmPermission(req.body, req.user, getRequestContext(req));
		handleServiceResponse(serviceResponse, res);
	},
};
