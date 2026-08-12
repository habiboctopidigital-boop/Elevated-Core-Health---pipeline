import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireMinRole, requireOwnership, requirePermission } from "@/middlewares/authorize";

function mockRes() {
	const res = {
		statusCode: 0,
		body: undefined as unknown,
		status(code: number) {
			res.statusCode = code;
			return res;
		},
		json(payload: unknown) {
			res.body = payload;
			return res;
		},
	};
	return res as unknown as Response & { statusCode: number; body: unknown };
}

function mockReq(user?: { id: string; role: "super_admin" | "admin" | "va" }): Request {
	return { user } as unknown as Request;
}

describe("requireMinRole", () => {
	it("rejects unauthenticated requests with 401", () => {
		const res = mockRes();
		const next = vi.fn();
		requireMinRole("admin")(mockReq(undefined), res, next);
		expect(next).not.toHaveBeenCalled();
		expect(res.statusCode).toBe(401);
	});

	it("rejects a role below the minimum with 403", () => {
		const res = mockRes();
		const next = vi.fn();
		requireMinRole("super_admin")(mockReq({ id: "u1", role: "admin" }), res, next);
		expect(next).not.toHaveBeenCalled();
		expect(res.statusCode).toBe(403);
	});

	it("allows a role at or above the minimum", () => {
		const res = mockRes();
		const next = vi.fn();
		requireMinRole("admin")(mockReq({ id: "u1", role: "super_admin" }), res, next);
		expect(next).toHaveBeenCalledOnce();
	});
});

describe("requirePermission", () => {
	it("blocks a hard-deny action for VA (patients.view_all)", () => {
		const res = mockRes();
		const next = vi.fn();
		requirePermission("patients.view_all")(mockReq({ id: "u1", role: "va" }), res, next);
		expect(next).not.toHaveBeenCalled();
		expect(res.statusCode).toBe(403);
	});

	it("allows a hard-allow action for admin (patients.reassign)", () => {
		const res = mockRes();
		const next = vi.fn();
		requirePermission("patients.reassign")(mockReq({ id: "u1", role: "admin" }), res, next);
		expect(next).toHaveBeenCalledOnce();
	});
});

describe("requireOwnership", () => {
	const vaUser = { id: "va-1", role: "va" as const };
	const adminUser = { id: "admin-1", role: "admin" as const };

	it("admin bypasses ownership entirely (loader never called)", async () => {
		const res = mockRes();
		const next = vi.fn();
		const loader = vi.fn();
		await requireOwnership("patients.update", loader)(mockReq(adminUser), res, next);
		expect(loader).not.toHaveBeenCalled();
		expect(next).toHaveBeenCalledOnce();
	});

	it("VA passes when they own the resource", async () => {
		const res = mockRes();
		const next = vi.fn();
		const loader = vi.fn().mockResolvedValue({ ownerId: "va-1" });
		await requireOwnership("patients.update", loader)(mockReq(vaUser), res, next);
		expect(next).toHaveBeenCalledOnce();
	});

	it("VA is denied when another VA owns the resource", async () => {
		const res = mockRes();
		const next = vi.fn();
		const loader = vi.fn().mockResolvedValue({ ownerId: "va-2" });
		await requireOwnership("patients.update", loader)(mockReq(vaUser), res, next);
		expect(next).not.toHaveBeenCalled();
		expect(res.statusCode).toBe(403);
	});

	it("VA is denied when the resource is unowned (assignedTo: null)", async () => {
		const res = mockRes();
		const next = vi.fn();
		const loader = vi.fn().mockResolvedValue({ ownerId: null });
		await requireOwnership("patients.update", loader)(mockReq(vaUser), res, next);
		expect(next).not.toHaveBeenCalled();
		expect(res.statusCode).toBe(403);
	});

	it("returns 403 (not 500) when the loader can't find the resource", async () => {
		const res = mockRes();
		const next = vi.fn();
		const loader = vi.fn().mockResolvedValue(null);
		await requireOwnership("patients.update", loader)(mockReq(vaUser), res, next);
		expect(next).not.toHaveBeenCalled();
		expect(res.statusCode).toBe(403);
	});
});
