import { MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";

export const FloatingChatButton = () => {
  return (
    <Link
      to="/contato"
      aria-label="Falar com a Wiize"
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 transition-transform"
    >
      <MessageCircle size={24} />
    </Link>
  );
};
