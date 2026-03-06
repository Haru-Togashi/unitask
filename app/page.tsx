"use client";

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

type NewTask = {
  title: string;
  course_name: string;
  due_date: string;
  task_type: "assignment" | "attendance" | "exam";
};

const TYPE_CONFIG = {
  assignment: { label: "課題",   bg: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
  attendance: { label: "出席",   bg: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" },
  exam:       { label: "テスト", bg: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300" },
};

function getRelativeTime(dueDate: string): string {
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  if (diffMs < 0) return "期限切れ";
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "まもなく";
  if (diffHours < 24) return String(diffHours) + "時間後";
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return String(diffDays) + "日後";
}

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

export default function Dashboard() {
  const supabase = createClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [newTask, setNewTask] = useState<NewTask>({
    title: "",
    course_name: "",
    due_date: "",
    task_type: "assignment",
  });

  const loadTasks = useCallback(async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .order("due_date", { ascending: true });
    if (data) setTasks(data);
  }, [supabase]);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        window.location.href = "/login";
        return;
      }
      loadTasks();
    };
    init();
    setIsDark(document.documentElement.classList.contains("dark"));
  }, [supabase, loadTasks]);

  const toggleDark = () => {
    const html = document.documentElement;
    html.classList.toggle("dark");
    const next = html.classList.contains("dark");
    setIsDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const addTask = async () => {
    if (!newTask.title || !newTask.course_name || !newTask.due_date) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from("tasks").insert({
      ...newTask,
      due_date: new Date(newTask.due_date).toISOString(),
      user_id: userData.user.id,
      is_completed: false,
    });
    setNewTask({ title: "", course_name: "", due_date: "", task_type: "assignment" });
    setShowForm(false);
    loadTasks();
  };

  const toggleComplete = async (task: Task) => {
    await supabase.from("tasks").update({ is_completed: !task.is_completed }).eq("id", task.id);
    loadTasks();
  };

  const deleteTask = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    loadTasks();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const now = new Date();
  const todayStr = now.toDateString();

  const overdueTasks = tasks.filter(
    (t) => !t.is_completed && new Date(t.due_date) < now && new Date(t.due_date).toDateString() !== todayStr
  );
  const todayTasks = tasks.filter(
    (t) => !t.is_completed && new Date(t.due_date).toDateString() === todayStr
  );
  const upcomingTasks = tasks.filter(
    (t) => !t.is_completed && new Date(t.due_date) > now && new Date(t.due_date).toDateString() !== todayStr
  );
  const completedTasks = tasks.filter((t) => t.is_completed);
  const urgentCount = overdueTasks.length + todayTasks.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-blue-600 dark:text-blue-400">UniTask</h1>
            {urgentCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-red-500 text-white rounded-full">
                {urgentCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleDark}
              className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="ダークモード切替"
            >
              {isDark ? "☀️" : "🌙"}
            </button>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 px-2 py-1"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="pt-14 pb-24 max-w-2xl mx-auto px-4">
        {urgentCount > 0 && (
          <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900">
            <span className="text-2xl flex-shrink-0">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                {overdueTasks.length > 0 && ("期限切れ " + overdueTasks.length + "件")}
                {overdueTasks.length > 0 && todayTasks.length > 0 && "、"}
                {todayTasks.length > 0 && ("今日締切 " + todayTasks.length + "件")}
              </p>
              <p className="text-xs text-red-500 mt-0.5">今すぐ確認してください</p>
            </div>
          </div>
        )}

        {overdueTasks.length > 0 && (
          <section className="mt-5">
            <SectionHeader label="期限切れ" count={overdueTasks.length} color="text-red-600 dark:text-red-400" />
            <div className="space-y-2 mt-2">
              {overdueTasks.map((task) => (
                <TaskCard key={task.id} task={task} urgency="overdue" onToggle={toggleComplete} onDelete={deleteTask} />
              ))}
            </div>
          </section>
        )}

        {todayTasks.length > 0 && (
          <section className="mt-5">
            <SectionHeader label="今日が締切" count={todayTasks.length} color="text-orange-600 dark:text-orange-400" />
            <div className="space-y-2 mt-2">
              {todayTasks.map((task) => (
                <TaskCard key={task.id} task={task} urgency="today" onToggle={toggleComplete} onDelete={deleteTask} />
              ))}
            </div>
          </section>
        )}

        {upcomingTasks.length > 0 && (
          <section className="mt-5">
            <SectionHeader label="今後の予定" count={upcomingTasks.length} color="text-gray-700 dark:text-gray-300" />
            <div className="space-y-2 mt-2">
              {upcomingTasks.map((task) => (
                <TaskCard key={task.id} task={task} urgency="upcoming" onToggle={toggleComplete} onDelete={deleteTask} />
              ))}
            </div>
          </section>
        )}

        {completedTasks.length > 0 && (
          <section className="mt-5">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 py-1"
            >
              <span>{showCompleted ? "▲" : "▼"}</span>
              完了済み ({completedTasks.length}件)
            </button>
            {showCompleted && (
              <div className="space-y-2 mt-2">
                {completedTasks.map((task) => (
                  <TaskCard key={task.id} task={task} urgency="completed" onToggle={toggleComplete} onDelete={deleteTask} />
                ))}
              </div>
            )}
          </section>
        )}

        {tasks.length === 0 && (
          <div className="mt-20 text-center">
            <p className="text-5xl mb-4">📚</p>
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">タスクはありません</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">右下の＋ボタンでタスクを追加しましょう</p>
          </div>
        )}
      </main>

      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white text-3xl font-light rounded-full shadow-lg flex items-center justify-center z-40 transition-colors active:scale-95"
        aria-label="タスクを追加"
      >
        +
      </button>

      {showForm && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={() => setShowForm(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-t-2xl max-w-2xl w-full mx-auto p-6 pb-10 shadow-xl">
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-5" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">タスクを追加</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="タスク名（例：レポート提出）"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                autoFocus
              />
              <input
                type="text"
                placeholder="授業名（例：プログラミング基礎）"
                value={newTask.course_name}
                onChange={(e) => setNewTask({ ...newTask, course_name: e.target.value })}
                className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              />
              <input
                type="datetime-local"
                value={newTask.due_date}
                onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              />
              <div className="grid grid-cols-3 gap-2">
                {(["assignment", "attendance", "exam"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setNewTask({ ...newTask, task_type: type })}
                    className={[
                      "h-11 rounded-xl text-sm font-medium border-2 transition-colors",
                      newTask.task_type === type
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800",
                    ].join(" ")}
                  >
                    {TYPE_CONFIG[type].label}
                  </button>
                ))}
              </div>
              <button
                onClick={addTask}
                disabled={!newTask.title || !newTask.course_name || !newTask.due_date}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-900/50 text-white disabled:text-white/60 font-semibold rounded-xl transition-colors text-base"
              >
                追加する
              </button>
            </div>
          </div>
        </div>
      )}
      <BottomNav active="dashboard" />
    </div>
  );
}

