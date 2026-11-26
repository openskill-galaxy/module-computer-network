import { parseProgressData, validateBackupRecord } from "./progressData";

// localStorage 安全封装，带 JSON 序列化、异常吞咽、按模块 BASE_URL 隔离命名空间
const rawBase = (import.meta.env.BASE_URL || "/").replace(/^\/+|\/+$/g, "");
const MODULE_SLUG = rawBase ? rawBase.split("/").filter(Boolean).pop()! : "root";

export const STORAGE_PREFIX = `osg:${MODULE_SLUG}:`;
const LEGACY_PREFIX = "osg-mt:";
const RESET_KEY = STORAGE_PREFIX + "skip-legacy";

export function isModuleOrPlatformBackupKey(
  key: string,
  includeAppwriteConfig = false
): boolean {
  if (!key) return false;
  if (
    key.startsWith("osg:") ||
    key.startsWith(LEGACY_PREFIX) ||
    key.startsWith("openskill-") ||
    key === "theme"
  ) {
    return true;
  }
  return includeAppwriteConfig && key.startsWith("openskill_appwrite_");
}

export function readJson<T>(key: string, fallback: T, legacyExactKey?: string): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (raw !== null) {
      return parseProgressData(key, raw) as T;
    }

    if (localStorage.getItem(RESET_KEY)) return fallback;
    const legacyRaw =
      localStorage.getItem(LEGACY_PREFIX + key) ??
      (legacyExactKey ? localStorage.getItem(legacyExactKey) : null);
    if (legacyRaw !== null) {
      const parsed = parseProgressData(key, legacyRaw) as T;
      try {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(parsed));
      } catch {
        /* ignore migration write error */
      }
      return parsed;
    }

    return fallback;
  } catch {
    return fallback;
  }
}

export function writeJson<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function readRaw(key: string, legacyExactKey?: string): string {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (raw !== null) return raw;
    if (legacyExactKey && !localStorage.getItem(RESET_KEY)) {
      const legacyRaw = localStorage.getItem(legacyExactKey);
      if (legacyRaw !== null) {
        try {
          localStorage.setItem(STORAGE_PREFIX + key, legacyRaw);
        } catch {
          /* ignore */
        }
        return legacyRaw;
      }
    }
    return "";
  } catch {
    return "";
  }
}

export function writeRaw(key: string, value: string): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, value);
  } catch {
    /* 存储满或被禁用时静默 */
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    /* ignore */
  }
}

export function clearAll(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
    // A reset in this module must not revive old shared keys on the next visit.
    localStorage.setItem(RESET_KEY, "true");
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX + "exam-draft:")) sessionStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function collectProgressBackup(includeAppwriteConfig = false): Record<string, string> {
  const backup: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !isModuleOrPlatformBackupKey(key, includeAppwriteConfig)) continue;
    const value = localStorage.getItem(key);
    if (value !== null) backup[key] = value;
  }
  return backup;
}

export function restoreProgressBackup(data: unknown, includeAppwriteConfig = false): number {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("无效的备份文件格式，请选择包含学习记录的 JSON 对象");
  }

  const changes: { key: string; value: string; previous: string | null }[] = [];
  let count = 0;
  for (const [key, value] of Object.entries(data)) {
    if (!isModuleOrPlatformBackupKey(key, includeAppwriteConfig)) continue;
    if (typeof value !== "string") throw new Error(`备份记录格式无效（${key}）`);
    validateBackupRecord(key, value);
    const previous = localStorage.getItem(key);
    if (previous !== value) changes.push({ key, value, previous });
    count++;
  }
  if (!count) throw new Error("文件中没有可恢复的学习记录或设置");

  // Apply smaller replacements first so that shrinking an old record frees space for the rest.
  const growth = (item: typeof changes[number]) => item.value.length - (item.previous?.length ?? 0);
  changes.sort((a, b) => growth(a) - growth(b));
  let written = 0;
  try {
    for (const { key, value } of changes) {
      localStorage.setItem(key, value);
      written++;
    }
  } catch (error) {
    for (let i = written - 1; i >= 0; i--) {
      const { key, previous } = changes[i];
      if (previous === null) localStorage.removeItem(key);
      else localStorage.setItem(key, previous);
    }
    throw error;
  }
  return count;
}
