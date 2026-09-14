import { useEffect, useState } from "react";
import { fieldInputClass } from "./goal-form";

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function roundUpToNextHour(date: Date): Date {
  const next = new Date(date);
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return next;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatDateLong(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function formatDateTimeLong(date: Date): string {
  return `${date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

function toTimeInputValue(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function applyTime(base: Date, timeValue: string): Date | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(timeValue);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  const next = new Date(base);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

type DateTimePickerProps = {
  id: string;
  label: string;
  hint?: string;
  value: Date | null;
  onChange: (next: Date | null) => void;
  minDate?: Date | null;
  maxDate?: Date | null;
  disabled?: boolean;
  error?: string | null;
  defaultTime?: string;
};

export function DateTimePicker({
  id,
  label,
  hint,
  value,
  onChange,
  minDate,
  maxDate,
  disabled,
  error,
  defaultTime = "09:00",
}: DateTimePickerProps) {
  const today = startOfDay(new Date());
  const initialView = value ?? minDate ?? new Date();
  const [viewYear, setViewYear] = useState(initialView.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialView.getMonth());

  useEffect(() => {
    if (!value) return;
    if (value.getFullYear() !== viewYear || value.getMonth() !== viewMonth) {
      setViewYear(value.getFullYear());
      setViewMonth(value.getMonth());
    }
    // Intentionally sync only when the picked month drifts outside the visible month.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const minDay = minDate ? startOfDay(minDate) : null;
  const maxDay = maxDate ? startOfDay(maxDate) : startOfDay(addDays(new Date(), 365));

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(viewYear, viewMonth, index + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = firstOfMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const prevDisabled =
    !!disabled || (!!minDay && (viewYear < minDay.getFullYear() || (viewYear === minDay.getFullYear() && viewMonth <= minDay.getMonth())));
  const nextDisabled =
    !!disabled || (!!maxDay && (viewYear > maxDay.getFullYear() || (viewYear === maxDay.getFullYear() && viewMonth >= maxDay.getMonth())));

  function goMonth(delta: -1 | 1) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function goToday() {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  }

  function pickDay(day: Date) {
    if (disabled) return;
    const base = value && isSameDay(value, day) ? value : applyTime(day, value ? toTimeInputValue(value) : defaultTime) ?? day;
    const next = new Date(day);
    next.setHours(base.getHours(), base.getMinutes(), 0, 0);
    onChange(next);
  }

  function handleTimeChange(timeValue: string) {
    if (disabled) return;
    const base = value ?? new Date(viewYear, viewMonth, Math.min(new Date().getDate(), daysInMonth));
    const next = applyTime(base, timeValue);
    if (next) onChange(next);
  }

  function isDayDisabled(day: Date): boolean {
    if (disabled) return true;
    const dayStart = startOfDay(day);
    if (minDay && dayStart < minDay) return true;
    if (maxDay && dayStart > maxDay) return true;
    return false;
  }

  const timeId = `${id}-time`;
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <section aria-labelledby={`${id}-label`} className="min-w-0 flex-1">
      <header className="flex items-baseline justify-between gap-3">
        <h3 id={`${id}-label`} className="text-sm font-semibold">
          {label}
        </h3>
        {value ? (
          <p className="truncate text-xs font-semibold text-blue" aria-live="polite">
            {formatDateTimeLong(value)}
          </p>
        ) : null}
      </header>
      {hint ? (
        <p id={hintId} className="mt-1 text-xs leading-5 text-muted">
          {hint}
        </p>
      ) : null}

      <section className="mt-3 rounded-2xl border border-line bg-white p-4" aria-label={`${label} calendar`}>
        <header className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => goMonth(-1)}
            disabled={prevDisabled}
            aria-label="Previous month"
            className="grid size-9 place-items-center rounded-xl border border-line text-sm font-bold text-muted transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-line disabled:hover:text-muted"
          >
            <span aria-hidden="true">←</span>
          </button>
          <section className="text-center">
            <p className="text-sm font-bold" aria-live="polite">
              {monthLabel}
            </p>
            <button
              type="button"
              onClick={goToday}
              disabled={disabled}
              className="mt-0.5 text-xs font-semibold text-blue hover:underline disabled:no-underline disabled:opacity-40"
            >
              Today
            </button>
          </section>
          <button
            type="button"
            onClick={() => goMonth(1)}
            disabled={nextDisabled}
            aria-label="Next month"
            className="grid size-9 place-items-center rounded-xl border border-line text-sm font-bold text-muted transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-line disabled:hover:text-muted"
          >
            <span aria-hidden="true">→</span>
          </button>
        </header>

        <section role="grid" aria-label={`${label} — ${monthLabel}`} className="mt-3">
          <section role="row" className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((day) => (
              <span key={day} role="columnheader" className="py-1 text-center text-[0.7rem] font-bold uppercase tracking-wide text-muted">
                {day}
              </span>
            ))}
          </section>
          <section className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((day, index) => {
              if (!day) return <span key={`empty-${index}`} className="aspect-square" aria-hidden="true" />;
              const selected = !!value && isSameDay(value, day);
              const isToday = isSameDay(day, new Date());
              const dayDisabled = isDayDisabled(day);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  role="gridcell"
                  aria-selected={selected}
                  aria-label={day.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  aria-current={isToday ? "date" : undefined}
                  disabled={dayDisabled}
                  onClick={() => pickDay(day)}
                  className={`relative grid aspect-square place-items-center rounded-xl text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue ${
                    selected
                      ? "bg-blue text-white hover:bg-blue-dark"
                      : dayDisabled
                        ? "cursor-not-allowed text-line"
                        : "text-ink hover:bg-blue-pale"
                  } ${!selected && isToday ? "ring-1 ring-inset ring-blue/40" : ""}`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </section>
        </section>

        <section className="mt-3 border-t border-line pt-3">
          <label htmlFor={timeId} className="block">
            <span className="text-xs font-semibold text-muted">Time</span>
            <input
              id={timeId}
              type="time"
              value={value ? toTimeInputValue(value) : ""}
              onChange={(event) => handleTimeChange(event.target.value)}
              disabled={disabled || !value}
              aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
              className={`${fieldInputClass} mt-1.5 tabular-nums`}
            />
          </label>
        </section>
      </section>

      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-xs font-semibold leading-5 text-red-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}
