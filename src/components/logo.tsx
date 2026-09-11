import type { SVGProps } from "react";

export function XGoalsMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path
        d="M8 8l8.5 16.5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M24 8l-8.5 16.5c-1.5 3-4.5 3-5.5 0s1-6 4-6h6.5c3.5 0 4.5 3 3.5 6s-4 4-7 2"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
