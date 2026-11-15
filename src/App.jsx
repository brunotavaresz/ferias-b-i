import { Routes, Route, Link, Navigate } from "react-router-dom";
import { LogOut, Monitor, Moon, Sun, Plane } from "lucide-react";
import { useAuth, login, logout } from "./lib/auth.js";
import { demo, exitDemo, resetDemo } from "./lib/store.js";
import { demoSeed } from "./lib/demoData.js";
import { firebaseEnabled } from "./lib/firebase.js";
import { initials } from "./lib/format.js";
import { useTheme } from "./lib/theme.js";
import TripList from "./components/TripList.jsx";
import TripView from "./components/TripView.jsx";
import { useToast } from "./components/common.jsx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
  DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";

export default function App() {
  const { loading, user } = useAuth();
  const toast = useToast();
  if (loading) return <div className="grid min-h-svh place-items-center text-sm text-muted-foreground">A carregar…</div>;
  if (!user) {
    return (
      <div className="grid min-h-svh place-items-center bg-muted/40 p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="flex flex-col items-center gap-6 text-center">
            <Logo big />
            <p className="text-sm text-muted-foreground">Guardem voos, alojamentos e transportes de vários destinos, comparem tudo com as vossas prioridades e montem o roteiro dia a dia.</p>
            <Button size="lg" className="w-full" onClick={() => login().catch((e) => toast(loginError(e), "err"))}>
              <GoogleIcon /> Entrar com Google
            </Button>
            <Button variant="link" asChild><a href="#/demo" onClick={() => setTimeout(() => location.reload(), 0)}>Ver uma demonstração sem entrar</a></Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  return (
    <div className="min-h-svh">
      <header className="no-print sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <Link to="/" className="rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"><Logo /></Link>
          <div className="flex items-center gap-2">
            {demo.active ? (
              <>
                <Badge className="bg-brand text-brand-foreground">Demonstração</Badge>
                <Button variant="ghost" size="sm" onClick={() => { resetDemo(demoSeed); toast("Demo reposta"); }}>Repor</Button>
                <Button variant="outline" size="sm" onClick={() => { exitDemo(); location.hash = "#/"; location.reload(); }}>Sair da demo</Button>
              </>
            ) : !firebaseEnabled && <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400">Modo local</Badge>}
            <ThemeMenu />
            <UserMenu user={user} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-6">
        <Routes>
          <Route path="/" element={<TripList user={user} />} />
          <Route path="/t/:tripId/*" element={<TripView user={user} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function ThemeMenu() {
  const { theme, resolved, setTheme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Tema">{resolved === "dark" ? <Moon /> : <Sun />}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light"><Sun /> Claro</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark"><Moon /> Escuro</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system"><Monitor /> Como o sistema</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu({ user }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Conta">
          <Avatar className="size-8">
            {user.photo && <AvatarImage src={user.photo} alt="" referrerPolicy="no-referrer" />}
            <AvatarFallback className="text-xs">{initials(user.name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="text-sm font-medium">{user.name}</div>
          <div className="truncate text-xs text-muted-foreground">{user.email}</div>
        </DropdownMenuLabel>
        {firebaseEnabled && !demo.active && <><DropdownMenuSeparator /><DropdownMenuItem onClick={logout}><LogOut /> Sair</DropdownMenuItem></>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function loginError(e) {
  if (e?.code === "auth/popup-closed-by-user") return "Fechaste a janela de login.";
  if (e?.code === "auth/unauthorized-domain") return "Este domínio não está autorizado no Firebase (Authentication > Settings > Authorized domains).";
  return "Não foi possível entrar. Tenta outra vez.";
}

export function Logo({ big }) {
  return (
    <span className={"flex items-center gap-2 font-semibold tracking-tight " + (big ? "text-2xl" : "text-base")}>
      <span className={"grid place-items-center rounded-lg bg-brand text-brand-foreground " + (big ? "size-11" : "size-8")}>
        <Plane className={big ? "size-6" : "size-4"} />
      </span>
      Férias a Dois
    </span>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.7 2.3 2.4 6.6 2.4 12s4.3 9.7 9.6 9.7c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}
