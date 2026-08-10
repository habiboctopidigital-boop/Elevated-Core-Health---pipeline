import { type RequestHandler } from "express";
import { settingsService } from "./settings.service";
import { handleServiceResponse } from "@/utils/httpHandlers";

class SettingsController {
  /**
   * GET /admin/settings/:key
   * Retrieve a single setting value by key (admin only)
   */
  getSetting: RequestHandler = async (req, res) => {
    const { key } = req.params;
    const result = await settingsService.getSetting(key);
    handleServiceResponse(result, res);
  };

  /**
   * PATCH /admin/settings/:key
   * Update a single setting value by key (admin only)
   */
  updateSetting: RequestHandler = async (req, res) => {
    const { key } = req.params;
    const { value } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return handleServiceResponse(
        { statusCode: 401, isSuccess: false, message: "Unauthorized", data: null },
        res
      );
    }

    const result = await settingsService.updateSetting(key, value, userId);
    handleServiceResponse(result, res);
  };
}

export const settingsController = new SettingsController();
