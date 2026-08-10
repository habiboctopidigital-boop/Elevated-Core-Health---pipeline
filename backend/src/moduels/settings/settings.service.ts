import { prisma } from "@/utils/prisma";
import { ServiceResponse } from "@/utils/serviceResponse";

interface SettingValue {
  key: string;
  value: string;
  updatedAt: Date;
}

class SettingsService {
  /**
   * Get a setting value by key
   * Returns default values for known keys if not found in DB
   */
  async getSetting(key: string) {
    try {
      const setting = await prisma.appSetting.findUnique({
        where: { key },
      });

      if (!setting) {
        // Return default for known keys
        if (key === "stale_threshold_hours") {
          return ServiceResponse.success(
            { key, value: "48", isDefault: true } as any,
            "Setting retrieved (using default)"
          );
        }
        return ServiceResponse.failure(`Setting '${key}' not found`, null, 404);
      }

      return ServiceResponse.success(
        { key: setting.key, value: setting.value, updatedAt: setting.updatedAt } as SettingValue,
        "Setting retrieved successfully"
      );
    } catch (error) {
      return ServiceResponse.failure("Failed to retrieve setting", error, 500);
    }
  }

  /**
   * Update a setting value
   */
  async updateSetting(key: string, value: string, userId: string) {
    try {
      // Validate known settings
      if (key === "stale_threshold_hours") {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue) || numValue < 1) {
          return ServiceResponse.failure(
            "Invalid stale threshold: must be a number >= 1",
            null,
            400
          );
        }
      }

      const setting = await prisma.appSetting.upsert({
        where: { key },
        update: {
          value,
          updatedById: userId,
          updatedAt: new Date(),
        },
        create: {
          key,
          value,
          updatedById: userId,
        },
      });

      return ServiceResponse.success(
        { key: setting.key, value: setting.value, updatedAt: setting.updatedAt } as SettingValue,
        "Setting updated successfully"
      );
    } catch (error) {
      return ServiceResponse.failure("Failed to update setting", error, 500);
    }
  }

  /**
   * Get stale threshold in milliseconds
   * Reads from database, falls back to 48 hours if not set
   */
  async getStaleThresholdMs(): Promise<number> {
    try {
      const setting = await prisma.appSetting.findUnique({
        where: { key: "stale_threshold_hours" },
      });

      const hours = setting ? parseInt(setting.value, 10) : 48;
      return hours * 60 * 60 * 1000;
    } catch {
      // Fallback to 48 hours on error
      return 48 * 60 * 60 * 1000;
    }
  }
}

export const settingsService = new SettingsService();
