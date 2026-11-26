import { clearPendingPracticeResults, resultPrefix } from "./utils/practiceReview";
import { STORAGE_PREFIX } from "./utils/storage";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import { PageSkeleton } from "./components/SkeletonLoader";
import { loadAll, type ModuleData } from "./data/loaders";
import { useProgressStore } from "./store/useProgressStore";

// 路由级代码分割：按页面懒加载，减小首屏体积
const HomePage = lazy(() => import("./pages/HomePage"));
const CoursesPage = lazy(() => import("./pages/CoursesPage"));
const CourseDetailPage = lazy(() => import("./pages/CourseDetailPage"));
const LessonPage = lazy(() => import("./pages/LessonPage"));
const KnowledgePointsPage = lazy(() => import("./pages/KnowledgePointsPage"));
const KnowledgePointDetailPage = lazy(() => import("./pages/KnowledgePointDetailPage"));
const QuestionBankPage = lazy(() => import("./pages/QuestionBankPage"));
const QuestionDetailPage = lazy(() => import("./pages/QuestionDetailPage"));
const ExamsPage = lazy(() => import("./pages/ExamsPage"));
const ExamPage = lazy(() => import("./pages/ExamPage"));
const ExamResultPage = lazy(() => import("./pages/ExamResultPage"));
const WrongQuestionsPage = lazy(() => import("./pages/WrongQuestionsPage"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const CasesPage = lazy(() => import("./pages/CasesPage"));
const CaseDetailPage = lazy(() => import("./pages/CaseDetailPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const FaqPage = lazy(() => import("./pages/FaqPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const RoutesPage = lazy(() => import("./pages/RoutesPage"));

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      document.body.scrollTo(0, 0);
    }
  }, [pathname, hash]);
  return null;
}

function RouteFallback() {
  return <PageSkeleton />;
}

export default function App() {
  const [data, setData] = useState<ModuleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const hydrate = useProgressStore((s) => s.hydrate);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    hydrate();
    loadAll()
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, [hydrate, retryCount]);

  useEffect(() => {
    let timer: number;
    const synchronize = (event: StorageEvent) => {
      if (event.key !== null) {
        if (!event.key.startsWith(STORAGE_PREFIX)) return;
        const key = event.key.slice(STORAGE_PREFIX.length);
        if (!key.startsWith(resultPrefix) && !["wrongs", "exams", "progress", "favorites", "skip-legacy"].includes(key)) return;
      }
      if (event.key === null || event.key === STORAGE_PREFIX + "skip-legacy") clearPendingPracticeResults();
      window.clearTimeout(timer);
      timer = window.setTimeout(hydrate, 0);
    };
    window.addEventListener("storage", synchronize);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", synchronize);
    };
  }, [hydrate]);

  const basename = useMemo(() => {
    const fromEnv = import.meta.env.BASE_URL || "/module-template/";
    return fromEnv.endsWith("/") ? fromEnv : fromEnv + "/";
  }, []);

  if (error) {
    return (
      <div className="container-page py-20 text-center">
        <p className="text-rose-700 dark:text-rose-300 font-medium">数据加载失败：{error}</p>
        <p className="mt-2 text-muted text-sm">
          请检查网络连接或确认 public/data/*.json 资源可用。
        </p>
        <button
          type="button"
          onClick={() => setRetryCount((c) => c + 1)}
          className="mt-4 inline-flex items-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 transition"
        >
          重新加载
        </button>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="container-page py-20 text-center text-muted" role="status">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent align-middle mr-2" />
        正在加载模块数据…
      </div>
    );
  }

  return (
    <BrowserRouter basename={basename}>
      <ScrollToTop />
      <Layout data={data}>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<HomePage data={data} />} />
            <Route path="/courses" element={<CoursesPage data={data} />} />
            <Route path="/courses/:slug" element={<CourseDetailPage data={data} />} />
            <Route path="/lessons/:slug" element={<LessonPage data={data} />} />
            <Route path="/knowledge" element={<KnowledgePointsPage data={data} />} />
            <Route path="/knowledge/:slug" element={<KnowledgePointDetailPage data={data} />} />
            <Route path="/questions" element={<QuestionBankPage data={data} />} />
            <Route path="/questions/:slug" element={<QuestionDetailPage data={data} />} />
            <Route path="/practice/:slug" element={<QuestionDetailPage data={data} practice />} />
            <Route path="/exams" element={<ExamsPage data={data} />} />
            <Route path="/exams/:slug" element={<ExamPage data={data} />} />
            <Route path="/exams/:slug/result" element={<ExamResultPage data={data} />} />
            <Route path="/wrong" element={<WrongQuestionsPage data={data} />} />
            <Route path="/favorites" element={<FavoritesPage data={data} />} />
            <Route path="/cases" element={<CasesPage data={data} />} />
            <Route path="/cases/:slug" element={<CaseDetailPage data={data} />} />
            <Route path="/routes" element={<RoutesPage data={data} />} />
            <Route path="/search" element={<SearchPage data={data} />} />
            <Route path="/faq" element={<FaqPage data={data} />} />
            <Route path="/about" element={<AboutPage data={data} />} />
            <Route path="*" element={<HomePage data={data} />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}
