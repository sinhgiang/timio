import * as SecureStore from "expo-secure-store";

const EMP_KEY = "timio_employee_v1";
const MGR_KEY = "timio_manager_v1";

export interface StoredEmployee {
  id: string;
  name: string;
  department: string;
  position: string;
  companyName: string;
  slug: string;
  pin: string;
}

export interface StoredManager {
  adminId: string;
  companyId: string;
  companyName: string;
  companySlug: string;
  adminName: string;
  email: string;
  role: string;
  token: string;
}

export async function saveEmployee(data: StoredEmployee): Promise<void> {
  await SecureStore.setItemAsync(EMP_KEY, JSON.stringify(data));
}

export async function getEmployee(): Promise<StoredEmployee | null> {
  const raw = await SecureStore.getItemAsync(EMP_KEY);
  return raw ? (JSON.parse(raw) as StoredEmployee) : null;
}

export async function clearEmployee(): Promise<void> {
  await SecureStore.deleteItemAsync(EMP_KEY);
}

export async function saveManager(data: StoredManager): Promise<void> {
  await SecureStore.setItemAsync(MGR_KEY, JSON.stringify(data));
}

export async function getManager(): Promise<StoredManager | null> {
  const raw = await SecureStore.getItemAsync(MGR_KEY);
  return raw ? (JSON.parse(raw) as StoredManager) : null;
}

export async function clearManager(): Promise<void> {
  await SecureStore.deleteItemAsync(MGR_KEY);
}
