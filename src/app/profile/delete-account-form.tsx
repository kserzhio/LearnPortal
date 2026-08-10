"use client";

import { useActionState } from "react";
import { deleteAccount, type DeleteAccountState } from "@/app/profile/delete-account-action";

const initialState: DeleteAccountState = { status: "idle", message: "" };

export function DeleteAccountForm() {
  const [state, formAction, pending] = useActionState(deleteAccount, initialState);

  return (
    <form className="delete-account-form" action={formAction}>
      <label htmlFor="deleteAccountConfirmation">Для підтвердження введи: <b>ВИДАЛИТИ МІЙ АКАУНТ</b></label>
      <input id="deleteAccountConfirmation" name="confirmation" type="text" autoComplete="off" spellCheck={false} aria-describedby="deleteAccountHint deleteAccountMessage" required />
      <p id="deleteAccountHint">Потрібен вхід, виконаний не більше 15 хвилин тому. За потреби вийди та увійди знову.</p>
      <label className="delete-account-acknowledgement"><input name="acknowledgement" type="checkbox" value="accepted" required /><span>Розумію, що профіль, прогрес, simulator attempts і збережені архітектури буде видалено без можливості відновлення.</span></label>
      <p id="deleteAccountMessage" className="delete-account-message" data-status={state.status} role={state.status === "error" ? "alert" : "status"} aria-live="polite">{state.message}</p>
      <button type="submit" disabled={pending}>{pending ? "Видаляємо…" : "Назавжди видалити акаунт"}</button>
    </form>
  );
}
