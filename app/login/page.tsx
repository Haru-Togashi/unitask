"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type Task = {
  id: string;
  title: string;
  course_name: string;
  due_date: string;
  task_type: "assignment" | "attendance" | "exam";
  is_completed: boolean;
};

export default function Dashboard() {
  const supabase = createClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userName, setUserName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    course_name: "",
    due_date: "",
    task_type: "assignment" as const,
  });

  useEffect(() => {
    checkUser();
    loadTasks();
  }, []);

  const checkUser = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      window.location.href = "/login";
      return;
    }
    setUserName(data.user.email || "");
  };

  const loadTasks = async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .order("due_date", { ascending: true });
    if (data) setTasks(data);
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
    await supabase
      .from("tasks")
      .update({ is_completed: !task.is_completed })
      .eq("id", task.id);
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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "assignment": return "課題";
      case "attendance": return "出席";
      case "exam": return "テスト";
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "assignment": return "bg-blue-100 text-blue-800";
      case "attendance": return "bg-green-100 text-green-800";
      case "exam": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() ;
  };

  const todayTasks = tasks.filter(
    (t) => !t.is_completed && new Date(t.due_date).toDateString() === new Date().toDateString()
  );

  const upcomingTasks = tasks.filter(
    (t) => !t.is_completed && new Date(t.due_date) > new Date()
  );

  const overdueTasks = tasks.filter(
    (t) => !t.is_completed && isOverdue(t.due_date) && new Date(t.due_date).toDateString() !== new Date().toDateString()
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-600">UniTask</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{userName}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <button
          onClick={() => setShowForm(!showForm)}
          className="mb-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + タスクを追加
        </button>

        {showForm && (
          <div className="mb-6 p-4 bg-white rounded-lg shadow-md">
            <h2 className="text-lg font-semibold mb-3">新しいタスク</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="タスク名（例：レポート提出）"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <input
                type="text"
                placeholder="授業名（例：プログラミング基礎）"
                value={newTask.course_name}
                onChange={(e) => setNewTask({ ...newTask, course_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <input
                type="datetime-local"
                value={newTask.due_date}
                onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <select
                value={newTask.task_type}
                onChange={(e) => setNewTask({ ...newTask, task_type: e.target.value as "assignment" | "attendance" | "exam" })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="assignment">課題</option>
                <option value="attendance">出席</option>
                <option value="exam">テスト</option>
              </select>
              <div className="flex gap-2">
                <button
                  onClick={addTask}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  追加する
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}

        {overdueTasks.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-red-600 mb-3">期限切れ</h2>
            <div className="space-y-2">
              {overdueTasks.map((task) => (
                <TaskCard key={task.id} task={task} onToggle={toggleComplete} onDelete={deleteTask} getTypeLabel={getTypeLabel} getTypeColor={getTypeColor} />
              ))}
            </div>
          </section>
        )}

        {todayTasks.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-orange-600 mb-3">今日が期限</h2>
            <div className="space-y-2">
              {todayTasks.map((task) => (
                <TaskCard key={task.id} task={task} onToggle={toggleComplete} onDelete={deleteTask} getTypeLabel={getTypeLabel} getTypeColor={getTypeColor} />
              ))}
            </div>
          </section>
        )}

        {upcomingTasks.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">今後の予定</h2>
            <div className="space-y-2">
              {upcomingTasks.map((task) => (
                <TaskCard key={task.id} task={task} onToggle={toggleComplete} onDelete={deleteTask} getTypeLabel={getTypeLabel} getTypeColor={getTypeColor} />
              ))}
            </div>
          </section>
        )}

        {tasks.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">まだタスクがありません</p>
            <p className="text-sm mt-1">「+ タスクを追加」から始めましょう</p>
          </div>
        )}
      </main>
    </div>
  );
}

function TaskCard({ task, onToggle, onDelete, getTypeLabel, getTypeColor }: {
  task: Task;
  onToggle: (task: Task) => void;
  onDelete: (id: string) => void;
  getTypeLabel: (type: string) => string;
  getTypeColor: (type: string) => string;
}) {
  const dueDate = new Date(task.due_date);
  const formatted = `${dueDate.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })} ${dueDate.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`;

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
      <input
        type="checkbox"
        checked={task.is_completed}
        onChange={() => onToggle(task)}
        className="w-5 h-5"
      />
      <div className="flex-1">
        <p className="font-medium">{task.title}</p>
        <p className="text-sm text-gray-500">{task.course_name} ・ {formatted}</p>
      </div>
      <span className={`text-xs px-2 py-1 rounded-full ${getTypeColor(task.task_type)}`}>
        {getTypeLabel(task.task_type)}
      </span>
      <button
        onClick={() => onDelete(task.id)}
        className="text-gray-400 hover:text-red-500 text-sm"
      >
        削除
      </button>
    </div>
  );
}