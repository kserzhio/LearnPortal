"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { SystemIcon, type SystemIconName } from "@/components/ui/system-icon";
import { trackEvent } from "@/lib/analytics/client";
import type { FaqItem, KnowledgeCheck, LearningSupportContent } from "./content";
import styles from "./learning-support.module.css";

type Reply = { id: string; author_name: string; body: string; is_official_answer: boolean; created_at: string; is_owner: boolean; useful_count: number; useful_by_user: boolean };
type Question = { id: string; author_name: string; type: "question" | "idea" | "lesson-problem"; title: string; body: string; status: "open" | "resolved"; created_at: string; is_owner: boolean; lesson_replies: Reply[] };
type DiscussionPayload = { questions: Question[]; authenticated: boolean; moderator: boolean };
type Filter = "all" | "popular" | "unanswered" | "resolved";

const typeLabels = { question: "Питання", idea: "Ідея", "lesson-problem": "Проблема з уроком" } as const;
const typeIcons: Record<keyof typeof typeLabels, SystemIconName> = { question: "question", idea: "idea", "lesson-problem": "bug" };
const reasonLabels = { "too-hard": "Було складно", unclear: "Незрозуміле пояснення", "practice-broken": "Не працює практика", "too-much": "Забагато інформації", other: "Інше" } as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("uk-UA", { dateStyle: "medium" }).format(new Date(value));
}

export function AccessibleFaq({ title, items }: { title: string; items: readonly FaqItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const baseId = useId();
  if (items.length === 0) return null;
  return (
    <section className={styles.supportSection} aria-labelledby={`${baseId}-title`}>
      <header className={styles.sectionHeading}><span>FAQ</span><h2 id={`${baseId}-title`}>{title}</h2></header>
      <div className={styles.faqList}>{items.map((item) => {
        const open = openId === item.id;
        const panelId = `${baseId}-${item.id}-panel`;
        return <article key={item.id}><h3><button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpenId(open ? null : item.id)}>{item.question}<span aria-hidden="true">{open ? "−" : "+"}</span></button></h3><div id={panelId} hidden={!open}><p>{item.answer}</p></div></article>;
      })}</div>
    </section>
  );
}

