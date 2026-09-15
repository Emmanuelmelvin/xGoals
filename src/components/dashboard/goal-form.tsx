import { useEffect, useRef, useState } from "react";
import { Tooltip } from "../tooltip";
import { PERMISSION_GROUPS } from "./goal-persistence";
import { GlobeIcon, LockIcon, PlusIcon, TrashIcon } from "./icons";
import type { GoalVisibility, Skill } from "./types";

export const MILESTONE_MIN_LENGTH = 3;
export const MILESTONE_MAX_LENGTH = 120;

export const SKILL_NAME_MAX_LENGTH = 60;
export const SKILL_BODY_MAX_LENGTH = 4000;
const SKILL_FILE_MAX_BYTES = 100 * 1024;
const SKILL_FILE_ACCEPT = ".md,.markdown,.txt";

export type SkillDraft = { name: string; body: string };

export function cleanSkillDrafts(drafts: SkillDraft[]): Skill[] {
  return drafts
    .filter((draft) => draft.name.trim() && draft.body.trim())
    .map((draft) => ({ name: draft.name.trim(), body: draft.body.trim() }));
}

export function hasPartialSkillDraft(drafts: SkillDraft[]): boolean {
  return drafts.some((draft) => {
    const hasName = draft.name.trim().length > 0;
    const hasBody = draft.body.trim().length > 0;
    return (hasName || hasBody) && !(hasName && hasBody);
  });
}

export function hasSkillContent(drafts: SkillDraft[]): boolean {
  return drafts.some((draft) => draft.name.trim() || draft.body.trim());
}

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

