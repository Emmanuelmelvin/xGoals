import type { SVGProps } from "react";

export function XGoalMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
      <rect x="1.5" y="1.5" width="29" height="29" rx="9" fill="#10141c" />
      <path
        d="M8.5 22.5 21.9 9.1M10.1 9.4l12.4 12.4"
        stroke="#f8fafc"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M6.2 16.8a10.6 10.6 0 0 1 15.1-9.6"
        stroke="#60a5fa"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="m20.3 6.5 1.5.7-.7 1.5" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="22.1" cy="9" r="2" fill="#60a5fa" stroke="#f8fafc" strokeWidth="1" />
    </svg>
  );
}
