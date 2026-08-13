"use client";

import { useState } from "react";
import Link from "next/link";
import { SystemIcon } from "@/components/ui/system-icon";
import styles from "./server-failure-demo.module.css";

export function ServerFailureDemo() {
  const [serverAOnline, setServerAOnline] = useState(true);

  return (
    <section className={styles.section} aria-labelledby="try-systema-title">
      <div className={styles.copy}>
        <span>ІНТЕРАКТИВНА ДЕМО</span>
        <h2 id="try-systema-title">Спробуй SYSTEMA</h2>
        <p>Що станеться із системою, якщо один сервер впаде?</p>
        <button type="button" onClick={() => setServerAOnline((online) => !online)} aria-pressed={!serverAOnline}>
          {serverAOnline ? "Вимкнути Server A" : "Увімкнути Server A"}
        </button>
      </div>

      <div className={styles.playground}>
        <div className={styles.diagram} role="img" aria-label={serverAOnline
          ? "Users надсилають трафік через Load Balancer до активних Server A і Server B."
          : "Server A вимкнений. Load Balancer спрямовує весь трафік до активного Server B."}>
          <div className={styles.node}><span>01</span><b>Users</b><small>requests</small></div>
          <span className={styles.arrow} aria-hidden="true"><SystemIcon name="arrow-down" /></span>
          <div className={`${styles.node} ${styles.balancer}`}><span>02</span><b>Load Balancer</b><small>health-aware routing</small></div>
          <div className={styles.routes} aria-hidden="true"><i className={!serverAOnline ? styles.inactiveRoute : ""}>↙</i><i>↘</i></div>
          <div className={styles.servers}>
            <div className={`${styles.node} ${!serverAOnline ? styles.offline : ""}`}>
              <span>03A</span><b>Server A</b><small>{serverAOnline ? "ACTIVE" : "OFFLINE"}</small>
            </div>
            <div className={`${styles.node} ${!serverAOnline ? styles.receivingAll : ""}`}>
              <span>03B</span><b>Server B</b><small>{serverAOnline ? "ACTIVE" : "100% TRAFFIC"}</small>
            </div>
          </div>
        </div>

        <div className={styles.result} role="status" aria-live="polite">
          <strong>{serverAOnline ? "Два сервери приймають трафік" : <><SystemIcon name="check" /> Система продовжує працювати</>}</strong>
          <p>{serverAOnline
            ? "Вимкни Server A та подивись, як Load Balancer змінить маршрут."
            : "Ти щойно перевірив базовий принцип High Availability."}</p>
          <Link href="/courses/high-load-architecture/lessons/what-is-high-load">Пройти повне заняття <SystemIcon name="arrow-right" /></Link>
        </div>
      </div>
    </section>
  );
}
