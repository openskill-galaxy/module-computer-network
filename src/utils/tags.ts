import type { Tag } from "../types";

/**
 * 收集页面条目实际使用的标签，并与 tags.json 元数据合并：
 * - 兼容条目 tags 中存 tag.name（主流）或 tag.id（兼容）的情况；
 * - 若条目存在未收录于 tags.json 的标签，自动补充合成标签对象；
 * - 按 tags.json 原顺序 + 条目首次出现顺序去重输出，避免渲染出在本页 0 匹配的死标签。
 */
export function collectPageTags(allTags: Tag[], itemTagLists: string[][]): Tag[] {
  const byId = new Map<string, Tag>();
  const byName = new Map<string, Tag>();
  for (const t of allTags) {
    byId.set(t.id, t);
    byName.set(t.name, t);
  }

  const seenNames = new Set<string>();
  const result: Tag[] = [];

  for (const list of itemTagLists) {
    for (const raw of list || []) {
      const key = (raw || "").trim();
      if (!key) continue;
      const resolved = byName.get(key) || byId.get(key);
      if (resolved) {
        if (!seenNames.has(resolved.name)) {
          seenNames.add(resolved.name);
          result.push(resolved);
        }
      } else if (!seenNames.has(key)) {
        seenNames.add(key);
        result.push({ id: key, name: key, slug: key });
      }
    }
  }

  return result;
}

/**
 * 判断条目标签是否命中已选筛选标签（同时兼容 tag.name 与 tag.id）。
 */
export function matchesSelectedTags(
  itemTags: string[],
  selected: string[],
  pageTags: Tag[]
): boolean {
  if (selected.length === 0) return true;
  if (!itemTags || itemTags.length === 0) return false;

  const byKey = new Map<string, Tag>();
  for (const t of pageTags) {
    byKey.set(t.name, t);
    byKey.set(t.id, t);
  }

  return selected.some((sel) => {
    if (itemTags.includes(sel)) return true;
    const tagObj = byKey.get(sel);
    if (!tagObj) return false;
    return itemTags.includes(tagObj.name) || itemTags.includes(tagObj.id);
  });
}
