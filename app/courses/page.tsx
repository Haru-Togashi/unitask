"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";

type Course = {
  id: string;
  name: string;
  day_of_week: number;
  period: number;
  room: string | null;
  teacher: string | null;
  max_absences: number;
  credits: number;
  grade: string | null;
};

type Task = {
  id: string;
  title: string;
  course_id: string | null;
  due_date: string;
  task_type: "assignment" | "attendance" | "exam";
  is_completed: boolean;
};

type Attendance = {
  id: string;
  course_id: string;
  date: string;
  status: "present" | "absent" | "late";
};

type CourseForm = {
  name: string;
  day_of_week: number;
  period: number;
  room: string;
  teacher: string;
  max_absences: number;
  credits: number;
  grade: string;
};

const DAYS = ["月", "火", "水", "木", "金"];
const PERIODS = [1, 2, 3, 4, 5, 6];
const GRADES = ["S", "A", "B", "C", "D"];

const CELL_COLORS = [
  "bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100",
  "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-100",
  "bg-purple-100 dark:bg-purple-900/40 text-purple-900 dark:text-purple-100",
  "bg-orange-100 dark:bg-orange-900/40 text-orange-900 dark:text-orange-100",
  "bg-pink-100 dark:bg-pink-900/40 text-pink-900 dark:text-pink-100",
  "bg-teal-100 dark:bg-teal-900/40 text-teal-900 dark:text-teal-100",
  "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-900 dark:text-yellow-100",
  "bg-red-100 dark:bg-red-900/40 text-red-900 dark:text-red-100",
];
const BAR_COLORS = [
  "bg-blue-400", "bg-emerald-400", "bg-purple-400", "bg-orange-400",
  "bg-pink-400",  "bg-teal-400",   "bg-yellow-400", "bg-red-400",
];

const EMPTY_FORM: CourseForm = { name: "", day_of_week: 0, period: 1, room: "", teacher: "", max_absences: 5, credits: 2, grade: "" };

const STATUS_LABEL: Record<string, string> = { present: "出席", absent: "欠席", late: "遅刻" };
const STATUS_COLOR: Record<string, string> = {
  present: "text-emerald-600 dark:text-emerald-400",
  absent:  "text-red-600 dark:text-red-400",
  late:    "text-orange-600 dark:text-orange-400",
};

const TYPE_LABEL: Record<string, string> = {
  assignment: "課題",
  attendance: "出席",
  exam: "テスト",
};

