import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_KEY = "timio_offline_queue_v1";

export interface QueueItem {
  id: string;
  employeeId: string;
  pin: string;
  timestamp: string; // ISO - thời điểm nhân viên bấm thực tế
  synced: boolean;
  syncedAt?: string;
  error?: string;
}

export async function getQueue(): Promise<QueueItem[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? (JSON.parse(raw) as QueueItem[]) : [];
}

async function saveQueue(items: QueueItem[]): Promise<void> {
  // Chỉ giữ 200 record gần nhất (đã sync + chưa sync)
  const trimmed = items.slice(-200);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(trimmed));
}

export async function addToQueue(employeeId: string, pin: string): Promise<QueueItem> {
  const items = await getQueue();
  const item: QueueItem = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    employeeId,
    pin,
    timestamp: new Date().toISOString(),
    synced: false,
  };
  items.push(item);
  await saveQueue(items);
  return item;
}

export async function markSynced(id: string): Promise<void> {
  const items = await getQueue();
  const updated = items.map((item) =>
    item.id === id ? { ...item, synced: true, syncedAt: new Date().toISOString() } : item
  );
  await saveQueue(updated);
}

export async function markError(id: string, error: string): Promise<void> {
  const items = await getQueue();
  const updated = items.map((item) =>
    item.id === id ? { ...item, error } : item
  );
  await saveQueue(updated);
}

export async function getPending(): Promise<QueueItem[]> {
  const items = await getQueue();
  return items.filter((i) => !i.synced);
}

export async function getPendingCount(): Promise<number> {
  return (await getPending()).length;
}

export async function syncAll(
  checkInFn: (employeeId: string, pin: string, timestamp: string) => Promise<void>
): Promise<number> {
  const pending = await getPending();
  let count = 0;
  for (const item of pending) {
    try {
      await checkInFn(item.employeeId, item.pin, item.timestamp);
      await markSynced(item.id);
      count++;
    } catch (e) {
      await markError(item.id, e instanceof Error ? e.message : String(e));
    }
  }
  return count;
}
