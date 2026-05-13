import { forwardRef, SVGProps } from "react";

interface MetaIconProps extends Omit<SVGProps<SVGSVGElement>, "size"> {
  size?: number | string;
}

/**
 * Meta infinity mark — monochrome, inherits currentColor so it matches
 * the sidebar's black/white icon style.
 */
export const MetaIcon = forwardRef<SVGSVGElement, MetaIconProps>(
  ({ size = 20, ...props }, ref) => (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 256 171"
      fill="none"
      stroke="currentColor"
      strokeWidth={22}
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path d="M27 128c0 18 9 32 26 32 20 0 33-13 64-67 24-42 41-63 67-63 22 0 35 16 35 40 0 28-15 60-32 60-12 0-22-7-32-26-13-25-27-55-44-78C97 6 80 0 64 0 33 0 11 31 11 78c0 28 7 50 22 50z" />
    </svg>
  )
);
MetaIcon.displayName = "MetaIcon";
