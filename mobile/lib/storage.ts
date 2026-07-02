import * as SecureStore from "expo-secure-store";

const KEY = "timio_employee_v1";

export interface StoredEmployee {
  id: string;
  name: string;
  department: string;
  position: string;
  companyName: string;
  slug: string;
  pin: string;
}

export async function saveEmployee(data: StoredEmployee): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(data));
}

export async function getEmployee(): Promise<StoredEmployee | null> {
  const raw = await SecureStore.getItemAsync(KEY);
  return raw ? (JSON.parse(raw) as StoredEmployee) : null;
}

export async function clearEmployee(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}
