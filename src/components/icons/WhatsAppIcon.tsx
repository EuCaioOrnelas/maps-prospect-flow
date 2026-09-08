import type { SVGProps } from "react";
import { FaWhatsapp } from "react-icons/fa";

export function WhatsAppIcon({ size = 18, className, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return <FaWhatsapp size={size} className={className} {...(props as any)} />;
}
