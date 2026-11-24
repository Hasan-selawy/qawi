import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import { postApiV1AttendanceMeOperations, setBaseUrl } from "@workspace/api-client-react";
import { API_BASE, TOKEN_KEY } from "./api";
import { createAttendanceQueue } from "./attendance-queue";

export const attendanceQueue = createAttendanceQueue(AsyncStorage, randomUUID);

export async function syncAttendance(userId: string, token: string) {
  setBaseUrl(API_BASE.replace(/\/api\/v1\/?$/, ""));
  return attendanceQueue.flush(userId,
    async (operation) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        return await postApiV1AttendanceMeOperations(operation,
          { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } });
      } finally { clearTimeout(timeout); }
    },
    async () => {
      const values = await AsyncStorage.multiGet(["qawi_user", TOKEN_KEY]);
      try { return JSON.parse(values[0][1] || "null")?.id === userId && values[1][1] === token; }
      catch { return false; }
    });
}
