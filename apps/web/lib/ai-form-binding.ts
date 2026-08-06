"use client";

import type { UseAiForm } from "@fleet/ai-forms/react";

/**
 * Bind a form field to the assistant-owned store.
 *
 * Fields become controlled, which is what makes "now change the city" work:
 * the user and the assistant write to the same object, so a follow-up
 * instruction has something to revise. The previous approach wrote straight
 * into the DOM (`el.value = ...`), which fills once and then has no idea what
 * is in the form.
 *
 * Submission is unaffected — a controlled input still carries `name` and
 * `value`, so `new FormData(form)` collects exactly what it did before.
 */
export function bindField(form: UseAiForm, name: string) {
  return {
    value: form.text(name),
    onChange: (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => form.setValue(name, e.target.value),
  };
}

/** Checkboxes carry their state in `checked`, not `value`. */
export function bindCheckbox(form: UseAiForm, name: string) {
  return {
    checked: form.values[name] === true || form.values[name] === "true",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      form.setValue(name, e.target.checked),
  };
}

/**
 * Marks a field the assistant wrote, so an AI edit is visible rather than
 * something the user has to diff by eye.
 */
export function aiTouchedClass(form: UseAiForm, name: string): string {
  return form.isAiTouched(name) ? "ring-1 ring-primary/40" : "";
}
