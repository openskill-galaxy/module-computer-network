import type { ReactNode } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import type { ModuleData } from "../data/loaders";
import { useSEO } from "../hooks/useSEO";

export default function Layout({
  data,
  children,
}: {
  data: ModuleData;
  children: ReactNode;
}) {
  // 全局兜底标题/描述（详情页会各自覆盖为「条目 · 模块名」）
  useSEO({ title: data.module.title, description: data.module.description });

  return (
    <div className="min-h-full flex flex-col bg-page">
      <a href="#module-main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 btn-primary">
        跳到主要内容
      </a>
      <Header module={data.module} data={data} />
      <div className="module-shell flex flex-1">
        <Sidebar />
        <main id="module-main" tabIndex={-1} className="flex-1 min-w-0 scroll-mt-16">
          <div className="container-page module-content">{children}</div>
        </main>
      </div>
      <Footer module={data.module} />
    </div>
  );
}
