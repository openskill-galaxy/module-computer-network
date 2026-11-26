import type { Case } from "../types";
import type { ExternalFeedback, ReviewVersion } from "./externalReviewData";

export function matchesVersion(version: ReviewVersion, item: Case, answer: string): boolean {
  const rubric = item.reviewRubric ?? [];
  return version.answer === answer && version.rubric.length === rubric.length &&
    version.rubric.every((row, i) => row.id === rubric[i].id && row.title === rubric[i].title && row.requirement === rubric[i].requirement);
}

export function createVersion(item: Case, answer: string): ReviewVersion {
  const id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (n) => n.toString(16).padStart(2, "0")).join("");
  return { id, createdAt: new Date().toISOString(), answer, rubric: item.reviewRubric ?? [], feedback: [] };
}

const endField = "<!-- /openskill-field -->";

function field(id: string, prompt: string): string {
  return ["<!-- openskill-field:" + id + " -->", prompt, endField].join("\n");
}

function submittedAnswer(version: ReviewVersion): string {
  return ["<!-- openskill-submission:" + version.id + " -->", "## 我的作答", version.answer,
    "<!-- /openskill-submission:" + version.id + " -->"].join("\n\n");
}

export function reviewForm(item: Case, moduleSlug: string, moduleTitle: string, version: ReviewVersion): string {
  const header = ["<!-- openskill-review:v1", encodeURIComponent(moduleSlug), encodeURIComponent(item.id), version.id, "-->"].join(" ");
  const sections = [header, "# " + item.title, moduleTitle, "送审版本：" + version.id + " · " + version.createdAt,
    "## 案例背景\n\n" + item.backgroundMarkdown, "## 训练任务\n\n" + item.tasksMarkdown, submittedAnswer(version),
    "<!-- openskill-feedback:" + version.id + " -->", "## 独立评阅表",
    (version.rubric.length ? "" : "本案例采用综合意见。请根据训练任务和学员作答提出建议。") +
      "请用文本编辑器打开此文件，在各栏目冒号后填写。保留原有注释标记和 .md 格式，将文件交还学员，由其导入本地案例。",
    field("name", "评阅人：")];
  for (const row of version.rubric) {
    sections.push("### " + row.title, "评审标准：" + row.requirement,
      field("criterion-" + row.id, "复核结论（已达到 / 需改进 / 证据不足）：\n证据与修改建议："));
  }
  sections.push("## 综合意见", field("summary", "优先修改的部分：\n复查方式："));
  return sections.join("\n\n") + "\n";
}

const blankPrompt = /^(?:评阅人|证据与修改建议|复核结论（已达到 \/ 需改进 \/ 证据不足）|优先修改的部分|复查方式)[：:]$/;

export function readReturnedReview(markdown: string, moduleSlug: string, caseId: string, versions: ReviewVersion[]) {
  const document = markdown.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const header = /^<!-- openskill-review:v1 (\S+) (\S+) ([0-9a-f]{24}) -->\n/.exec(document);
  if (!header) throw new Error("文件缺少评阅版本。请使用本页导出的独立评阅表。");
  if (header[1] !== encodeURIComponent(moduleSlug) || header[2] !== encodeURIComponent(caseId)) {
    throw new Error("这份评阅表属于其他案例，请打开对应案例导入。");
  }
  const version = versions.find((entry) => entry.id === header[3]);
  if (!version) throw new Error("本浏览器没有这个送审版本。请先恢复导出评阅表时的学习备份。");
  const marker = "\n<!-- openskill-feedback:" + version.id + " -->\n";
  const start = document.lastIndexOf(marker);
  if (start === -1) throw new Error("评阅区域不完整，请保留导出文件的栏目和注释标记。");
  if (!document.slice(0, start).includes(submittedAnswer(version).replace(/\r\n?/g, "\n"))) {
    throw new Error("送审原稿已被改动，请从原评阅表填写反馈并保留作答原文。");
  }
  const fields = new Map<string, string>();
  const lines = document.slice(start + marker.length).split("\n");
  for (let i = 0; i < lines.length; i++) {
    const match = /^<!-- openskill-field:([a-z0-9-]+) -->$/.exec(lines[i]);
    if (!match) continue;
    const values: string[] = [];
    while (++i < lines.length && lines[i] !== endField) {
      if (lines[i].startsWith("<!-- openskill-field:")) break;
      if (!blankPrompt.test(lines[i].trim())) values.push(lines[i]);
    }
    if (lines[i] !== endField || fields.has(match[1])) throw new Error("评阅栏目重复或不完整，请使用原表。");
    fields.set(match[1], values.join("\n").trim());
  }
  const expected = ["name", "summary", ...version.rubric.map((row) => "criterion-" + row.id)];
  if (fields.size !== expected.length || !expected.every((key) => fields.has(key))) {
    throw new Error("评阅栏目与送审版本不一致，请保留原表中的全部栏目。");
  }
  const comments: Record<string, string> = {};
  for (const row of version.rubric) {
    const note = fields.get("criterion-" + row.id);
    if (note) comments[row.id] = note;
  }
  const summary = fields.get("summary") ?? "";
  if (!summary && !Object.keys(comments).length) {
    throw new Error(version.rubric.length ? "评阅表尚无意见，请填写综合意见或一项标准的反馈。" : "评阅表尚无意见，请填写综合意见。");
  }
  const name = (fields.get("name") ?? "").replace(/^评阅人[：:]\s*/, "").trim();
  const review = { name, summary, comments, receivedAt: new Date().toISOString() };
  return { versionId: version.id, review };
}

export function sameFeedback(a: ExternalFeedback, b: ExternalFeedback): boolean {
  return a.name === b.name && a.summary === b.summary &&
    Object.keys(a.comments).length === Object.keys(b.comments).length &&
    Object.entries(a.comments).every(([key, text]) => b.comments[key] === text);
}

export function feedbackArchive(versions: ReviewVersion[]): string {
  const sections = ["## 收到的外部评阅"];
  for (const version of versions.filter((entry) => entry.feedback.length)) {
    sections.push("### 送审版本 " + version.id, "送审时间：" + version.createdAt, "当时的作答：\n\n" + version.answer);
    for (const review of version.feedback) {
      sections.push("#### 评阅人：" + (review.name || "匿名"), "导入时间：" + review.receivedAt);
      for (const row of version.rubric) {
        if (review.comments[row.id]) sections.push(row.title + "\n\n" + review.comments[row.id]);
      }
      if (review.summary) sections.push("综合意见\n\n" + review.summary);
    }
  }
  return sections.join("\n\n");
}
