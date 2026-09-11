import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export type ToastOptions = {
  description?: string;
  duration?: number;
  id?: string;
};

type ToastItem = ToastOptions & {
  id: string;
  message: string;
  type: ToastType;
};

type ToastMethod = (message: string, options?: ToastOptions) => string;

type ToastApi = {
  success: ToastMethod;
  error: ToastMethod;
  info: ToastMethod;
  warning: ToastMethod;
  dismiss: (id: string) => void;
  clear: () => void;
};

type ToastContextValue = { toast: ToastApi };

const ToastContext = createContext<ToastContextValue | null>(null);

const toastStyles: Record<ToastType, { icon: string; container: string; iconContainer: string }> = {
  success: { icon: "✓", container: "border-emerald-200 bg-emerald-50 text-emerald-950", iconContainer: "bg-emerald-100 text-emerald-700" },
  error: { icon: "!", container: "border-red-200 bg-red-50 text-red-950", iconContainer: "bg-red-100 text-red-700" },
  info: { icon: "i", container: "border-blue-200 bg-blue-pale text-blue-dark", iconContainer: "bg-blue-soft text-blue-dark" },
  warning: { icon: "!", container: "border-amber-200 bg-amber-50 text-amber-950", iconContainer: "bg-amber-100 text-amber-700" },
};

function CloseIcon() {
  return <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>;
}

function ToastIcon({ type }: { type: ToastType }) {
  const styles = toastStyles[type];
  return <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-extrabold ${styles.iconContainer}`} aria-hidden="true">{styles.icon}</span>;
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const styles = toastStyles[item.type];
  return <li className={`pointer-events-auto flex animate-[toast-enter_220ms_ease-out] items-start gap-3 rounded-2xl border p-3.5 shadow-[0_16px_40px_rgba(16,20,28,0.12)] ${styles.container}`} role={item.type === "error" ? "alert" : "status"}>
    <ToastIcon type={item.type} />
    <section className="min-w-0 flex-1 pt-0.5">
      <p className="text-sm font-bold leading-5">{item.message}</p>
      {item.description ? <p className="mt-1 text-xs leading-5 opacity-75">{item.description}</p> : null}
    </section>
    <button type="button" onClick={() => onDismiss(item.id)} className="rounded-lg p-1 text-current opacity-60 transition-opacity hover:bg-black/5 hover:opacity-100" aria-label="Dismiss notification"><CloseIcon /></button>
  </li>;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const nextId = useRef(0);

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const clear = useCallback(() => {
    for (const timer of timers.current.values()) clearTimeout(timer);
    timers.current.clear();
    setItems([]);
  }, []);

  const push = useCallback((type: ToastType, message: string, options: ToastOptions = {}) => {
    const id = options.id ?? `toast-${Date.now()}-${nextId.current++}`;
    const duration = options.duration ?? (type === "error" ? 0 : 5000);
    const previousTimer = timers.current.get(id);
    if (previousTimer) {
      clearTimeout(previousTimer);
      timers.current.delete(id);
    }
    setItems((current) => [...current.filter((item) => item.id !== id), { ...options, id, message, type }]);
    if (duration > 0) timers.current.set(id, setTimeout(() => dismiss(id), duration));
    return id;
  }, [dismiss]);

  const toast = useMemo<ToastApi>(() => ({
    success: (message, options) => push("success", message, options),
    error: (message, options) => push("error", message, options),
    info: (message, options) => push("info", message, options),
    warning: (message, options) => push("warning", message, options),
    dismiss,
    clear,
  }), [clear, dismiss, push]);

  useEffect(() => () => {
    for (const timer of timers.current.values()) clearTimeout(timer);
  }, []);

  return <ToastContext.Provider value={{ toast }}>
    {children}
    <aside className="pointer-events-none fixed inset-x-4 top-4 z-50 sm:left-auto sm:right-5 sm:w-[min(24rem,calc(100vw-2.5rem))]" aria-label="Notifications">
      <ol className="flex flex-col gap-3">
        {items.map((item) => <ToastCard key={item.id} item={item} onDismiss={dismiss} />)}
      </ol>
    </aside>
  </ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider.");
  return context;
}
