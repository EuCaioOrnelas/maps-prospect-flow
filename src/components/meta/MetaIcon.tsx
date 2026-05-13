import { forwardRef, SVGProps } from "react";

interface MetaIconProps extends Omit<SVGProps<SVGSVGElement>, "size"> {
  size?: number | string;
}

/**
 * Meta infinity mark (monochrome, inherits currentColor) so it matches
 * the rest of the sidebar's black & white iconography.
 */
export const MetaIcon = forwardRef<SVGSVGElement, MetaIconProps>(
  ({ size = 20, ...props }, ref) => (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 287 191"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path d="M31.06 126c0 11 2.41 19.41 5.56 24.51A19 19 0 0 0 53.19 160c8.1 0 15.51-2 29.79-21.76 11.44-15.83 24.92-38 34-51.95l15.36-23.6c10.67-16.39 23-34.61 37.18-47C181.07 5.6 193.54 0 206.09 0c21.07 0 41.14 12.21 56.5 35.11C279.41 60.19 287.5 91.78 287.5 124.39c0 19.39-3.82 33.62-10.32 44.87C271 180.13 258.72 191 238.07 191v-31c17.69 0 22.10-16.25 22.10-34.84 0-26.5-6.18-55.91-19.79-76.93-9.66-14.91-22.18-24-35.95-24-14.89 0-26.88 11.23-40.36 31.27-7.16 10.66-14.51 23.65-22.76 38.31l-9.06 16.06c-18.21 32.31-22.83 39.66-31.95 51.81C84.34 183 70.43 191 53.19 191c-21.27 0-34.72-9.21-43.04-23.10C3.34 156.51 0 141.93 0 125.31z" />
    </svg>
  )
);
MetaIcon.displayName = "MetaIcon";
