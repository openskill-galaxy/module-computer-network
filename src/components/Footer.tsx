import ContentFeedback from "./ContentFeedback";
import { Link } from "react-router-dom";
import type { ModuleMeta } from "../types";
import { IconGithub, colorFromId, monogram } from "./icons";

export default function Footer({ module }: { module: ModuleMeta }) {
  const versionStr = module?.version ? `v${module.version}` : "v1.0.0";
  const updatedStr = module?.updatedAt ? `更新于 ${module.updatedAt}` : `更新于 ${new Date().toISOString().slice(0, 10)}`;
  const licenseStr = module?.license || "MIT License";
  const badgeColor = colorFromId(module?.slug || "module");

  return (
    <footer className="border-t border-line mt-8">
      <div className="container-page py-12 text-sm">
        <div className="flex flex-col md:flex-row gap-8 md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
              style={{ background: badgeColor.soft, color: badgeColor.fg }}
            >
              {monogram(module?.title || "OpenSkill")}
            </span>
            <div>
              <p className="text-body font-semibold tracking-tight">
                {module?.title || "OpenSkill Galaxy 模块"}
              </p>
              <p className="mt-0.5 text-xs text-subtle">
                {versionStr} · {updatedStr} · {licenseStr}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 text-sm font-medium">
            <ContentFeedback module={module} />
            {module?.repoUrl && /^https?:\/\//i.test(module.repoUrl) && (
              <a
                className="inline-flex items-center gap-1.5 text-muted hover:text-body transition duration-200"
                href={module.repoUrl}
                target="_blank"
                rel="noreferrer"
              >
                <IconGithub size={16} /> 模块仓库
              </a>
            )}
            <a
              className="text-muted hover:text-body transition duration-200"
              href={module?.portalUrl || "https://openskill-galaxy.github.io/"}
              target="_blank"
              rel="noreferrer"
            >
              返回 OpenSkill 总站
            </a>
            <Link
              className="text-muted hover:text-body transition duration-200"
              to="/faq"
            >
              常见问题
            </Link>
            <Link
              className="text-muted hover:text-body transition duration-200"
              to="/about"
            >
              关于模块
            </Link>
          </div>
        </div>

        <div className="mt-8 border-t border-line pt-5 flex flex-col sm:flex-row justify-between text-xs text-subtle gap-2">
          <p>© {new Date().getFullYear()} OpenSkill Galaxy · {licenseStr}</p>
          <p>Made for student self-learners</p>
        </div>
      </div>
    </footer>
  );
}
