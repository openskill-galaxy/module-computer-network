import { Client, Account, Databases, ID, Query } from "appwrite";
import { DEFAULT_APPWRITE } from "../config/constants";
import { collectProgressBackup, restoreProgressBackup } from "../utils/storage";

const DEFAULT_ENDPOINT = DEFAULT_APPWRITE.endpoint;
const DEFAULT_PROJECT = DEFAULT_APPWRITE.projectId;
const DATABASE_ID = DEFAULT_APPWRITE.databaseId;
const COLLECTION_ID = DEFAULT_APPWRITE.collectionId;

export interface AppwriteConfig {
  endpoint: string;
  projectId: string;
}

export function getAppwriteConfig(): AppwriteConfig {
  return {
    endpoint: localStorage.getItem("openskill_appwrite_endpoint") || (import.meta as any).env?.VITE_APPWRITE_ENDPOINT || DEFAULT_ENDPOINT,
    projectId: localStorage.getItem("openskill_appwrite_project_id") || (import.meta as any).env?.VITE_APPWRITE_PROJECT_ID || DEFAULT_PROJECT,
  };
}

export function saveAppwriteConfig(endpoint: string, projectId: string) {
  if (endpoint) localStorage.setItem("openskill_appwrite_endpoint", endpoint);
  else localStorage.removeItem("openskill_appwrite_endpoint");

  if (projectId) localStorage.setItem("openskill_appwrite_project_id", projectId);
  else localStorage.removeItem("openskill_appwrite_project_id");
}

let clientInstance: Client | null = null;
let accountInstance: Account | null = null;
let databasesInstance: Databases | null = null;

export function getAppwriteInstances() {
  const { endpoint, projectId } = getAppwriteConfig();
  if (!clientInstance) {
    clientInstance = new Client();
  }
  clientInstance.setEndpoint(endpoint).setProject(projectId);

  if (!accountInstance) accountInstance = new Account(clientInstance);
  if (!databasesInstance) databasesInstance = new Databases(clientInstance);

  return { client: clientInstance, account: accountInstance, databases: databasesInstance };
}

export async function getCurrentUser() {
  try {
    const { account } = getAppwriteInstances();
    return await account.get();
  } catch (e) {
    return null;
  }
}

export async function loginAnonymous() {
  const { account } = getAppwriteInstances();
  return await account.createAnonymousSession();
}

export async function loginEmail(email: string, pass: string) {
  const { account } = getAppwriteInstances();
  return await account.createEmailPasswordSession(email, pass);
}

export async function registerEmail(email: string, pass: string, name?: string) {
  const { account } = getAppwriteInstances();
  await account.create(ID.unique(), email, pass, name || "Learner");
  return await loginEmail(email, pass);
}

export async function logoutUser() {
  const { account } = getAppwriteInstances();
  await account.deleteSession("current");
}

export async function pushProgressToCloud() {
  const user = await getCurrentUser();
  if (!user) throw new Error("请先登录或初始化 Appwrite 访客身份");

  const { databases } = getAppwriteInstances();
  const backupData = collectProgressBackup();

  const payload = {
    userId: user.$id,
    data: JSON.stringify(backupData),
    updatedAt: new Date().toISOString(),
  };

  try {
    const existing = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
      Query.equal("userId", user.$id),
    ]);

    const existingId = existing.documents[0]?.$id;
    if (existingId) return await databases.updateDocument(DATABASE_ID, COLLECTION_ID, existingId, payload);
    return await databases.createDocument(DATABASE_ID, COLLECTION_ID, user.$id, payload);
  } catch {
    const { account } = getAppwriteInstances();
    await account.updatePrefs({
      prefs: { ...user.prefs, openskill_progress: payload.data, updatedAt: payload.updatedAt },
    });
    return { status: "saved_to_user_prefs" };
  }
}

export async function pullProgressFromCloud() {
  const user = await getCurrentUser();
  if (!user) throw new Error("请先登录或初始化 Appwrite 访客身份");

  const { databases } = getAppwriteInstances();
  const prefs = user.prefs;
  const candidates: { data: string; updatedAt?: string }[] = [];
  if (typeof prefs.openskill_progress === "string" && prefs.openskill_progress) {
    candidates.push({ data: prefs.openskill_progress, updatedAt: prefs.updatedAt });
  }
  try {
    const existing = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
      Query.equal("userId", user.$id),
    ]);
    for (const doc of existing.documents) {
      if (typeof doc.data === "string" && doc.data) {
        candidates.push({ data: doc.data, updatedAt: doc.updatedAt || doc.$updatedAt });
      }
    }
  } catch (error) {
    if (!candidates.length) throw error;
  }

  if (!candidates.length) throw new Error("云端未查找到存盘进度");
  const timestamp = (value?: string) => value ? Date.parse(value) || 0 : 0;
  candidates.sort((a, b) => timestamp(b.updatedAt) - timestamp(a.updatedAt));
  const backupData = JSON.parse(candidates[0].data);
  restoreProgressBackup(backupData);
  return backupData;
}
