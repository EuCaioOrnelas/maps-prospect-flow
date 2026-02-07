import { useState } from "react";
import { motion } from "framer-motion";
import { Send, User } from "lucide-react";

interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: Date;
}

const MOCK_COMMENTS: Comment[] = [
  {
    id: "1",
    author: "Carlos M.",
    text: "Excelente explicação! Consegui aplicar no mesmo dia e já vi resultado.",
    createdAt: new Date("2025-01-15"),
  },
  {
    id: "2",
    author: "Ana S.",
    text: "Muito didático, recomendo assistir mais de uma vez para absorver tudo.",
    createdAt: new Date("2025-01-20"),
  },
  {
    id: "3",
    author: "Roberto L.",
    text: "Esse passo a passo foi o que faltava pra eu configurar corretamente. Obrigado!",
    createdAt: new Date("2025-02-01"),
  },
];

export const VideoComments = () => {
  const [comments, setComments] = useState<Comment[]>(MOCK_COMMENTS);
  const [newComment, setNewComment] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Date.now().toString(),
      author: "Você",
      text: newComment.trim(),
      createdAt: new Date(),
    };
    setComments((prev) => [comment, ...prev]);
    setNewComment("");
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-foreground">
        Comentários ({comments.length})
      </h3>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
          <User size={16} className="text-primary" />
        </div>
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Deixe seu comentário (opcional)..."
            className="flex-1 bg-muted/30 border border-border/50 rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition"
          />
          <button
            type="submit"
            disabled={!newComment.trim()}
            className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            <Send size={14} />
            <span className="hidden sm:inline">Enviar</span>
          </button>
        </div>
      </form>

      {/* Comments list */}
      <div className="space-y-4">
        {comments.map((comment, i) => (
          <motion.div
            key={comment.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex gap-3"
          >
            <div className="w-9 h-9 rounded-full bg-muted/50 border border-border/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-muted-foreground">
                {comment.author.charAt(0)}
              </span>
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{comment.author}</span>
                <span className="text-[11px] text-muted-foreground">{formatDate(comment.createdAt)}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{comment.text}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
