import { Tooltip } from "../tooltip";
import { PERMISSION_GROUPS } from "./goal-persistence";
import { PlusIcon, TrashIcon } from "./icons";

export const MILESTONE_MIN_LENGTH = 3;
export const MILESTONE_MAX_LENGTH = 120;

export const fieldInputClass =
  "mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-blue focus:ring-2 focus:ring-blue/10";

export function PermissionSwitch({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-blue" : "bg-line"}`}
    >
      <span
        className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${checked ? "left-[1.375rem]" : "left-0.5"}`}
        aria-hidden="true"
      />
    </button>
  );
}

export function MilestoneEditor({ milestones, onChange }: { milestones: string[]; onChange: (next: string[]) => void }) {
  function updateMilestone(index: number, value: string) {
    onChange(milestones.map((milestone, milestoneIndex) => (milestoneIndex === index ? value : milestone)));
  }

  function removeMilestone(index: number) {
    if (milestones.length <= 1) return;
    onChange(milestones.filter((_, milestoneIndex) => milestoneIndex !== index));
  }

  return (
    <section>
      <p className="text-sm font-semibold">Milestones</p>
      <p className="mt-1 text-xs leading-5 text-muted">
        A goal needs at least one milestone — a single line of {MILESTONE_MIN_LENGTH}–{MILESTONE_MAX_LENGTH} characters.
      </p>
      <ul className="mt-4 space-y-3">
        {milestones.map((milestone, index) => (
          <li key={index} className="flex items-center gap-2">
            <Tooltip label={milestones.length <= 1 ? "A goal needs at least one milestone" : `Remove milestone ${index + 1}`} placement="top">
              <button
                type="button"
                onClick={() => removeMilestone(index)}
                disabled={milestones.length <= 1}
                aria-label={milestones.length <= 1 ? "Cannot remove the last milestone" : `Remove milestone ${index + 1}`}
                className="grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-white text-muted transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-line disabled:hover:text-muted"
              >
                <TrashIcon />
              </button>
            </Tooltip>
            <section className="min-w-0 flex-1">
              <label className="block">
                <span className="sr-only">Milestone {index + 1}</span>
                <input
                  type="text"
                  value={milestone}
                  onChange={(event) => updateMilestone(index, event.target.value)}
                  minLength={MILESTONE_MIN_LENGTH}
                  maxLength={MILESTONE_MAX_LENGTH}
                  placeholder={`Milestone ${index + 1} — what should be true?`}
                  className={`${fieldInputClass} mt-0`}
                />
              </label>
            </section>
            {index === milestones.length - 1 ? (
              <Tooltip label="Add milestone" placement="top">
                <button
                  type="button"
                  onClick={() => onChange([...milestones, ""])}
                  aria-label="Add milestone"
                  className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue text-white"
                >
                  <PlusIcon />
                </button>
              </Tooltip>
            ) : (
              <span className="size-9 shrink-0" aria-hidden="true" />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PermissionEditor({ granted, onToggle }: { granted: string[]; onToggle: (permission: string, next: boolean) => void }) {
  return (
    <section className="space-y-6">
      {PERMISSION_GROUPS.map((group) => (
        <section key={group.title}>
          <p className="text-sm font-semibold">{group.title}</p>
          <ul className="mt-3 space-y-2">
            {group.entries.map((entry) => {
              const checked = granted.includes(entry.permission);
              return (
                <li
                  key={entry.permission}
                  className={`flex items-center gap-4 rounded-2xl border p-4 transition-colors ${checked ? "border-blue/40 bg-blue-pale/40" : "border-line bg-white"}`}
                >
                  <section className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      {entry.label}
                      {entry.sensitive ? (
                        <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-red-700">
                          High impact
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-muted">{entry.description}</p>
                  </section>
                  <PermissionSwitch checked={checked} onChange={(next) => onToggle(entry.permission, next)} label={entry.label} />
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </section>
  );
}
