import { create } from 'zustand';
import { EVisualizationProcessStatus, SimpleVisualizationProject } from '@/types/visualization';

interface VisualizationProjectStore {
  projects: SimpleVisualizationProject[];
  checkedProjectIds: string[];
  setProjects: (projects: SimpleVisualizationProject[]) => void;
  addProject: (project: SimpleVisualizationProject) => void;
  deleteProject: (id: string) => void;
  deleteProjects: (ids: string[]) => void;
  toggleProjectCheck: (id: string) => void;
  setCheckedProjects: (ids: string[]) => void;
  resetCheckedProjects: () => void;
  updateProjectStatus: (id: string, newStatus: EVisualizationProcessStatus) => void;
}

export const useVisualizationProjectStore = create<VisualizationProjectStore>((set, get) => ({
  projects: [],
  checkedProjectIds: [],
  setProjects: (projects) => set({ projects }),
  addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),
  deleteProject: (id) => set((state) => ({ projects: state.projects.filter((project) => project.id !== id) })),
  deleteProjects: (ids) =>
    set((state) => ({ projects: state.projects.filter((project) => !ids.includes(project.id)) })),
  toggleProjectCheck: (id) =>
    set((state) => ({
      checkedProjectIds: state.checkedProjectIds.includes(id)
        ? state.checkedProjectIds.filter((projectId) => projectId !== id)
        : [...state.checkedProjectIds, id],
    })),
  setCheckedProjects: (ids) => set({ checkedProjectIds: ids }),
  resetCheckedProjects: () => set({ checkedProjectIds: [] }),
  updateProjectStatus: (id, newStatus) =>
    set((state) => ({
      projects: state.projects.map((project) => (project.id === id ? { ...project, status: newStatus } : project)),
    })),
}));
