"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";

type Task = {
  id: string;
  title: string;
  course_name: string;
  course_id: string | null;
  due_date: string;
  task_type: "assignment" | "attendance" | "exam";
  is_completed: boolean;
  recurrence: "none" | "weekly";
  recurrence_day: number | null;
};

type TaskForm = {
  title: string;
  course_name: string;
  course_id: string | null;
  due_date: string;
  task_type: "assignment" | "attendance" | "exam";
  recurrence: "none" | "weekly";
};

type Course = {
  id: string;
  name: string;
};

const TYPE_CONFIG = {
  assignment: { label: "課題",   bg: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
  attendance: { label: "出席",   bg: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" },
  exam:       { label: "テスト", bg: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300" },
};

const EMPTY_FORM: TaskForm = {
  title: "",
  course_name: "",
  course_id: null,
  due_date: "",
  task_type: "assignment",
  recurrence: "none",
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

function toLocalISO(isoString: string): string {
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

function CoursePicker({
  courses,
  form,
  mode,
  onChange,
  onMode,
}: {
  courses: Course[];
  form: TaskForm;
  mode: "pick" | "manual";
  onChange: (updates: Partial<TaskForm>) => void;
  onMode: (m: "pick" | "manual") => void;
}) {
  return (
    <div className="space-y-2">
      {courses.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {courses.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                onChange({ course_id: c.id, course_name: c.name });
                onMode("pick");
              }}
              className={[
                "px-3 py-1.5 rounded-xl text-sm font-medium border-2 transition-colors",
                form.course_id === c.id && mode === "pick"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800",
              ].join(" ")}
            >
              {c.name}
            </button>
          ))}
          <button
            onClick={() => {
              onChange({ course_id: null, course_name: "" });
              onMode("manual");
            }}
            className={[
              "px-3 py-1.5 rounded-xl text-sm font-medium border-2 transition-colors",
              mode === "manual"
                ? "border-gray-500 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                : "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500",
            ].join(" ")}
          >
            その他
          </button>
        </div>
      )}
      {(mode === "manual" || courses.length === 0) && (
        <input
          type="text"
          placeholder="授業名（例：プログラミング基礎）"
          value={form.course_name}
          onChange={(e) => onChange({ course_name: e.target.value, course_id: null })}
          className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
        />
      )}
    </div>
  );
}

function RecurrenceToggle({
  form,
  setForm,
}: {
  form: TaskForm;
  setForm: (f: TaskForm) => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={form.recurrence === "weekly"}
          onChange={(e) =>
            setForm({ ...form, recurrence: e.target.checked ? "weekly" : "none" })
          }
        />
        <div
          className={[
            "w-11 h-6 rounded-full transition-colors",
            form.recurrence === "weekly"
              ? "bg-blue-500"
              : "bg-gray-200 dark:bg-gray-700",
          ].join(" ")}
        />
        <div
          className={[
            "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
            form.recurrence === "weekly" ? "translate-x-5" : "translate-x-0",
          ].join(" ")}
        />
      </div>
      <span className="text-sm text-gray-700 dark:text-gray-300">毎週繰り返す</span>
    </label>
  );
}

