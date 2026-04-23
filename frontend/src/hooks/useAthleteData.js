import { useAthleteData as useAthleteDataContext } from "../context/AthleteContext";

/**
 * useAthleteData Hook (Context Consumer)
 * -------------------------------------
 * This hook now consumes the global AthleteDataContext.
 * It provides the same API as before but ensures only ONE set
 * of Firebase listeners is active for the entire application.
 * 
 * It also includes mlInsights which is required for AI analytics.
 */
export const useAthleteData = () => {
  return useAthleteDataContext();
};
