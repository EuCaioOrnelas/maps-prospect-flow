import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, ExternalLink, Search, FileText, Type, Tag, Activity, CalendarDays, Eye, Settings2 } from "lucide-react";
import { toast } from "sonner";

type Post = {
  id: string;
  slug: string;
  title: string;
  status: string;
  featured: boolean;
  published_at: string | null;
  updated_at: string;
  view_count: number;
  category: { name: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  published: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  archived: "bg-destructive/15 text-destructive",
};

export default function AdminBlogList() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("blog_posts")
      .select("id,slug,title,status,featured,published_at,updated_at,view_count,category:blog_categories(name)")
      .order("updated_at", { ascending: false });
    if (error) toast.error("Erro ao carregar: " + error.message);
    setPosts((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", deleteId);
    if (error) toast.error("Erro: " + error.message);
    else {
      toast.success("Post removido");
      setPosts((p) => p.filter((x) => x.id !== deleteId));
    }
    setDeleteId(null);
  };

  const filtered = posts.filter(
    (p) => !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.slug.includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-7 w-7" /> Blog
          </h1>
          <p className="text-muted-foreground mt-1">Gerenciar artigos, categorias e SEO</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/blog/categorias">Categorias</Link>
          </Button>
          <Button onClick={() => navigate("/admin/blog/novo")}>
            <Plus className="h-4 w-4 mr-2" /> Novo post
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead><span className="inline-flex items-center gap-2"><Type className="h-3.5 w-3.5" /> Título</span></TableHead>
              <TableHead><span className="inline-flex items-center gap-2"><Tag className="h-3.5 w-3.5" /> Categoria</span></TableHead>
              <TableHead><span className="inline-flex items-center gap-2"><Activity className="h-3.5 w-3.5" /> Status</span></TableHead>
              <TableHead><span className="inline-flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5" /> Publicado</span></TableHead>
              <TableHead className="text-right"><span className="inline-flex items-center gap-2 justify-end"><Eye className="h-3.5 w-3.5" /> Views</span></TableHead>
              <TableHead className="text-right"><span className="inline-flex items-center gap-2 justify-end"><Settings2 className="h-3.5 w-3.5" /> Ações</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum post encontrado</TableCell></TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id} className="hover:bg-transparent">
                  <TableCell>
                    <div className="font-medium">{p.title}</div>
                    <div className="text-xs text-muted-foreground">/{p.slug}</div>
                  </TableCell>
                  <TableCell className="text-sm">{p.category?.name || "—"}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[p.status]} variant="outline">
                      {p.status}
                    </Badge>
                    {p.featured && <Badge variant="outline" className="ml-1">destaque</Badge>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.published_at ? new Date(p.published_at).toLocaleDateString("pt-BR") : "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm">{p.view_count}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {p.status === "published" && (
                        <Button variant="ghost" size="icon" asChild>
                          <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/blog/${p.id}`)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(p.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover post?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação é permanente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
