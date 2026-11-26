import { courseMinutes } from "../utils/studyTime";
import { useMemo, useState } from "react";
import type { ModuleData } from "../data/loaders";
import CourseCard from "../components/CourseCard";
import TagFilter from "../components/TagFilter";
import { collectPageTags, matchesSelectedTags } from "../utils/tags";

export default function CoursesPage({ data }: { data: ModuleData }) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [keyword, setKeyword] = useState("");

  const pageTags = useMemo(
    () => collectPageTags(data.tags, data.courses.map((c) => c.tags || [])),
    [data.tags, data.courses]
  );

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return data.courses
      .filter((c) => matchesSelectedTags(c.tags || [], selectedTags, pageTags))
      .filter((c) =>
        kw ? `${c.title} ${c.summary} ${c.tags.join(" ")}`.toLowerCase().includes(kw) : true
      )
      .sort((a, b) => a.order - b.order);
  }, [data.courses, selectedTags, pageTags, keyword]);

  return (
    <div className="space-y-6">
      <header className="work-heading">
        <h1 className="text-2xl font-bold text-body">课程列表</h1>
        <p className="mt-1 text-sm text-muted">共 {data.courses.length} 门课程</p>
      </header>

      {pageTags.length > 0 && (
        <TagFilter tags={pageTags} selected={selectedTags} onChange={setSelectedTags} />
      )}

      <input
        type="search"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        aria-label="搜索课程"
        placeholder="在本页过滤课程…"
        className="input"
      />

      {filtered.length === 0 ? (
        <p className="text-muted">没有匹配的课程。</p>
      ) : (
        <div className="work-list">
          {filtered.map((c) => (
            <CourseCard key={c.id} course={c} minutes={courseMinutes(c.lessons, data.lessons)} />
          ))}
        </div>
      )}
    </div>
  );
}
