import { useState } from "react";
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface EmailCaptureModalProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 onSubmit: (email: string) => void;
 loading: boolean;
 planName: string;
}

export const EmailCaptureModal = ({
 open,
 onOpenChange,
 onSubmit,
 loading,
 planName,
}: EmailCaptureModalProps) => {
 const [email, setEmail] = useState("");

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (email) {
 onSubmit(email);
 }
 };

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="sm:max-w-md">
 <DialogHeader>
 <DialogTitle>Quase lá!</DialogTitle>
 <DialogDescription>
 Digite seu e-mail para continuar com o plano <strong>{planName}</strong>
 </DialogDescription>
 </DialogHeader>
 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="space-y-2">
 <Label htmlFor="email">E-mail</Label>
 <Input
 id="email"
 type="email"
 placeholder="seu@email.com"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 required
 autoFocus
 />
 </div>
 <Button type="submit" className="w-full" disabled={loading || !email}>
 {loading ? (
 <>
 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
 Processando...
 </>
 ) : (
 "Continuar para pagamento"
 )}
 </Button>
 </form>
 </DialogContent>
 </Dialog>
 );
};
