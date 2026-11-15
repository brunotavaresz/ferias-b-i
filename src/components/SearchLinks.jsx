import { ExternalLink, Search } from "lucide-react";
import { searchLinks } from "../lib/search.js";
import { Button } from "@/components/ui/button";

/* Botões que abrem as pesquisas já com destino, datas e viajantes. */
export default function SearchLinks({ dest, trip, cat, className = "" }) {
  const links = searchLinks(dest, trip)[cat] || [];
  if (!links.length) return null;
  return (
    <div className={"flex flex-wrap items-center gap-2 " + className}>
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Search className="size-4" />Pesquisar{dest.inicio ? "" : " (sem datas)"}:</span>
      {links.map((l) => (
        <Button key={l.label} variant="outline" size="sm" asChild>
          <a href={l.href} target="_blank" rel="noopener noreferrer">{l.label}<ExternalLink className="size-3.5 opacity-60" /></a>
        </Button>
      ))}
    </div>
  );
}
