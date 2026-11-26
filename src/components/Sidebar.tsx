import { Link, matchPath, useLocation } from "react-router-dom";

const groups: { title: string; items: { to: string; label: string; end?: boolean }[] }[] = [
  {
    title: "学习",
    items: [
      { to: "/", label: "首页", end: true },
      { to: "/courses", label: "课程列表" },
      { to: "/knowledge", label: "知识点库" },
      { to: "/routes", label: "学习路线", end: true },
      { to: "/cases", label: "案例训练" },
    ],
  },
  {
    title: "练习",
    items: [
      { to: "/questions", label: "题库练习" },
      { to: "/exams", label: "模拟考试" },
      { to: "/wrong", label: "错题本" },
      { to: "/favorites", label: "收藏夹" },
    ],
  },
  {
    title: "其它",
    items: [
      { to: "/search", label: "搜索", end: true },
      { to: "/faq", label: "FAQ", end: true },
      { to: "/about", label: "关于本模块", end: true },
    ],
  },
];

export default function Sidebar() {
  const { pathname } = useLocation();
  const section = pathname.startsWith("/lessons/") ? "/courses" : pathname.startsWith("/practice/") ? "/questions" : pathname;
  return (
    <aside className="module-rail hidden md:block shrink-0 border-r border-line">
      <nav className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto p-3 space-y-5" aria-label="模块导航">
        {groups.map((g) => (
          <div key={g.title}>
            <p className="px-3.5 mb-1.5 text-[11px] text-subtle font-semibold">
              {g.title}
            </p>
            {g.items.map((item) => {
              const current = Boolean(matchPath({ path: item.to, end: item.end ?? false }, section));
              return (
                <Link key={item.to} to={item.to} aria-current={current ? "page" : undefined}
                  className={`nav-link ${current ? "nav-link-active" : ""}`}>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
