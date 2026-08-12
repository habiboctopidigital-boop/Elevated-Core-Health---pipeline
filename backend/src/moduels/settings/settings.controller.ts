import { type RequestHandler } from "express";
import { settingsService } from "./settings.service";
import { getRequestContext } from "@/lib/audit";
import { handleServiceResponse } from "@/utils/httpHandlers";
import { ServiceResponse } from "@/utils/serviceResponse";

class SettingsController {
  /**
   * GET /admin/settings/:key
   * Retrieve a single setting value by key (admin only)
   */
  getSetting: RequestHandler = async (req, res) => {
    const { key } = req.params;
    const keyValue = Array.isArray(key) ? key[0] : key;
    const result = await settingsService.getSetting(keyValue);
    handleServiceResponse(result, res);
  };

  /**
   * PATCH /admin/settings/:key
   * Update a single setting value by key (admin only)
   */
  updateSetting: RequestHandler = async (req, res) => {
    const { key } = req.params;
    const { value } = req.body;

    if (!req.user) {
      return handleServiceResponse(
        ServiceResponse.failure("Unauthorized", null, 401),
        res
      );
    }

    const keyValue = Array.isArray(key) ? key[0] : key;
    const result = await settingsService.updateSetting(keyValue, value, req.user, getRequestContext(req));
    handleServiceResponse(result, res);
  };
}

export const settingsController = new SettingsController();
