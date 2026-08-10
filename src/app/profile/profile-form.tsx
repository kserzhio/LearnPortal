"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileActionState } from "@/app/profile/actions";

type ProfileFormProps = {
  initialDisplayName: string;
};

export function ProfileForm({ initialDisplayName }: ProfileFormProps) {
  const startingState: ProfileActionState = {
    status: "idle",
    message: "",
    displayName: initialDisplayName,
  };
  const [state, formAction, pending] = useActionState(updateProfile, startingState);

  return (
    <form className="profile-form" action={formAction}>
      <div className="profile-field">
        <label htmlFor="displayName">Ім’я в порталі</label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          minLength={2}
          maxLength={80}
          defaultValue={state.displayName}
          autoComplete="name"
          aria-describedby="displayNameHint profileMessage"
          required
        />
        <p id="displayNameHint">Від 2 до 80 символів. Це ім’я бачиш лише ти у своєму навчальному кабінеті.</p>
      </div>
      <div className="profile-form-footer">
        <p id="profileMessage" className="profile-message" data-status={state.status} aria-live="polite">
          {state.message}
        </p>
        <button type="submit" disabled={pending}>
          {pending ? "Зберігаємо…" : "Зберегти зміни"}
        </button>
      </div>
    </form>
  );
}