export function VisibilityPicker({ value, onChange }: { value: GoalVisibility; onChange: (next: GoalVisibility) => void }) {
  const options: { value: GoalVisibility; title: string; description: string; Icon: typeof GlobeIcon }[] = [
    {
      value: "private",
      title: "Private",
      description: "Only you can see this goal. Branch it or run workflows whenever.",
      Icon: LockIcon,
    },
    {
      value: "public",
      title: "Public",
      description: "Anyone can discover this goal, branch from it, or run a private workflow from it.",
      Icon: GlobeIcon,
    },
  ];
  return (
    <section>
      <p className="text-sm font-semibold">Visibility</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Goal visibility">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${selected ? "border-blue/40 bg-blue-pale/40" : "border-line bg-white hover:border-ink"}`}
            >
              <span
                aria-hidden="true"
                className={`grid size-9 shrink-0 place-items-center rounded-full ${selected ? "bg-blue text-white" : "bg-wash text-muted"}`}
              >
                <option.Icon />
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">{option.title}</span>
                <span className="mt-0.5 block text-xs leading-5 text-muted">{option.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
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

export function SkillsEditor({ skills, onChange, onError }: { skills: SkillDraft[]; onChange: (next: SkillDraft[]) => void; onError: (message: string, description?: string) => void }) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [attachIndex, setAttachIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Swallow stray drops anywhere on the page so a missed drop zone never
  // navigates the browser away mid-compose. Zone drops still reach their own
  // handlers; prevention doesn't stop propagation.
  useEffect(() => {
    function prevent(event: Event) {
      event.preventDefault();
    }
    document.addEventListener("dragover", prevent);
    document.addEventListener("drop", prevent);
    return () => {
      document.removeEventListener("dragover", prevent);
      document.removeEventListener("drop", prevent);
    };
  }, []);

  function updateSkill(index: number, patch: Partial<SkillDraft>) {
    onChange(skills.map((skill, skillIndex) => (skillIndex === index ? { ...skill, ...patch } : skill)));
  }

  function removeSkill(index: number) {
    onChange(skills.filter((_, skillIndex) => skillIndex !== index));
  }

  function handleFiles(index: number, files: FileList | File[] | null) {
    if (!files || files.length === 0) return;
    const list = [...files];
    for (const file of list) {
      const textType = file.type === "text/plain" || file.type === "text/markdown" || file.type === "";
      if (!/\.(md|markdown|txt)$/i.test(file.name) && !textType) {
        onError(`"${file.name}" won't work here.`, "Attach .md or .txt files.");
        return;
      }
      if (file.size > SKILL_FILE_MAX_BYTES) {
        onError(`"${file.name}" is too large.`, "Keep attached files under 100 KB.");
        return;
      }
    }
    Promise.all(list.map((file) => file.text())).then((texts) => {
      const combined = texts.map((text) => text.trim()).filter(Boolean).join("\n\n");
      if (!combined) {
        onError("That file was empty.");
        return;
      }
      const current = skills[index]?.body.trim() ?? "";
      const next = current ? `${current}\n\n${combined}` : combined;
      if (next.length > SKILL_BODY_MAX_LENGTH) {
        onError("That would exceed the skill length limit.", `Keep each skill under ${SKILL_BODY_MAX_LENGTH.toLocaleString()} characters.`);
        return;
      }
      updateSkill(index, { body: next });
    }).catch(() => {
      onError("That file couldn't be read.");
    });
  }

  function openFilePicker(index: number) {
    setAttachIndex(index);
    // Reset so picking the same file twice still fires onChange.
    if (fileInputRef.current) fileInputRef.current.value = "";
    fileInputRef.current?.click();
  }

  return (
    <section>
      <p className="text-sm font-semibold">Skills</p>
      <p className="mt-1 text-xs leading-5 text-muted">
        Name the know how, then spell out how the agent should act. Type or paste directly, or drop a .md file.
        Skills guide behavior — permissions grant access.
      </p>
      {skills.length === 0 ? (
        <button
          type="button"
          onClick={() => onChange([{ name: "", body: "" }])}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-white px-4 py-4 text-sm font-bold text-muted transition-colors hover:border-blue hover:text-ink"
        >
          <PlusIcon /> Add a skill
        </button>
      ) : (
        <>
          <ul className="mt-4 space-y-3">
            {skills.map((skill, index) => (
              <li
                key={index}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDraggingIndex(index);
                }}
                onDragLeave={() => setDraggingIndex((current) => (current === index ? null : current))}
                onDrop={(event) => {
                  event.preventDefault();
                  setDraggingIndex(null);
                  handleFiles(index, event.dataTransfer.files);
                }}
                className={`space-y-3 rounded-2xl border bg-white p-4 transition-colors ${draggingIndex === index ? "border-blue ring-2 ring-blue/20" : "border-line"}`}
              >
                <div className="flex items-center gap-2">
                  <label className="min-w-0 flex-1">
                    <span className="sr-only">Skill {index + 1} name</span>
                    <input
                      type="text"
                      value={skill.name}
                      onChange={(event) => updateSkill(index, { name: event.target.value })}
                      maxLength={SKILL_NAME_MAX_LENGTH}
                      placeholder={`Skill ${index + 1} name — e.g. Reply style`}
                      className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold outline-none transition focus:border-blue focus:ring-2 focus:ring-blue/10"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeSkill(index)}
                    aria-label={`Remove skill ${index + 1}`}
                    className="grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-white text-muted transition-colors hover:border-ink hover:text-ink"
                  >
                    <TrashIcon />
                  </button>
                </div>
                <label className="block">
                  <span className="sr-only">Skill {index + 1} content</span>
                  <textarea
                    value={skill.body}
                    onChange={(event) => updateSkill(index, { body: event.target.value })}
                    rows={4}
                    maxLength={SKILL_BODY_MAX_LENGTH}
                    placeholder="Tell the agent specifically what to do — or drop a .md file here."
                    className="w-full resize-y rounded-xl border border-line bg-white px-3 py-2 text-sm leading-6 outline-none transition focus:border-blue focus:ring-2 focus:ring-blue/10"
                  />
                </label>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openFilePicker(index)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-1 py-0.5 text-xs font-bold text-muted transition-colors hover:text-ink"
                  >
                    <PlusIcon /> Attach .md / .txt
                  </button>
                  <span className="text-xs tabular-nums text-muted">
                    {skill.body.length.toLocaleString()} / {SKILL_BODY_MAX_LENGTH.toLocaleString()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => onChange([...skills, { name: "", body: "" }])}
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2 text-sm font-bold text-ink transition-colors hover:border-ink"
          >
            <PlusIcon /> Add another skill
          </button>
        </>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept={SKILL_FILE_ACCEPT}
        multiple
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(event) => {
          handleFiles(attachIndex, event.target.files);
        }}
      />
    </section>
  );
}
