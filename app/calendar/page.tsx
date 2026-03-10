"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";

type Task = {
  id: string;
  title: string;
  course_name: string;
  due_date: string;
  task_type: "assignment" | "attendance" | "exam";
  is_completed: boolean;
};

const TYPE_CONFIG = {
  assignment: { label: "課題",   bg: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300", dot: "bg-blue-500" },
  attendance: { label: "出席",   bg: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300", dot: "bg-green-500" },
  exam:       { label: "テスト", bg: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300", dot: "bg-purple-500" },
};

const DOW = ["日", "月", "火", "水", "木", "金", "土"];

function formatDateTime(dueDate: string): string {
  const d = new Date(dueDate);
  return d.toLocaleDateString("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .order("due_date", { ascending: true });
    if (data) setTasks(data);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { window.location.href = "/login"; return; }
      loadTasks();
    };
    init();
  }, [loadTasks]);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentYear(y => y - 1); setCurrentMonth(11); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentYear(y => y + 1); setCurrentMonth(0); }
    else setCurrentMonth(m => m + 1);
  };

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const getTasksForDate = (dateStr: string) =>
    tasks.filter(t => t.due_date.slice(0, 10) === dateStr);

  const toDateStr = (day: number) => {
    const m = String(currentMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return currentYear + "-" + m + "-" + d;
  };

  const todayStr = today.getFullYear() + "-" +
    String(today.getMonth() + 1).padStart(2, "0") + "-" +
    String(today.getDate()).padStart(2, "0");

  const selectedTasks = selectedDate ? getTasksForDate(selectedDate) : [];

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 text-lg">
            ‹
          </button>
          <h1 className="text-base font-bold text-gray-900 dark:text-gray-100">
            {currentYear}年{currentMonth + 1}月
          </h1>
          <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 text-lg">
            ›
          </button>
        </div>
      </header>

      <main className="pt-14 pb-24 max-w-2xl mx-auto px-4">
        <div className="mt-4 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-3">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DOW.map((d, i) => (
              <div
                key={d}
                className={[
                  "text-center text-xs font-semibold py-1",
                  i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-gray-500 dark:text-gray-400",
                ].join(" ")}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((day, idx) => {
              if (day === null) return <div key={"empty-" + idx} />;
              const dateStr = toDateStr(day);
              const dayTasks = getTasksForDate(dateStr);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const dow = (firstDay + day - 1) % 7;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(selectedDate === dateStr ? null : dateStr)}
                  className={[
                    "flex flex-col items-center py-1 rounded-lg transition-colors",
                    isSelected ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium",
                      isToday ? "bg-blue-600 text-white" :
                      dow === 0 ? "text-red-500" :
                      dow === 6 ? "text-blue-500" :
                      "text-gray-700 dark:text-gray-300",
                    ].join(" ")}
                  >
                    {day}
                  </span>
                  <div className="flex gap-0.5 mt-0.5 h-2 items-center">
                    {dayTasks.slice(0, 3).map((t, i) => (
                      <span
                        key={i}
                        className={["w-1.5 h-1.5 rounded-full", TYPE_CONFIG[t.task_type].dot].join(" ")}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {selectedDate && (
          <div className="mt-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {new Date(selectedDate + "T12:00:00").toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
              のタスク
            </h2>
            {selectedTasks.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">この日のタスクはありません</p>
            ) : (
              <div className="space-y-2">
                {selectedTasks.map(task => {
                  const cfg = TYPE_CONFIG[task.task_type];
                  return (
                    <div
                      key={task.id}
                      className={[
                        "flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800",
                        task.is_completed ? "opacity-50" : "",
                      ].join(" ")}
                    >
                      <span className={["w-2 h-2 rounded-full flex-shrink-0", cfg.dot].join(" ")} />
                      <div className="flex-1 min-w-0">
                        <p className={["font-medium text-sm", task.is_completed ? "line-through text-gray-400" : "text-gray-900 dark:text-gray-100"].join(" ")}>
                          {task.title}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {task.course_name}　・　{formatDateTime(task.due_date)}
                        </p>
                      </div>
                      <span className={["text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0", cfg.bg].join(" ")}>
                        {cfg.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!selectedDate && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">今月のタスク</h2>
            {(() => {
              const monthStr = currentYear + "-" + String(currentMonth + 1).padStart(2, "0");
              const monthTasks = tasks.filter(t => t.due_date.startsWith(monthStr));
              if (monthTasks.length === 0) {
                return <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">今月のタスクはありません</p>;
              }
              return (
                <div className="space-y-2">
                  {monthTasks.slice(0, 10).map(task => {
                    const cfg = TYPE_CONFIG[task.task_type];
                    return (
                      <div
                        key={task.id}
                        className={[
                          "flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800",
                          task.is_completed ? "opacity-50" : "",
                        ].join(" ")}
                      >
                        <span className={["w-2 h-2 rounded-full flex-shrink-0", cfg.dot].join(" ")} />
                        <div className="flex-1 min-w-0">
                          <p className={["font-medium text-sm", task.is_completed ? "line-through text-gray-400" : "text-gray-900 dark:text-gray-100"].join(" ")}>
                            {task.title}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {task.course_name}　・　{formatDateTime(task.due_date)}
                          </p>
                        </div>
                        <span className={["text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0", cfg.bg].join(" ")}>
                          {cfg.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </main>

      <BottomNav active="calendar" />
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