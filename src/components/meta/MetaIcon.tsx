import { forwardRef, SVGProps } from "react";

interface MetaIconProps extends Omit<SVGProps<SVGSVGElement>, "size"> {
  size?: number | string;
}

/**
 * Official Meta "infinity" mark — single-color, inherits currentColor
 * so it follows the sidebar token system.
 */
export const MetaIcon = forwardRef<SVGSVGElement, MetaIconProps>(
  ({ size = 20, ...props }, ref) => (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path d="M9.6 7.2c2.3 0 4.2 1.4 6.4 4.7 2.3-3.3 4.1-4.7 6.4-4.7 3.7 0 6.4 3.4 6.4 8.6 0 5.2-2.8 8.9-6.4 8.9-2.4 0-4.1-1.2-6-4.2-1.9 3-3.6 4.2-6 4.2-3.6 0-6.4-3.6-6.4-8.8 0-5.2 2.7-8.7 5.6-8.7zm12.5 3.4c-1.5 0-2.7 1.1-4 3.1 1.4 2.2 2.4 5 4 5 1.7 0 2.9-2.1 2.9-4.5 0-2.3-1.1-3.6-2.9-3.6zm-12.4 0c-1.7 0-2.9 1.4-2.9 3.7 0 2.4 1.2 4.4 2.9 4.4 1.6 0 2.6-2.7 4-4.9-1.3-2-2.5-3.2-4-3.2z" />
    </svg>
  )
);
MetaIcon.displayName = "MetaIcon";
