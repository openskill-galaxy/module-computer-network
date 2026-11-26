export const PLATFORM_CONFIG = {
  name: "OpenSkill Galaxy",
  version: "1.0.0",
  portalUrl: "https://openskill-galaxy.github.io/",
  license: "MIT",
  author: "OpenSkill Community",
};

export const STORAGE_KEYS = {
  THEME: "theme",
  NAMESPACE_PREFIX: "osg:",
  LEGACY_PREFIX: "osg-mt:",
  SOUND_MUTED: "openskill-sound-muted",
  ACTIVE_DATES: "openskill-active-dates",
  BACKUP_PREFIX: "openskill-",
  NOTE_PREFIX: "openskill-note-",
};

export const DEFAULT_APPWRITE = {
  endpoint: "https://cloud.appwrite.io/v1",
  projectId: "openskill-galaxy",
  databaseId: "openskill_db",
  collectionId: "user_progress",
};

export const DIFFICULTY_COLORS = {
  easy: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
  medium: "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/20",
  hard: "text-rose-700 dark:text-rose-300 bg-rose-500/10 border-rose-500/20",
};
