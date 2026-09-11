import type { NewCommitInput, NewDayScheduleInput, NewProjectInput, NewCalendarMemoInput } from "./api-types";
import type { Project, ApiProjectResponse, Commit, DaySchedule, CalendarMemo } from "./types";

const BASE_URL = 'http://localhost:3001/api/v1';

// コミットを取得する API
export const loadCommits = async (): Promise<Commit[]> => {
  try {
    const response = await fetch(`${BASE_URL}/commits`);

    if (!response.ok) {
      throw new Error(`HTTPエラー! status: ${response.status}`);
    }

    const rawData = await response.json();

    console.log("送られたデータ : ", rawData);

    const commits: Commit[] = rawData.map((item: any) => {
      // 1. ISO文字列 (または数数値) を Date オブジェクト経由でミリ秒数値に変換
      const startedAtMs = typeof item.startedAt === 'number' 
        ? item.startedAt 
        : new Date(item.startedAt).getTime();

      const endedAtMs = typeof item.endedAt === 'number' 
        ? item.endedAt 
        : new Date(item.endedAt).getTime();

      // 2. durationMs が null / NaN / undefined の場合は、ミリ秒の差分から自動計算
      const computedDuration = 
        typeof item.durationMs === 'number' && !isNaN(item.durationMs)
          ? item.durationMs
          : endedAtMs - startedAtMs;

      return {
        id: item.id,
        projectId: item.projectId,
        startedAt: startedAtMs,
        endedAt: endedAtMs,
        durationMs: computedDuration,
        note: item.note,
        image: item.image ?? null,
      };
    });

    console.log("取得データ: ", commits);

    return commits;
  } catch (error) {
    console.error("コミット一覧の取得に失敗しました:", error);
    return [];
  }
};

