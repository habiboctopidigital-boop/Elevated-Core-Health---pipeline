import type { UserRole } from "@/config/roles";

export interface AuthenticatedUser {
	id: string;
	name: string;
	email: string;
	role: UserRole;
}

declare global {
	namespace Express {
		interface Request {
			user?: AuthenticatedUser;
		}
	}
}
