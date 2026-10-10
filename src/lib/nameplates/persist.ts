import { toast } from "sonner";
import { saveProject } from "./projects";
import { currentSnapshot, useStudio } from "./store";

/** Save the current studio state into the local project library. */
export function persistProject() {
  const st = useStudio.getState();
  const rec = saveProject({ ...currentSnapshot(), projectName: st.projectName });
  toast.success("已保存到本机项目库");
  return rec;
}
