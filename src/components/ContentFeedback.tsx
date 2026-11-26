import type { ModuleMeta } from "../types";

const labels = { lessons: "讲义", questions: "题目", cases: "案例" } as const;
interface FeedbackItem {
  section: keyof typeof labels;
  id: string;
  slug: string;
  title: string;
}

function issueDraft(module: ModuleMeta, item?: FeedbackItem) {
  const repo = /^https:\/\/github\.com\/([a-z0-9-]+)\/([\w.-]+?)\/?$/i.exec(module.repoUrl?.trim() ?? "");
  if (!repo) return null;
  const name = repo[2].replace(/\.git$/i, "");
  if (!name || name === "." || name === "..") return null;
  const url = new URL(`https://github.com/${repo[1]}/${name}/issues/new`);
  let site = new URL(`https://${repo[1]}.github.io/`);
  try {
    const portal = new URL(module.portalUrl ?? "");
    if (portal.protocol === "https:" && !portal.username && !portal.password) {
      site = new URL(portal.pathname.replace(/\/?$/, "/"), portal.origin);
    }
  } catch { /* A standalone module can use its GitHub Pages URL. */ }
  const page = new URL(encodeURIComponent(module.slug) + "/", site);
  const body = ["模块：" + module.title];
  if (item) {
    page.pathname += item.section + "/" + encodeURIComponent(item.slug);
    body.push(labels[item.section] + "：" + item.title, "条目 ID：" + item.id);
  }
  body.push("页面：" + page.href, "", "遇到的问题", "", "", "建议修正或依据", "");
  url.searchParams.set("title", "内容纠错 · " + (item?.title ?? module.title).replace(/\s+/g, " ").slice(0, 100));
  url.searchParams.set("body", body.join("\n"));
  return url.href;
}

export default function ContentFeedback({ module, item }: { module: ModuleMeta; item?: FeedbackItem }) {
  const href = issueDraft(module, item);
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
      className="print:hidden inline-flex items-center py-1 text-sm font-medium text-brand hover:underline"
      title="在 GitHub 打开反馈草稿">
      {item ? labels[item.section] + "纠错" : "反馈模块问题"}
    </a>
  );
}
