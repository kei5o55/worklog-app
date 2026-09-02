import type { NewProjectInput } from "../components/CreateProjectModal";
import type { Project ,ApiProjectResponse, } from "./types";

const BASE_URL = 'http://localhost:3001/api/v1/projects';

//プロジェクトを取得する API
export const loadProjects = async (): Promise<Project[]> => {
  try {
    const response = await fetch(BASE_URL);
    
    if (!response.ok) {
      throw new Error(`HTTPエラー! status: ${response.status}`);
    }

    // APIから返ってきた生のJSON配列
    const rawData: ApiProjectResponse[] = await response.json();

    // TypeScriptの Project 型に変換（マッピング）
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

    console.log("型変換後のデータ:", projects);
    return projects;

  } catch (error) {
    console.error("エラー発生:", error);
    return [];
  }
};

//プロジェクトを新規作成する API
export const createProject = async (inputData: NewProjectInput): Promise<Project | null> => {
  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project: {
          name: inputData.name,
          dueDate: inputData.dueDate,
          completed:false,//dbでdefault：falseだけど一応
          memo: inputData.memo,
          targetHours: inputData.targetHours,
          pomodoroBreakMinutes: inputData.pomodoroBreakMinutes,
          pomodoroWorkMinutes: inputData.pomodoroWorkMinutes,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.log("Railsから返ってきた生レスポンス:", data);
      console.log("data.errorsの中身:", data.errors);
      alert(`作成に失敗しました:\n${data.errors.join('\n')}`);
      return null;
    }

    // 成功時：Project 型に変換して返す
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