export function KnowledgeChecks({ courseId, contentId, checks }: { courseId: string; contentId: string; checks: readonly KnowledgeCheck[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, boolean>>({});
  if (checks.length === 0) return null;
  return <section className={styles.supportSection} aria-labelledby="knowledge-check-title"><header className={styles.sectionHeading}><span>CHECK</span><h2 id="knowledge-check-title">Перевір себе</h2></header><div className={styles.checkList}>{checks.map((check, index) => {
    const result = results[check.id];
    return <form key={check.id} onSubmit={async (event) => { event.preventDefault(); const selectedAnswer = answers[check.id]; if (!selectedAnswer) return; const response = await fetch("/api/learning-support/knowledge-checks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId, contentId, checkId: check.id, selectedAnswer }) }); if (response.ok) { const responseBody = await response.json() as { correct: boolean }; setResults((current) => ({ ...current, [check.id]: responseBody.correct })); trackEvent("knowledge_check_submitted", { content_id: contentId, result: responseBody.correct ? "correct" : "incorrect" }); } }}><fieldset><legend><span>{String(index + 1).padStart(2, "0")} · {check.type === "predict" ? "ПЕРЕДБАЧ РЕЗУЛЬТАТ" : "ПИТАННЯ"}</span>{check.question}</legend>{check.options.map((option) => <label key={option.id}><input type="radio" name={check.id} value={option.id} checked={answers[check.id] === option.id} onChange={() => { setAnswers((current) => ({ ...current, [check.id]: option.id })); setResults((current) => { const next = { ...current }; delete next[check.id]; return next; }); }} /> <span>{option.label}</span></label>)}</fieldset><button type="submit" disabled={!answers[check.id]}>Перевірити</button>{typeof result === "boolean" ? <div className={result ? styles.correct : styles.incorrect} role="status"><strong>{result ? <><SystemIcon name="check" /> Правильно</> : "Не зовсім"}</strong><p>{result ? check.explanation : check.incorrectExplanation}</p>{!result ? <button type="button" onClick={() => { setAnswers((current) => ({ ...current, [check.id]: "" })); setResults((current) => { const next = { ...current }; delete next[check.id]; return next; }); }}><SystemIcon name="retry" /> Спробувати ще раз</button> : null}</div> : null}</form>;
  })}</div></section>;
}

export function NeedHelp({ hints, contentId, questionTarget = "#lesson-discussion", kids = false }: { hints: readonly string[]; contentId: string; questionTarget?: string; kids?: boolean }) {
  const [revealed, setRevealed] = useState(0);
  return <aside className={styles.needHelp} aria-labelledby="need-help-title"><div><span>NEED HELP?</span><h2 id="need-help-title">{kids ? "Потрібна підказка?" : "Застряг?"}</h2></div><div className={styles.helpActions}><button type="button" onClick={() => { const stage = Math.min(revealed + 1, hints.length); setRevealed(stage); trackEvent("hint_opened", { content_id: contentId, stage }); }} disabled={revealed === hints.length}>{revealed === hints.length ? "Усі підказки відкрито" : kids ? "Показати підказку" : "Отримати підказку"}</button><a href={questionTarget}>{kids ? "Попросити допомогу" : "Поставити питання"}</a></div>{revealed > 0 ? <ol className={styles.hintList} aria-live="polite">{hints.slice(0, revealed).map((hint, index) => <li key={hint}><strong>Підказка {index + 1}</strong><p>{hint}</p></li>)}</ol> : null}</aside>;
}

export function LessonFeedback({ courseId, contentId }: { courseId: string; contentId: string }) {
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [reasons, setReasons] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const submit = async (value: boolean) => {
    setHelpful(value); setStatus("saving");
    const response = await fetch("/api/learning-support/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId, contentId, helpful: value, reasons: value ? [] : reasons, comment: value ? "" : comment }) });
    if (response.ok) trackEvent("lesson_feedback_submitted", { content_id: contentId, helpful: value });
    setStatus(response.ok ? "saved" : "error");
  };
  return <section className={styles.feedback} aria-labelledby="lesson-feedback-title"><h2 id="lesson-feedback-title">Це заняття було корисним?</h2><div role="group" aria-label="Оцінити заняття"><button type="button" aria-pressed={helpful === true} onClick={() => void submit(true)}><SystemIcon name="thumbs-up" /> Так<span className={styles.srOnly}> — заняття було корисним</span></button><button type="button" aria-pressed={helpful === false} onClick={() => { setHelpful(false); setStatus("idle"); }}><SystemIcon name="thumbs-down" /> Ні<span className={styles.srOnly}> — заняття не було корисним</span></button></div>{helpful === false ? <form onSubmit={(event) => { event.preventDefault(); void submit(false); }}><fieldset><legend>Що можна покращити? <small>Необов’язково</small></legend>{Object.entries(reasonLabels).map(([value, label]) => <label key={value}><input type="checkbox" checked={reasons.includes(value)} onChange={() => setReasons((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])} /> {label}</label>)}</fieldset><label>Хочеш додати коментар?<textarea value={comment} maxLength={1000} onChange={(event) => setComment(event.target.value)} /></label><button type="submit">Надіслати feedback</button></form> : null}<p className={styles.formStatus} role="status">{status === "saving" ? "Зберігаємо…" : status === "saved" ? "Дякуємо — feedback збережено." : status === "error" ? "Не вдалося зберегти. Спробуй ще раз." : ""}</p></section>;
}

export function LessonDiscussion({ courseId, contentId }: { courseId: string; contentId: string }) {
  const [payload, setPayload] = useState<DiscussionPayload>({ questions: [], authenticated: false, moderator: false });
  const [filter, setFilter] = useState<Filter>("all");
  const [message, setMessage] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const load = useCallback(async () => {
    const response = await fetch(`/api/learning-support/questions?courseId=${encodeURIComponent(courseId)}&contentId=${encodeURIComponent(contentId)}`, { cache: "no-store" });
    if (response.ok) setPayload(await response.json() as DiscussionPayload);
  }, [courseId, contentId]);
  useEffect(() => {
    let active = true;
    void fetch(`/api/learning-support/questions?courseId=${encodeURIComponent(courseId)}&contentId=${encodeURIComponent(contentId)}`, { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<DiscussionPayload> : null)
      .then((data) => { if (active && data) setPayload(data); });
    return () => { active = false; };
  }, [courseId, contentId]);
  const questions = payload.questions
    .filter((question) => filter === "all" || filter === "popular" || (filter === "unanswered" && !question.lesson_replies.some((reply) => reply.is_official_answer)) || (filter === "resolved" && question.status === "resolved"))
    .toSorted((first, second) => filter === "popular" ? second.lesson_replies.length - first.lesson_replies.length : 0);
  const openForm = () => {
    if (payload.authenticated) {
      setMessage("");
      dialogRef.current?.showModal();
    } else setMessage("Увійди, щоб поставити питання.");
  };
  return <section className={styles.supportSection} id="lesson-discussion" aria-labelledby="discussion-title"><header className={styles.discussionHeading}><div><span>ASK</span><h2 id="discussion-title">Питання та обговорення</h2></div><strong aria-label={`${payload.questions.length} питань`}>{payload.questions.length}</strong></header><button className={styles.primaryAction} type="button" onClick={openForm}><SystemIcon name="question" /> Поставити питання</button>{message && !payload.authenticated ? <div className={styles.loginPrompt} role="status"><p>{message}</p><Link href="/auth/sign-in">Увійти</Link></div> : null}<div className={styles.filters} role="group" aria-label="Фільтр питань">{([['all','Всі'],['popular','Популярні'],['unanswered','Без відповіді'],['resolved','Вирішені']] as const).map(([value,label]) => <button type="button" aria-pressed={filter === value} key={value} onClick={() => setFilter(value)}>{label}</button>)}</div><div className={styles.questionList}>{questions.length === 0 ? <p>Поки немає питань у цій категорії.</p> : questions.map((question) => <QuestionCard key={question.id} question={question} payload={payload} reload={load} />)}</div><dialog className={styles.questionDialog} ref={dialogRef} aria-labelledby="question-dialog-title"><form method="dialog" className={styles.dialogClose}><button type="submit" aria-label="Закрити форму"><SystemIcon name="close" /></button></form><form onSubmit={async (event) => { event.preventDefault(); setMessage(""); const form = new FormData(event.currentTarget); const questionType = String(form.get("type")); const response = await fetch("/api/learning-support/questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId, contentId, type: questionType, title: form.get("title"), body: form.get("body") }) }); if (response.ok) { trackEvent("question_created", { content_id: contentId, question_type: questionType }); event.currentTarget.reset(); dialogRef.current?.close(); await load(); } else setMessage((await response.json() as { error?: string }).error ?? "Не вдалося опублікувати."); }}><h2 id="question-dialog-title">Поставити питання</h2><label>Тип<select name="type" defaultValue="question"><option value="question">Питання</option><option value="idea">Ідея</option><option value="lesson-problem">Проблема з уроком</option></select></label><label>Заголовок<input name="title" minLength={5} maxLength={140} required /></label><label>Опис<textarea name="body" minLength={10} maxLength={4000} required /></label>{message ? <p className={styles.dialogError} role="alert">{message}</p> : null}<button type="submit">Опублікувати</button></form></dialog></section>;
}

function QuestionCard({ question, payload, reload }: { question: Question; payload: DiscussionPayload; reload: () => Promise<void> }) {
  const [reply, setReply] = useState("");
  const official = question.lesson_replies.some((item) => item.is_official_answer);
  const moderate = async (action: "toggle-resolved" | "toggle-official", replyId?: string) => { await fetch(`/api/learning-support/questions/${question.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, replyId }) }); await reload(); };
  const updateUseful = async (item: Reply) => { await fetch(`/api/learning-support/replies/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ useful: !item.useful_by_user }) }); await reload(); };
  const deleteReply = async (replyId: string) => { await fetch(`/api/learning-support/replies/${replyId}`, { method: "DELETE" }); await reload(); };
  const deleteQuestion = async () => { if (!confirm("Видалити це питання разом із відповідями?")) return; await fetch(`/api/learning-support/questions/${question.id}`, { method: "DELETE" }); await reload(); };
  return (
    <article className={styles.questionCard}>
      <header><span><SystemIcon name={typeIcons[question.type]} /> {typeLabels[question.type]}</span><div>{question.status === "resolved" ? <b><SystemIcon name="check" /> Вирішено</b> : null}{official ? <b><SystemIcon name="badge-check" /> Відповідь автора</b> : null}</div></header>
      <h3>{question.title}</h3><p className={styles.byline}>{question.author_name} · {formatDate(question.created_at)}</p><p>{question.body}</p>
      <details><summary>Відповіді · {question.lesson_replies.length}</summary>
        <div className={styles.replyList}>{question.lesson_replies.map((item) => <article key={item.id}><header><strong>{item.author_name}</strong>{item.is_official_answer ? <span><SystemIcon name="badge-check" /> Відповідь автора</span> : null}</header><p>{item.body}</p><small>{formatDate(item.created_at)} · {item.useful_count} позначок «корисно»</small><div className={styles.replyActions}>{payload.authenticated ? <button type="button" aria-pressed={item.useful_by_user} onClick={() => void updateUseful(item)}><SystemIcon name="thumbs-up" /> Корисно</button> : null}{payload.moderator ? <><button type="button" onClick={() => void moderate("toggle-official", item.id)}>{item.is_official_answer ? "Зняти позначку" : "Позначити відповіддю автора"}</button><button type="button" onClick={() => void deleteReply(item.id)}><SystemIcon name="trash" /> Видалити відповідь</button></> : null}</div></article>)}</div>
        {payload.authenticated ? <form className={styles.replyForm} onSubmit={async (event) => { event.preventDefault(); const response = await fetch(`/api/learning-support/questions/${question.id}/replies`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: reply }) }); if (response.ok) { setReply(""); await reload(); } }}><label>Твоя відповідь<textarea value={reply} minLength={2} maxLength={4000} required onChange={(event) => setReply(event.target.value)} /></label><button type="submit">Відповісти</button></form> : <p><Link href="/auth/sign-in">Увійди, щоб відповісти</Link></p>}
      </details>
      {payload.moderator || question.is_owner ? <div className={styles.moderationActions}>{payload.moderator ? <button className={styles.moderateButton} type="button" onClick={() => void moderate("toggle-resolved")}>{question.status === "resolved" ? "Відкрити знову" : "Позначити вирішеним"}</button> : null}<button className={styles.moderateButton} type="button" onClick={() => void deleteQuestion()}><SystemIcon name="trash" /> Видалити питання</button></div> : null}
    </article>
  );
}

export function LessonLearningSupport({ courseId, contentId, content }: { courseId: string; contentId: string; content: LearningSupportContent }) {
  return <div className={styles.supportStack}><NeedHelp hints={content.hints} contentId={contentId} /><KnowledgeChecks courseId={courseId} contentId={contentId} checks={content.checks} /><LessonFeedback courseId={courseId} contentId={contentId} /><LessonDiscussion courseId={courseId} contentId={contentId} /><AccessibleFaq title="FAQ цього заняття" items={content.faqs} /></div>;
}
