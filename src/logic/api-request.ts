import { ReactServerDOMWebpackStatic } from "next/dist/server/route-modules/app-page/vendored/rsc/entrypoints";
import type { NewCommitInput,NewDayScheduleInput,NewProjectInput,NewCalendarMemoInput } from "./api-types";
import type { Project ,ApiProjectResponse, Commit,DaySchedule, CalendarMemo } from "./types";

const BASE_URL = 'http://localhost:3001/api/v1';

//コミットを取得する API
export const loadCommits = async (): Promise<Commit[]> => {
  try {
    const response = await fetch(`${BASE_URL}/commits`);

    if (!response.ok) {
      throw new Error(`HTTPエラー! status: ${response.status}`);
    }

    // APIから返ってきた生のJSON配列
    const rawData: Commit[] = await response.json();
    console.log("レスポンスデータ: ",rawData)

    // TypeScriptの Commit 型に変換（マッピング）
    const commits: Commit[] = rawData.map((item) => ({
      id: item.id,
      projectId: item.projectId,
      startedAt: item.startedAt,
      endedAt: item.endedAt,
      durationMs: item.durationMs ?? (item.endedAt - item.startedAt), // 必要に応じて計算
      note: item.note,
      image: item.image ?? null,
    }));

    console.log("型変換後のデータ:", commits);
    return commits;
  } catch (error) {
    console.error("エラー発生:", error);
    return [];
  }
};

export const createCommit = async ( inputData : NewCommitInput ):Promise<Commit | null> => {
  try{
      const formData = new FormData();//画像添付なのでformdataじゃないとだめ

      // 1. 通常のテキスト/数値パラメータを追加
      formData.append('commit[project_id]', inputData.projectId);
      formData.append('commit[started_at]', inputData.startedAt.toString());
      formData.append('commit[ended_at]', inputData.endedAt.toString());

      if (inputData.note) {
        formData.append('commit[note]', inputData.note);
      }

      // 2. 画像データ（CommitImage）が存在する場合、blob（または File）を append する
      if (inputData.image?.blob) {
        // 第3引数にファイル名（name）を渡すのがポイント！
        formData.append('commit[image]', inputData.image.blob, inputData.image.name);
      }

      // 3. fetch で送信
      const response = await fetch(`${BASE_URL}/projects${inputData.projectId}/commits`, {
        method: 'POST',
        // ⚠️ headers に 'Content-Type': 'multipart/form-data' は書いてはいけません！
        // FormData を body に渡すと、ブラウザが自動的に適切な boundary を含めた Content-Type を設定してくれます。
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
  }

//プロジェクトを取得する API
export const loadProjects = async (): Promise<Project[]> => {
  try {
    const response = await fetch(`${BASE_URL}/projects`);
    
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

    //console.log("型変換後のデータ:", projects);
    return projects;

  } catch (error) {
    console.error("エラー発生:", error);
    return [];
  }
};

//プロジェクトを新規作成する API
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

export const loadDaySchedules = async (): Promise<DaySchedule[]> =>{
  try{
    const response = await fetch(`${BASE_URL}/day_schedules`);

    if(!response.ok){
      throw new Error(`httpエラー status: ${response.status}`);
    }

    const rawData: DaySchedule[] = await response.json();

    const daySchedules: DaySchedule[]= rawData.map((item) => ({
      id: item.id,
      date: item.date,
      title: item.title,
      startHour: item.startHour,
      startMinute: item.startMinute,
      endHour: item.endHour,
      endMinute: item.endMinute,
      projectId: item.projectId,//projectに紐づける奴、なくていいかも。（実装しないかも
    }));

    return daySchedules;
  }catch (error){
    console.error("error ： ",error);
    return [];
  }
};

export const createDaySchedules = async (inputData: NewDayScheduleInput): Promise<DaySchedule | null> =>{
  try{
    const response = await fetch(`"${BASE_URL}`,)

    return null;
  }catch(error){
    return null;
  }
};

export const loadCalendarMemos = async (): Promise<CalendarMemo[]> =>{
  try{
    const response = await fetch(`${BASE_URL}/Calendar_memos`);
    
    if(!response.ok){
      throw new Error(`エラーだろ普通に : status: ${response.status}`);
    }

    const rawData: CalendarMemo[] = await response.json();

    const calendarMemos: CalendarMemo[]= rawData.map((item) => ({
      id: item.id,
      date: item.date,
      text: item.text,
      createdAt: item.createdAt
    }))

    return calendarMemos;
  }catch(error){
    console.log("errorだよ: ",error);
    return [];
  }
};

export const createCalendarMemo = async (inputData:NewCalendarMemoInput): Promise<CalendarMemo | null> => {
  try{
    
    return null;
  }catch(error){

    return null;
  }
};