export default function Dashboard() {
  const supabase = createClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const [addForm, setAddForm] = useState<TaskForm>(EMPTY_FORM);
  const [addMode, setAddMode] = useState<"pick" | "manual">("pick");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState<TaskForm>(EMPTY_FORM);
  const [editMode, setEditMode] = useState<"pick" | "manual">("pick");

  const loadTasks = useCallback(async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .order("due_date", { ascending: true });
    if (data) setTasks(data);
  }, [supabase]);

  const loadCourses = useCallback(async () => {
    const { data } = await supabase
      .from("courses")
      .select("id, name")
      .order("day_of_week")
      .order("period");
    if (data) setCourses(data);
  }, [supabase]);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        window.location.href = "/login";
        return;
      }
      loadTasks();
      loadCourses();
    };
    init();
    setIsDark(document.documentElement.classList.contains("dark"));
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
    }
  }, [supabase, loadTasks, loadCourses]);

  const toggleDark = () => {
    const html = document.documentElement;
    html.classList.toggle("dark");
    const next = html.classList.contains("dark");
    setIsDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const enableNotifications = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("お使いのブラウザはPush通知に対応していません。");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotifPermission(permission);
    if (permission !== "granted") return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
    } catch (err) {
      console.error("Push subscription failed:", err);
    }
  };

  const addTask = async () => {
    if (!addForm.title || !addForm.course_name || !addForm.due_date) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const dueDate = new Date(addForm.due_date);
    await supabase.from("tasks").insert({
      title: addForm.title,
      course_name: addForm.course_name,
      course_id: addForm.course_id,
      due_date: dueDate.toISOString(),
      task_type: addForm.task_type,
      recurrence: addForm.recurrence,
      recurrence_day: addForm.recurrence === "weekly" ? dueDate.getDay() : null,
      user_id: userData.user.id,
      is_completed: false,
    });
    setAddForm(EMPTY_FORM);
    setAddMode("pick");
    setShowForm(false);
    loadTasks();
  };

  const toggleComplete = async (task: Task) => {
    const nowCompleted = !task.is_completed;
    await supabase.from("tasks").update({ is_completed: nowCompleted }).eq("id", task.id);
    if (nowCompleted && task.recurrence === "weekly") {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const nextDue = new Date(task.due_date);
        nextDue.setDate(nextDue.getDate() + 7);
        await supabase.from("tasks").insert({
          title: task.title,
          course_name: task.course_name,
          course_id: task.course_id,
          due_date: nextDue.toISOString(),
          task_type: task.task_type,
          recurrence: task.recurrence,
          recurrence_day: task.recurrence_day,
          user_id: userData.user.id,
          is_completed: false,
        });
      }
    }
    loadTasks();
  };

  const deleteTask = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    if (editingTask?.id === id) setEditingTask(null);
    loadTasks();
  };

  const openEdit = (task: Task) => {
    setEditForm({
      title: task.title,
      course_name: task.course_name,
      course_id: task.course_id,
      due_date: toLocalISO(task.due_date),
      task_type: task.task_type,
      recurrence: task.recurrence ?? "none",
    });
    setEditMode(task.course_id ? "pick" : "manual");
    setEditingTask(task);
  };

  const saveEdit = async () => {
    if (!editingTask || !editForm.title || !editForm.course_name || !editForm.due_date) return;
    const dueDate = new Date(editForm.due_date);
    await supabase.from("tasks").update({
      title: editForm.title,
      course_name: editForm.course_name,
      course_id: editForm.course_id,
      due_date: dueDate.toISOString(),
      task_type: editForm.task_type,
      recurrence: editForm.recurrence,
      recurrence_day: editForm.recurrence === "weekly" ? dueDate.getDay() : null,
    }).eq("id", editingTask.id);
    setEditingTask(null);
    loadTasks();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const now = new Date();
  const todayStr = now.toDateString();
  const overdueTasks  = tasks.filter((t) => !t.is_completed && new Date(t.due_date) < now && new Date(t.due_date).toDateString() !== todayStr);
  const todayTasks    = tasks.filter((t) => !t.is_completed && new Date(t.due_date).toDateString() === todayStr);
  const upcomingTasks = tasks.filter((t) => !t.is_completed && new Date(t.due_date) > now && new Date(t.due_date).toDateString() !== todayStr);
  const completedTasks = tasks.filter((t) => t.is_completed);
  const urgentCount   = overdueTasks.length + todayTasks.length;

  void notifPermission;

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
              onClick={enableNotifications}
              className="text-sm px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-lg"
            >
              🔔 通知ON
            </button>
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
                <TaskCard key={task.id} task={task} urgency="overdue" onToggle={toggleComplete} onDelete={deleteTask} onEdit={openEdit} />
              ))}
            </div>
          </section>
        )}

        {todayTasks.length > 0 && (
          <section className="mt-5">
            <SectionHeader label="今日が締切" count={todayTasks.length} color="text-orange-600 dark:text-orange-400" />
            <div className="space-y-2 mt-2">
              {todayTasks.map((task) => (
                <TaskCard key={task.id} task={task} urgency="today" onToggle={toggleComplete} onDelete={deleteTask} onEdit={openEdit} />
              ))}
            </div>
          </section>
        )}

        {upcomingTasks.length > 0 && (
          <section className="mt-5">
            <SectionHeader label="今後の予定" count={upcomingTasks.length} color="text-gray-700 dark:text-gray-300" />
            <div className="space-y-2 mt-2">
              {upcomingTasks.map((task) => (
                <TaskCard key={task.id} task={task} urgency="upcoming" onToggle={toggleComplete} onDelete={deleteTask} onEdit={openEdit} />
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
                  <TaskCard key={task.id} task={task} urgency="completed" onToggle={toggleComplete} onDelete={deleteTask} onEdit={openEdit} />
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
        onClick={() => { setAddForm(EMPTY_FORM); setAddMode("pick"); setShowForm(true); }}
        className="fixed bottom-20 right-4 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white text-3xl font-light rounded-full shadow-lg flex items-center justify-center z-40 transition-colors active:scale-95"
        aria-label="タスクを追加"
      >
        +
      </button>

      {showForm && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={() => setShowForm(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-t-2xl max-w-2xl w-full mx-auto p-6 pb-10 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-5" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">タスクを追加</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="タスク名（例：レポート提出）"
                value={addForm.title}
                onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                autoFocus
              />
              <CoursePicker
                courses={courses}
                form={addForm}
                mode={addMode}
                onChange={(u) => setAddForm({ ...addForm, ...u })}
                onMode={setAddMode}
              />
              <input
                type="datetime-local"
                value={addForm.due_date}
                onChange={(e) => setAddForm({ ...addForm, due_date: e.target.value })}
                className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              />
              <div className="grid grid-cols-3 gap-2">
                {(["assignment", "attendance", "exam"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setAddForm({ ...addForm, task_type: type })}
                    className={[
                      "h-11 rounded-xl text-sm font-medium border-2 transition-colors",
                      addForm.task_type === type
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800",
                    ].join(" ")}
                  >
                    {TYPE_CONFIG[type].label}
                  </button>
                ))}
              </div>
              <RecurrenceToggle form={addForm} setForm={setAddForm} />
              <button
                onClick={addTask}
                disabled={!addForm.title || !addForm.course_name || !addForm.due_date}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-900/50 text-white disabled:text-white/60 font-semibold rounded-xl transition-colors text-base"
              >
                追加する
              </button>
            </div>
          </div>
        </div>
      )}

      {editingTask && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={() => setEditingTask(null)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-t-2xl max-w-2xl w-full mx-auto p-6 pb-10 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-5" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">タスクを編集</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="タスク名"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                autoFocus
              />
              <CoursePicker
                courses={courses}
                form={editForm}
                mode={editMode}
                onChange={(u) => setEditForm({ ...editForm, ...u })}
                onMode={setEditMode}
              />
              <input
                type="datetime-local"
                value={editForm.due_date}
                onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              />
              <div className="grid grid-cols-3 gap-2">
                {(["assignment", "attendance", "exam"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setEditForm({ ...editForm, task_type: type })}
                    className={[
                      "h-11 rounded-xl text-sm font-medium border-2 transition-colors",
                      editForm.task_type === type
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800",
                    ].join(" ")}
                  >
                    {TYPE_CONFIG[type].label}
                  </button>
                ))}
              </div>
              <RecurrenceToggle form={editForm} setForm={setEditForm} />
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => deleteTask(editingTask.id)}
                  className="flex-1 h-12 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-semibold rounded-xl transition-colors text-base border border-red-200 dark:border-red-800"
                >
                  削除
                </button>
                <button
                  onClick={saveEdit}
                  disabled={!editForm.title || !editForm.course_name || !editForm.due_date}
                  className="flex-[2] h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-900/50 text-white disabled:text-white/60 font-semibold rounded-xl transition-colors text-base"
                >
                  保存する
                </button>
              </div>
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
  onEdit,
}: {
  task: Task;
  urgency: "overdue" | "today" | "upcoming" | "completed";
  onToggle: (task: Task) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
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

      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => onEdit(task)}
      >
        <p className={["font-medium text-sm leading-snug", task.is_completed ? "line-through text-gray-400" : "text-gray-900 dark:text-gray-100"].join(" ")}>
          {task.title}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
          {task.course_name}
          {task.recurrence === "weekly" && <span className="ml-1">🔄</span>}
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