export const createCommit = async (inputData: NewCommitInput): Promise<Commit | null> => {
  try {
    const formData = new FormData();

    formData.append('commit[project_id]', inputData.projectId);
    // ⭕️ 数値(ミリ秒)を ISO 8601 文字列 ("2026-09-09T10:00:00.000Z") に変換
    const startedAtIso = new Date(inputData.startedAt).toISOString();
    const endedAtIso = new Date(inputData.endedAt).toISOString();

    formData.append('commit[started_at]', startedAtIso);
    formData.append('commit[ended_at]', endedAtIso);

    if (inputData.note) {
      formData.append('commit[note]', inputData.note);
    }

    if (inputData.image?.blob) {
      formData.append('commit[image]', inputData.image.blob, inputData.image.name);
    }

    console.log("送信する FormData の中身:");
    for (const [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }

    // ⭕️ URL スラッシュを追加 (/projects/:id/commits)
    const response = await fetch(`${BASE_URL}/projects/${inputData.projectId}/commits`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      alert(`作成に失敗しました:\n${data.errors?.join('\n')}`);
      return null;
    }

    return data;
  } catch (error) {
    console.error('通信エラー:', error);
    return null;
  }
};

export const deleteCommit = async (id:string): Promise<boolean> =>{
    try {
    const response = await fetch(`${BASE_URL}/commits/${id}`, {
      method: "DELETE", 
    });

    if (!response.ok) {
      console.error(`削除失敗: ${response.status} ${response.statusText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("ネットワークエラー！:", error);
    return false;
  }
}

// プロジェクトを取得する API
export const loadProjects = async (): Promise<Project[]> => {
  try {
    const response = await fetch(`${BASE_URL}/projects`);
    
    if (!response.ok) {
      throw new Error(`HTTPエラー! status: ${response.status}`);
    }

    const rawData: ApiProjectResponse[] = await response.json();

    const projects: Project[] = rawData.map((item) => ({
      id: item.id,
      name: item.name,
      dueDate: item.due_date ?? undefined,
      memo: item.memo ?? undefined,
      createdAt: new Date(item.created_at).getTime(),
      targetHours: item.target_hours,
      pomodoroWorkMinutes: item.pomodoro_work_minutes,
      pomodoroBreakMinutes: item.pomodoro_break_minutes,
      completed: item.completed,
    }));

    return projects;
  } catch (error) {
    console.error("エラー発生:", error);
    return [];
  }
};

// プロジェクトを新規作成する API
export const createProject = async (inputData: NewProjectInput): Promise<Project | null> => {
  try {
    const response = await fetch(`${BASE_URL}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project: {
          name: inputData.name,
          dueDate: inputData.dueDate,
          completed: false,
          memo: inputData.memo,
          targetHours: inputData.targetHours,
          pomodoroBreakMinutes: inputData.pomodoroBreakMinutes,
          pomodoroWorkMinutes: inputData.pomodoroWorkMinutes,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = Array.isArray(data.errors)
        ? data.errors.join('\n')
        : data.error || data.message || "予期せぬエラーが発生しました";

      alert(`作成に失敗しました:\n${errorMessage}`);
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      dueDate: data.due_date ?? undefined,
      memo: data.memo ?? undefined,
      createdAt: new Date(data.created_at).getTime(),
      targetHours: data.target_hours,
      pomodoroWorkMinutes: data.pomodoro_work_minutes,
      pomodoroBreakMinutes: data.pomodoro_break_minutes,
      completed: data.completed,
    };
  } catch (error) {
    console.error('通信エラー:', error);
    alert('サーバーとの通信に失敗しました');
    return null;
  }
};

export const updateProject = async (inputData:Project): Promise<Project | null> =>{
  try{
    const response = await fetch(`${BASE_URL}/projects/${inputData.id}`,{
      method:"PATCH",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project: {
          name: inputData.name,
          due_date: inputData.dueDate,
          completed: inputData.completed ?? false,
          memo: inputData.memo,
          target_hours: inputData.targetHours,
          // Rails 側で秒(sec)または分(minutes)どちらで受け取るかに合わせてキー名を調整
          pomodoro_work_minutes: inputData.pomodoroWorkMinutes,
          pomodoro_break_minutes: inputData.pomodoroBreakMinutes,
        },
      }),
    });

    if (!response.ok) {
      console.error("Project update failed:", response.status, response.statusText);
      return null;
    }

    // 💡 成功時はレスポンスの JSON データを返す
    const updatedProject: Project = await response.json();
    return updatedProject;
  } catch (error) {
    console.error("Error in updateProject:", error);
    return null;
  }
};

export const deleteProject = async (id:string): Promise<boolean> => {
    try {
    const response = await fetch(`${BASE_URL}/projects/${id}`, {
      method: "DELETE", 
    });

    if (!response.ok) {
      console.error(`削除失敗: ${response.status} ${response.statusText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("ネットワークエラー！:", error);
    return false;
  }
}

export const loadDaySchedules = async (): Promise<DaySchedule[]> => {
  try {
    const response = await fetch(`${BASE_URL}/day_schedules`);

    if (!response.ok) {
      throw new Error(`httpエラー status: ${response.status}`);
    }

    const rawData = await response.json();

    // ⭕️ item.start_hour (スネークケース) から受け取って TS 型に変換
    const daySchedules: DaySchedule[] = rawData.map((item: any) => ({
      id: item.id,
      date: item.date,
      title: item.title,
      startHour: item.start_hour,
      startMinute: item.start_minute,
      endHour: item.end_hour,
      endMinute: item.end_minute,
    }));

    return daySchedules;
  } catch (error) {
    console.error("error ： ", error);
    return [];
  }
};

export const createDaySchedules = async (inputData: NewDayScheduleInput): Promise<DaySchedule | null> => {
  try {
    const response = await fetch(`${BASE_URL}/day_schedules`, {
      method: `POST`,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        day_schedule: {
          date: inputData.date,
          title: inputData.title,
          start_hour: inputData.startHour,
          start_minute: inputData.startMinute,
          end_hour: inputData.endHour,
          end_minute: inputData.endMinute
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = Array.isArray(data.errors)
        ? data.errors.join('\n')
        : data.error || data.message || "予期せぬエラーが発生しました";

      alert(`作成に失敗しました:\n${errorMessage}`);
      return null;
    }

    return {
      id: data.id,
      date: data.date,
      title: data.title,
      startHour: data.start_hour,
      startMinute: data.start_minute,
      endHour: data.end_hour,
      endMinute: data.end_minute
    };
  } catch (error) {
    console.error("API通信エラー:", error);
    return null;
  }
};

export const loadCalendarMemos = async (): Promise<CalendarMemo[]> => {
  try {
    // ⭕️ URL の Calendar を小文字に修正
    const response = await fetch(`${BASE_URL}/calendar_memos`);
    
    if (!response.ok) {
      throw new Error(`エラー: status: ${response.status}`);
    }

    const rawData = await response.json();

    // ⭕️ item.created_at (スネークケース) から受け取る
    const calendarMemos: CalendarMemo[] = rawData.map((item: any) => ({
      id: item.id,
      date: item.date,
      text: item.text,
      createdAt: item.created_at
    }));

    return calendarMemos;
  } catch (error) {
    console.error("error: ", error);
    return [];
  }
};

export const createCalendarMemo = async (inputData: NewCalendarMemoInput): Promise<CalendarMemo | null> => {
  try {
    // ⭕️ URL に /calendar_memos を追加、キー名を calendar_memo に変更
    const response = await fetch(`${BASE_URL}/calendar_memos`, {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        calendar_memo: {
          text: inputData.text,
          date: inputData.date,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = Array.isArray(data.errors)
        ? data.errors.join('\n')
        : data.error || data.message || "予期せぬエラーが発生しました";

      alert(`作成に失敗しました:\n${errorMessage}`);
      return null;
    }

    return {
      id: data.id,
      text: data.text,
      date: data.date,
      createdAt: data.created_at
    };

  } catch (error) {
    console.error("API通信エラー:", error);
    return null;
  }
};

export const deleteCalendarMemo = async (id: string): Promise<boolean> => {
  try {
    const response = await fetch(`${BASE_URL}/calendar_memos/${id}`, {
      method: "DELETE", 
    });

    if (!response.ok) {
      console.error(`削除失敗: ${response.status} ${response.statusText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("ネットワークエラー！:", error);
    return false;
  }
};