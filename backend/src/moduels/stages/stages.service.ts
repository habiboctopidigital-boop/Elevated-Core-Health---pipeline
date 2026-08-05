import { getActiveStages } from "@/config/stages";
import { ServiceResponse } from "@/utils/serviceResponse";

export const stagesService = {
	/** Active stages in pipeline order — consumed by the board & UI (any logged-in user). */
	async list() {
		const stages = await getActiveStages();
		return ServiceResponse.success("Stages retrieved.", stages);
	},
};