export default function CoursesPage() {
  const supabase = createClient();
  const [courses, setCourses] = useState<Course[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [form, setForm] = useState<CourseForm>(EMPTY_FORM);

  const loadCourses = useCallback(async () => {
    const { data } = await supabase
      .from("courses")
      .select("*")
      .order("day_of_week")
      .order("period");
    if (data) setCourses(data);
  }, [supabase]);

  const loadTasks = useCallback(async () => {
    const { data } = await supabase
      .from("tasks")
      .select("id, title, course_id, due_date, task_type, is_completed")
      .order("due_date", { ascending: true });
    if (data) setTasks(data);
  }, [supabase]);

  const loadAttendances = useCallback(async () => {
    const { data } = await supabase
      .from("attendances")
      .select("*")
      .order("date", { ascending: false });
    if (data) setAttendances(data);
  }, [supabase]);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { window.location.href = "/login"; return; }
      loadCourses();
      loadTasks();
      loadAttendances();
    };
    init();
  }, [supabase, loadCourses, loadTasks, loadAttendances]);

  const openAddForm = (day?: number, period?: number) => {
    setForm({ ...EMPTY_FORM, day_of_week: day ?? 0, period: period ?? 1 });
    setEditingCourse(null);
    setShowForm(true);
  };

  const openEditForm = (course: Course) => {
    setForm({
      name: course.name,
      day_of_week: course.day_of_week,
      period: course.period,
      room: course.room ?? "",
      teacher: course.teacher ?? "",
      max_absences: course.max_absences,
      credits: course.credits ?? 2,
      grade: course.grade ?? "",
    });
    setEditingCourse(course);
    setSelectedCourse(null);
    setShowForm(true);
  };

  const saveCourse = async () => {
    if (!form.name) return;
    const { data: ud } = await supabase.auth.getUser();
    if (!ud.user) return;
    const payload = {
      name: form.name,
      day_of_week: form.day_of_week,
      period: form.period,
      room: form.room || null,
      teacher: form.teacher || null,
      max_absences: form.max_absences,
      credits: form.credits,
      grade: form.grade || null,
    };
    if (editingCourse) {
      await supabase.from("courses").update(payload).eq("id", editingCourse.id);
    } else {
      await supabase.from("courses").insert({ ...payload, user_id: ud.user.id });
    }
    setShowForm(false);
    setEditingCourse(null);
    loadCourses();
  };

  const deleteCourse = async (id: string) => {
    if (!window.confirm("この授業を削除しますか？")) return;
    await supabase.from("courses").delete().eq("id", id);
    setSelectedCourse(null);
    loadCourses();
    loadAttendances();
  };

  const recordAttendance = async (courseId: string, status: "present" | "absent" | "late") => {
    const { data: ud } = await supabase.auth.getUser();
    if (!ud.user) return;
    const today = new Date().toISOString().split("T")[0];
    const existing = attendances.find(a => a.course_id === courseId && a.date === today);
    if (existing) {
      await supabase.from("attendances").update({ status }).eq("id", existing.id);
    } else {
      await supabase.from("attendances").insert({
        course_id: courseId,
        user_id: ud.user.id,
        date: today,
        status,
      });
    }
    loadAttendances();
  };

  const getCourseColor = (course: Course) => CELL_COLORS[courses.indexOf(course) % CELL_COLORS.length];
  const getBarColor   = (course: Course) => BAR_COLORS[courses.indexOf(course) % BAR_COLORS.length];
  const getCourseAt   = (day: number, p: number) => courses.find(c => c.day_of_week === day && c.period === p);
  const getAbsentCount = (cid: string) => attendances.filter(a => a.course_id === cid && a.status === "absent").length;
  const getTodayRecord = (cid: string) => {
    const today = new Date().toISOString().split("T")[0];
    return attendances.find(a => a.course_id === cid && a.date === today);
  };
  const todayDow = new Date().getDay() - 1;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      <header className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">授業管理</h1>
          <div className="flex items-center gap-2">
            <a
              href="/gpa"
              className="text-sm px-3 py-1.5 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              GPA計算
            </a>
            <button
              onClick={() => openAddForm()}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              + 授業を追加
            </button>
          </div>
        </div>
      </header>

      <main className="pt-14 pb-24 max-w-2xl mx-auto">

        <div className="bg-white dark:bg-gray-900 mx-4 mt-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">時間割</h2>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-xs">
              <thead>
                <tr>
                  <th className="w-5 pb-1.5"></th>
                  {DAYS.map((d, i) => (
                    <th
                      key={i}
                      className={[
                        "pb-1.5 font-semibold text-center",
                        i === todayDow
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-gray-500 dark:text-gray-400",
                      ].join(" ")}
                    >
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map(p => (
                  <tr key={p}>
                    <td className="text-center text-gray-400 dark:text-gray-600 py-0.5 text-xs">{p}</td>
                    {[0, 1, 2, 3, 4].map(day => {
                      const course = getCourseAt(day, p);
                      return (
                        <td
                          key={day}
                          className={[
                            "p-0.5",
                            day === todayDow ? "bg-blue-50/60 dark:bg-blue-950/20" : "",
                          ].join(" ")}
                        >
                          {course ? (
                            <button
                              onClick={() => setSelectedCourse(course)}
                              className={[
                                "w-full h-11 rounded text-xs font-medium leading-tight px-1 overflow-hidden break-all",
                                getCourseColor(course),
                              ].join(" ")}
                            >
                              {course.name.length > 5 ? course.name.slice(0, 4) + "…" : course.name}
                            </button>
                          ) : (
                            <button
                              onClick={() => openAddForm(day, p)}
                              className="w-full h-11 rounded border border-dashed border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-400 text-base transition-colors"
                            >
                              +
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <section className="px-4 mt-5 space-y-3 pb-2">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">授業一覧</h2>

          {courses.length === 0 && (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">📖</p>
              <p className="text-gray-500 dark:text-gray-400">授業が登録されていません</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                時間割のマス目または「授業を追加」から登録できます
              </p>
            </div>
          )}

          {courses.map(course => {
            const absentCount = getAbsentCount(course.id);
            const remaining   = course.max_absences - absentCount;
            const pct         = Math.min((absentCount / course.max_absences) * 100, 100);
            const isDanger    = remaining <= 1;
            const todayRec    = getTodayRecord(course.id);
            const barColor    = getBarColor(course);
            const topColor    = getCourseColor(course).split(" ")[0];

            return (
              <div
                key={course.id}
                className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden"
              >
                <div className={["h-1", topColor].join(" ")} />
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{course.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {DAYS[course.day_of_week]}曜{course.period}限
                        {course.room    ? "　•　" + course.room    : ""}
                        {course.teacher ? "　•　" + course.teacher : ""}
                        {"　•　" + (course.credits ?? 2) + "単位"}
                        {course.grade ? "　•　" + course.grade : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedCourse(course)}
                      className="flex-shrink-0 text-xs text-blue-500 dark:text-blue-400 px-2 py-1 hover:underline"
                    >
                      詳細
                    </button>
                  </div>

                  <div className="mt-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400 dark:text-gray-500">欠席 {absentCount}/{course.max_absences}回</span>
                      <span className={isDanger ? "text-red-500 font-bold" : "text-gray-400 dark:text-gray-500"}>
                        {remaining <= 0 ? "⚠ 超過！" : "あと" + remaining + "回"}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={["h-full rounded-full transition-all", isDanger ? "bg-red-500" : barColor].join(" ")}
                        style={{ width: pct + "%" }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-400 dark:text-gray-500 mr-0.5">今日:</span>
                    {(["present", "absent", "late"] as const).map(s => {
                      const isActive = todayRec?.status === s;
                      const styles: Record<string, string> = {
                        present: isActive
                          ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                          : "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500",
                        absent: isActive
                          ? "border-red-400 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                          : "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500",
                        late: isActive
                          ? "border-orange-400 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                          : "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500",
                      };
                      return (
                        <button
                          key={s}
                          onClick={() => recordAttendance(course.id, s)}
                          className={["text-xs px-2.5 py-1 rounded-lg border transition-colors", styles[s]].join(" ")}
                        >
                          {STATUS_LABEL[s]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      </main>

      {showForm && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40 dark:bg-black/60"
            onClick={() => setShowForm(false)}
          />
          <div className="relative bg-white dark:bg-gray-900 rounded-t-2xl max-w-2xl w-full mx-auto p-6 pb-10 max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-5" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {editingCourse ? "授業を編集" : "授業を追加"}
            </h2>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="授業名 *（例：プログラミング基礎）"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                autoFocus
              />

              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">曜日</label>
                <div className="grid grid-cols-5 gap-2">
                  {DAYS.map((d, i) => (
                    <button
                      key={i}
                      onClick={() => setForm({ ...form, day_of_week: i })}
                      className={[
                        "h-11 rounded-xl text-sm font-medium border-2 transition-colors",
                        form.day_of_week === i
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                          : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400",
                      ].join(" ")}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">時限</label>
                <div className="grid grid-cols-6 gap-2">
                  {PERIODS.map(p => (
                    <button
                      key={p}
                      onClick={() => setForm({ ...form, period: p })}
                      className={[
                        "h-11 rounded-xl text-sm font-medium border-2 transition-colors",
                        form.period === p
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                          : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400",
                      ].join(" ")}
                    >
                      {p}限
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="text"
                placeholder="教室（例：301教室）"
                value={form.room}
                onChange={e => setForm({ ...form, room: e.target.value })}
                className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              />
              <input
                type="text"
                placeholder="教員名"
                value={form.teacher}
                onChange={e => setForm({ ...form, teacher: e.target.value })}
                className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              />

              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
                  最大欠席可能回数:{" "}
                  <span className="font-bold text-gray-900 dark:text-gray-100">{form.max_absences}回</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="15"
                  value={form.max_absences}
                  onChange={e => setForm({ ...form, max_absences: Number(e.target.value) })}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1回</span><span>15回</span>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
                  単位数:{" "}
                  <span className="font-bold text-gray-900 dark:text-gray-100">{form.credits}単位</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={form.credits}
                  onChange={e => setForm({ ...form, credits: Number(e.target.value) })}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1単位</span><span>8単位</span>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">成績</label>
                <div className="flex gap-2 flex-wrap">
                  {GRADES.map(g => (
                    <button
                      key={g}
                      onClick={() => setForm({ ...form, grade: form.grade === g ? "" : g })}
                      className={[
                        "w-12 h-11 rounded-xl text-sm font-bold border-2 transition-colors",
                        form.grade === g
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                          : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400",
                      ].join(" ")}
                    >
                      {g}
                    </button>
                  ))}
                  <button
                    onClick={() => setForm({ ...form, grade: "" })}
                    className={[
                      "px-3 h-11 rounded-xl text-sm border-2 transition-colors",
                      form.grade === ""
                        ? "border-gray-500 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                        : "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500",
                    ].join(" ")}
                  >
                    未評価
                  </button>
                </div>
              </div>

              <button
                onClick={saveCourse}
                disabled={!form.name}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-900/50 text-white disabled:text-white/60 font-semibold rounded-xl transition-colors text-base"
              >
                {editingCourse ? "更新する" : "追加する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedCourse && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40 dark:bg-black/60"
            onClick={() => setSelectedCourse(null)}
          />
          <div className="relative bg-white dark:bg-gray-900 rounded-t-2xl max-w-2xl w-full mx-auto p-6 pb-10 max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-5" />

            <div className="flex items-start justify-between mb-1">
              <div className="flex-1 min-w-0 pr-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selectedCourse.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {DAYS[selectedCourse.day_of_week]}曜{selectedCourse.period}限
                  {selectedCourse.room    ? "　•　" + selectedCourse.room    : ""}
                  {selectedCourse.teacher ? "　•　" + selectedCourse.teacher : ""}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {(selectedCourse.credits ?? 2) + "単位"}
                  {selectedCourse.grade ? "　•　成績: " + selectedCourse.grade : "　•　未評価"}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => openEditForm(selectedCourse)}
                  className="text-xs text-blue-500 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800"
                >
                  編集
                </button>
                <button
                  onClick={() => deleteCourse(selectedCourse.id)}
                  className="text-xs text-red-500 px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-800"
                >
                  削除
                </button>
              </div>
            </div>

            {(() => {
              const absent    = getAbsentCount(selectedCourse.id);
              const remaining = selectedCourse.max_absences - absent;
              const pct       = Math.min((absent / selectedCourse.max_absences) * 100, 100);
              const barColor  = getBarColor(selectedCourse);
              return (
                <div className={[
                  "mt-4 p-4 rounded-xl",
                  remaining <= 0 ? "bg-red-50 dark:bg-red-950/30" :
                  remaining <= 1 ? "bg-orange-50 dark:bg-orange-950/30" :
                                   "bg-gray-50 dark:bg-gray-800",
                ].join(" ")}>
                  <p className={[
                    "text-base font-bold",
                    remaining <= 0 ? "text-red-600 dark:text-red-400" :
                    remaining <= 1 ? "text-orange-600 dark:text-orange-400" :
                                     "text-gray-900 dark:text-gray-100",
                  ].join(" ")}>
                    {remaining <= 0
                      ? "⚠ 欠席上限を超えています！"
                      : remaining === 1
                        ? "あと1回しか休めません"
                        : "あと" + remaining + "回休めます"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    欠席 {absent}回 / 上限 {selectedCourse.max_absences}回
                  </p>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-2">
                    <div
                      className={["h-full rounded-full", remaining <= 1 ? "bg-red-500" : barColor].join(" ")}
                      style={{ width: pct + "%" }}
                    />
                  </div>
                </div>
              );
            })()}

            {/* Linked Tasks */}
            {(() => {
              const linked = tasks.filter(t => t.course_id === selectedCourse.id);
              if (linked.length === 0) return null;
              return (
                <div className="mt-5">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">関連タスク</h3>
                  <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800">
                    {linked.map((t, idx) => (
                      <div
                        key={t.id}
                        className={[
                          "flex justify-between items-center px-4 py-2.5 text-sm",
                          idx !== 0 ? "border-t border-gray-100 dark:border-gray-800" : "",
                          t.is_completed ? "opacity-50" : "",
                        ].join(" ")}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={["text-sm font-medium truncate", t.is_completed ? "line-through text-gray-400" : "text-gray-800 dark:text-gray-200"].join(" ")}>
                            {t.title}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {new Date(t.due_date).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" })}
                          </p>
                        </div>
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                          {TYPE_LABEL[t.task_type] || t.task_type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-5 mb-2">出席記録</h3>
            {(() => {
              const courseAtts = attendances.filter(a => a.course_id === selectedCourse.id);
              if (courseAtts.length === 0) {
                return <p className="text-sm text-gray-400 text-center py-6">記録がありません</p>;
              }
              return (
                <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800">
                  {courseAtts.map((a, idx) => (
                    <div
                      key={a.id}
                      className={[
                        "flex justify-between items-center px-4 py-2.5 text-sm",
                        idx !== 0 ? "border-t border-gray-100 dark:border-gray-800" : "",
                      ].join(" ")}
                    >
                      <span className="text-gray-600 dark:text-gray-400">{a.date}</span>
                      <span className={["font-medium", STATUS_COLOR[a.status]].join(" ")}>
                        {STATUS_LABEL[a.status]}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

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