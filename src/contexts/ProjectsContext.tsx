import React, { createContext, useContext, useMemo, useState } from "react";

export type Project = {
  id: string;
  name: string;
  dueDate?: string;
  memo?: string;
  createdAt: number;
};

type ProjectsCtx = {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
};

const Ctx = createContext<ProjectsCtx | null>(null);

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([
    { id: "p1", name: "NARAKU", createdAt: Date.now() },
    { id: "p2", name: "MISORIA", createdAt: Date.now() },
  ]);

  const value = useMemo(() => ({ projects, setProjects }), [projects]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProjects() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useProjects must be used within ProjectsProvider");
  return v;
}