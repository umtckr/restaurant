"use client";

import { useState } from "react";

import { contactFormCopy } from "@/content/contactPage";

import styles from "./MarketingInterior.module.css";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 650);
  }

  if (submitted) {
    return (
      <div className={styles.formCard}>
        <div className={styles.success}>
          <div className={styles.successIcon} aria-hidden>
            ✓
          </div>
          <h2 className={styles.successTitle}>{contactFormCopy.successTitle}</h2>
          <p className={styles.successBody}>{contactFormCopy.successBody}</p>
        </div>
      </div>
    );
  }

  const c = contactFormCopy.fields;

  return (
    <div className={styles.formCard}>
      <h2 className={styles.formTitle}>{contactFormCopy.title}</h2>
      <p className={styles.formSubtitle}>{contactFormCopy.subtitle}</p>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="contact-name">
              {c.name}
            </label>
            <input
              id="contact-name"
              name="name"
              type="text"
              autoComplete="name"
              required
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="contact-email">
              {c.email}
            </label>
            <input
              id="contact-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={styles.input}
            />
          </div>
        </div>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="contact-company">
              {c.company}
            </label>
            <input
              id="contact-company"
              name="company"
              type="text"
              autoComplete="organization"
              required
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="contact-locations">
              {c.locations}
            </label>
            <input
              id="contact-locations"
              name="locations"
              type="text"
              placeholder="e.g. 5"
              className={styles.input}
            />
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="contact-topic">
            {c.topic}
          </label>
          <select
            id="contact-topic"
            name="topic"
            required
            className={styles.select}
            defaultValue=""
          >
            <option value="" disabled>
              Select…
            </option>
            {contactFormCopy.topics.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="contact-message">
            {c.message}
          </label>
          <textarea
            id="contact-message"
            name="message"
            required
            className={styles.textarea}
            rows={5}
          />
        </div>
        <button type="submit" className={styles.submit} disabled={loading}>
          {loading ? contactFormCopy.submitting : contactFormCopy.submit}
        </button>
      </form>
    </div>
  );
}
