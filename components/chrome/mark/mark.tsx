export function Mark({ size = 19, ...props }: { size?: number } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d="M4.9 19.1a10 10 0 0 1 0-14.2M8 16a6 6 0 0 1 0-8M16 8a6 6 0 0 1 0 8M19.1 4.9a10 10 0 0 1 0 14.2" />
      <circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" />
    </svg>
  );
}