function SectionHeader({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <h2 className={["text-sm font-semibold", color].join(" ")}>{label}</h2>
      <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
        {count}
      </span>
    </div>
  );
}

function TaskCard({
  task,
  urgency,
  onToggle,
  onDelete,
}: {
  task: Task;
  urgency: "overdue" | "today" | "upcoming" | "completed";
  onToggle: (task: Task) => void;
  onDelete: (id: string) => void;
}) {
  const borderColors: Record<string, string> = {
    overdue:   "border-l-red-500",
    today:     "border-l-orange-400",
    upcoming:  "border-l-blue-400",
    completed: "border-l-gray-200",
  };
  const timeColors: Record<string, string> = {
    overdue:   "text-red-500",
    today:     "text-orange-500",
    upcoming:  "text-gray-400 dark:text-gray-500",
    completed: "",
  };
  const cfg = TYPE_CONFIG[task.task_type];

  return (
    <div
      className={[
        "flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 border-l-4",
        borderColors[urgency],
        task.is_completed ? "opacity-50" : "",
      ].join(" ")}
    >
      <button
        onClick={() => onToggle(task)}
        className={[
          "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
          task.is_completed
            ? "bg-blue-500 border-blue-500 text-white"
            : "border-gray-300 dark:border-gray-600 hover:border-blue-400",
        ].join(" ")}
        aria-label={task.is_completed ? "未完了に戻す" : "完了にする"}
      >
        {task.is_completed && <span className="text-xs">✓</span>}
      </button>

      <div className="flex-1 min-w-0">
        <p className={["font-medium text-sm leading-snug", task.is_completed ? "line-through text-gray-400" : "text-gray-900 dark:text-gray-100"].join(" ")}>
          {task.title}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
          {task.course_name}
          {!task.is_completed && <span className="ml-1.5">・ {formatDateTime(task.due_date)}</span>}
        </p>
      </div>

      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        <span className={["text-xs px-2 py-0.5 rounded-full font-medium", cfg.bg].join(" ")}>
          {cfg.label}
        </span>
        {!task.is_completed && timeColors[urgency] && (
          <span className={["text-xs font-medium", timeColors[urgency]].join(" ")}>
            {getRelativeTime(task.due_date)}
          </span>
        )}
      </div>

      <button
        onClick={() => onDelete(task.id)}
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-500 transition-colors rounded-lg"
        aria-label="削除"
      >
        ✕
      </button>
    </div>
  );
}

function BottomNav({ active }: { active: "dashboard" | "courses" }) {
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
