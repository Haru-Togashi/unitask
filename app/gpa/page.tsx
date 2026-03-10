"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";

type Course = {
  id: string;
  name: string;
  credits: number;
  grade: string | null;
};

const GRADE_POINTS: Record<string, number> = {
  S: 4.0,
  A: 3.0,
  B: 2.0,
  C: 1.0,
  D: 0.0,
};

const GRADE_COLORS: Record<string, string> = {
  S: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
  A: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  B: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  C: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
  D: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
};

function calcGPA(courses: Course[], simulateFail?: string): number {
  let totalPoints = 0;
  let totalCredits = 0;
  for (const c of courses) {
    const g = c.id === simulateFail ? "D" : c.grade;
    if (!g || !(g in GRADE_POINTS)) continue;
    const credits = c.credits ?? 2;
    totalPoints += GRADE_POINTS[g] * credits;
    totalCredits += credits;
  }
  if (totalCredits === 0) return 0;
  return Math.round((totalPoints / totalCredits) * 100) / 100;
}

function calcEarnedCredits(courses: Course[], simulateFail?: string): number {
  let earned = 0;
  for (const c of courses) {
    const g = c.id === simulateFail ? "D" : c.grade;
    if (g && g !== "D" && g in GRADE_POINTS) {
      earned += c.credits ?? 2;
    }
  }
  return earned;
}

export default function GpaPage() {
  const supabase = createClient();
  const [courses, setCourses] = useState<Course[]>([]);
  const [requiredCredits, setRequiredCredits] = useState(124);
  const [reqInput, setReqInput] = useState("124");
  const [simulateFail, setSimulateFail] = useState<string | null>(null);

  const loadCourses = useCallback(async () => {
    const { data } = await supabase
      .from("courses")
      .select("id, name, credits, grade")
      .order("day_of_week")
      .order("period");
    if (data) setCourses(data);
  }, [supabase]);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { window.location.href = "/login"; return; }
      loadCourses();
    };
    init();
    const stored = localStorage.getItem("required_credits");
    if (stored) {
      setRequiredCredits(Number(stored));
      setReqInput(stored);
    }
  }, [supabase, loadCourses]);

  const currentGPA = calcGPA(courses);
  const earnedCredits = calcEarnedCredits(courses);
  const simulatedGPA = simulateFail ? calcGPA(courses, simulateFail) : null;
  const simulatedEarned = simulateFail ? calcEarnedCredits(courses, simulateFail) : null;
  const progress = Math.min((earnedCredits / requiredCredits) * 100, 100);

  const gradedCourses = courses.filter(c => c.grade && c.grade in GRADE_POINTS);

  const handleReqChange = (val: string) => {
    setReqInput(val);
    const n = Number(val);
    if (n > 0 && n <= 300) {
      setRequiredCredits(n);
      localStorage.setItem("required_credits", String(n));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <a
            href="/courses"
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-sm flex items-center gap-1"
          >
            ← 授業管理
          </a>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">GPA計算</h1>
        </div>
      </header>

      <main className="pt-14 pb-24 max-w-2xl mx-auto px-4">

        {/* GPA card */}
        <div className="mt-4 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">現在のGPA</p>
          <p className="text-6xl font-bold text-blue-600 dark:text-blue-400">{currentGPA.toFixed(2)}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">（最大4.00）</p>
          {gradedCourses.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-3">成績が登録された授業がありません</p>
          )}
        </div>

        {/* Credits progress */}
        <div className="mt-4 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">取得単位数</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                {earnedCredits}
                <span className="text-sm font-normal text-gray-400 dark:text-gray-500"> / {requiredCredits}単位</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">卒業必要単位</p>
              <input
                type="number"
                value={reqInput}
                onChange={e => handleReqChange(e.target.value)}
                className="w-20 h-9 px-2 text-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="300"
              />
            </div>
          </div>
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: progress + "%" }}
            />
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 text-right">
            残り {Math.max(0, requiredCredits - earnedCredits)}単位
          </p>
        </div>

        {/* Simulation section */}
        <div className="mt-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            落としたら？シミュレーション
          </h2>
          {simulateFail && simulatedGPA !== null && (
            <div className="mb-3 p-4 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400 font-semibold">
                {courses.find(c => c.id === simulateFail)?.name} を落とした場合
              </p>
              <div className="flex items-center gap-4 mt-2">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">GPA</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{simulatedGPA.toFixed(2)}</p>
                  <p className="text-xs text-gray-400">（現在 {currentGPA.toFixed(2)}）</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">取得単位</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{simulatedEarned}</p>
                  <p className="text-xs text-gray-400">（現在 {earnedCredits}）</p>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-2">
            {courses.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">授業が登録されていません</p>
            )}
            {courses.map(course => {
              const isSelected = simulateFail === course.id;
              const credits = course.credits ?? 2;
              return (
                <button
                  key={course.id}
                  onClick={() => setSimulateFail(isSelected ? null : course.id)}
                  className={[
                    "w-full flex items-center justify-between p-3 rounded-xl border-2 text-left transition-colors",
                    isSelected
                      ? "border-red-400 bg-red-50 dark:bg-red-950/20"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600",
                  ].join(" ")}
                >
                  <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{course.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{credits}単位</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {course.grade && course.grade in GRADE_POINTS ? (
                      <span className={["text-xs px-2 py-0.5 rounded-full font-bold", GRADE_COLORS[course.grade] || "bg-gray-100 text-gray-600"].join(" ")}>
                        {course.grade}
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">
                        未評価
                      </span>
                    )}
                    {isSelected && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 font-medium">
                        落とす
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Grade distribution */}
        {gradedCourses.length > 0 && (
          <div className="mt-4 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">成績分布</h2>
            <div className="space-y-2">
              {(["S", "A", "B", "C", "D"] as const).map(g => {
                const count = courses.filter(c => c.grade === g).length;
                if (count === 0) return null;
                const pct = Math.round((count / gradedCourses.length) * 100);
                return (
                  <div key={g} className="flex items-center gap-3">
                    <span className={["text-xs font-bold w-6 text-center px-1 py-0.5 rounded", GRADE_COLORS[g]].join(" ")}>
                      {g}
                    </span>
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-400 rounded-full"
                        style={{ width: pct + "%" }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">{count}件 ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <BottomNav active="courses" />
    </div>
  );
}

function BottomNav({ active }: { active: "dashboard" | "calendar" | "courses" }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-2xl mx-auto flex h-16">
        <a
          href="/"
          className={[
            "flex-1 flex flex-col items-center justify-center gap-0.5 text-xs transition-colors",
            active === "dashboard"
              ? "text-blue-600 dark:text-blue-400"
              : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300",
          ].join(" ")}
        >
          <span className="text-xl">🏠</span>
          <span>ダッシュボード</span>
        </a>
        <a
          href="/calendar"
          className={[
            "flex-1 flex flex-col items-center justify-center gap-0.5 text-xs transition-colors",
            active === "calendar"
              ? "text-blue-600 dark:text-blue-400"
              : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300",
          ].join(" ")}
        >
          <span className="text-xl">📅</span>
          <span>カレンダー</span>
        </a>
        <a
          href="/courses"
          className={[
            "flex-1 flex flex-col items-center justify-center gap-0.5 text-xs transition-colors",
            active === "courses"
              ? "text-blue-600 dark:text-blue-400"
              : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300",
          ].join(" ")}
        >
          <span className="text-xl">📚</span>
          <span>授業管理</span>
        </a>
      </div>
    </nav>
  );
}