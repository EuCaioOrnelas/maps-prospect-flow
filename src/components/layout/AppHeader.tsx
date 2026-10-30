import { MobileNav } from "./MobileNav";
interface AppHeaderProps { profile?: any; onWhatsAppClick?: () => void; }
/** Legacy page slot: only a floating mobile navigation trigger, no header or reserved height. */
export const AppHeader = ({profile,onWhatsAppClick}:AppHeaderProps) => <div className="fixed right-3 bottom-3 z-40 lg:hidden"><MobileNav profile={profile} onWhatsAppClick={onWhatsAppClick}/></div>;
