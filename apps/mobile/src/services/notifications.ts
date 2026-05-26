import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { ParkingSession } from '@parking/shared-types';
import { parkingApi } from './parkingApi';

// Foreground behavior: show banners + play default sound while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const SESSION_ID_KEY = 'sessionId';

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

/**
 * Cancel any notifications previously scheduled for this session, then schedule:
 *  - "15 minutes left" reminder
 *  - "5 minutes left" reminder
 *  - "Your parking session has ended" notice
 * Past times are skipped silently.
 */
export async function scheduleSessionReminders(session: ParkingSession): Promise<void> {
  if (Platform.OS === 'web') return;
  await cancelSessionReminders(session.id);

  const expiresAt = new Date(session.expiresAt).getTime();
  const now = Date.now();

  const reminders: Array<{ minutesBefore: number; title: string; body: string }> = [
    {
      minutesBefore: 15,
      title: 'Parking expires in 15 min',
      body: 'Tap to extend before it ends.',
    },
    {
      minutesBefore: 5,
      title: 'Parking expires in 5 min',
      body: 'Tap to extend now to avoid a ticket.',
    },
    {
      minutesBefore: 0,
      title: 'Parking session ended',
      body: 'Your paid time has run out.',
    },
  ];

  for (const r of reminders) {
    const triggerTime = expiresAt - r.minutesBefore * 60_000;
    if (triggerTime <= now + 1000) continue; // skip past/imminent
    const seconds = Math.round((triggerTime - now) / 1000);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: r.title,
        body: r.body,
        data: { [SESSION_ID_KEY]: session.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
      },
    });
  }
}

/** Cancel all notifications associated with a given session id. */
export async function cancelSessionReminders(sessionId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => (n.content.data as Record<string, unknown> | null)?.[SESSION_ID_KEY] === sessionId)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

// ---------------------------------------------------------------------------
// Server-side push (Expo Push) — local reminders cover the device that started
// the session; server push covers cross-device + app-killed scenarios.
// ---------------------------------------------------------------------------

let cachedExpoPushToken: string | null = null;

/**
 * Acquire an Expo push token and POST it to the API so the backend can fan
 * out reminders. Safe to call repeatedly (server upserts by token).
 *
 * Returns the token on success, or null when permission was denied / running
 * on web / no projectId configured (e.g. Expo Go without EAS).
 */
export async function registerPushTokenWithServer(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  const granted = await ensureNotificationPermission();
  if (!granted) return null;

  // Android requires a channel before tokens fire actual notifications.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants.easConfig as { projectId?: string } | undefined)?.projectId;

  try {
    const { data } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    cachedExpoPushToken = data;
    await parkingApi.registerDevice(data, Platform.OS as 'ios' | 'android');
    return data;
  } catch (err) {
    // Most commonly: running in Expo Go without a projectId, or no network.
    console.warn('[push] registerPushTokenWithServer failed', err);
    return null;
  }
}

/** Tell the server to forget this device. Call on logout. */
export async function unregisterPushTokenWithServer(): Promise<void> {
  const token = cachedExpoPushToken;
  cachedExpoPushToken = null;
  if (!token) return;
  try {
    await parkingApi.unregisterDevice(token);
  } catch (err) {
    console.warn('[push] unregisterPushTokenWithServer failed', err);
  }
}
