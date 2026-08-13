"use client";

import { useActionState } from "react";
import { deleteCompletedProject, type DeleteCompletedProjectState } from "./actions";

const initialState: DeleteCompletedProjectState = { status: "idle", message: "" };

export function DeleteProjectForm({ artifactId, projectTitle }: Readonly<{ artifactId: string; projectTitle: string }>) {
  const [state, action, pending] = useActionState(deleteCompletedProject, initialState);
  const hintId = `delete-hint-${artifactId}`;
  const statusId = `delete-status-${artifactId}`;
  return (
    <form action={action} className="completed-project-delete-form">
      <input type="hidden" name="artifactId" value={artifactId} />
      <label><input type="checkbox" name="confirmed" aria-describedby={`${hintId} ${statusId}`} required /><span>Я підтверджую видалення «{projectTitle}»</span></label>
      <p id={hintId}>Це видалить збережену схему та її completion record. Дію не можна скасувати.</p>
      <button type="submit" disabled={pending}>{pending ? "Видалення…" : "Видалити проєкт"}</button>
      <p id={statusId} role="status" aria-live="polite" data-status={state.status}>{state.message}</p>
    </form>
  );
}
