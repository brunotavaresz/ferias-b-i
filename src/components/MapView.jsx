import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip as MapLabel, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed, MapPin } from "lucide-react";
import { geocode, kmBetween } from "../lib/geo.js";
import { CATEGORIES } from "../lib/model.js";
import { eur } from "../lib/format.js";
import { useToast } from "./common.jsx";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const COLORS = { alojamento: "var(--chart-2)", atividade: "var(--chart-4)", transporte: "var(--chart-3)", voo: "var(--chart-1)" };

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView(points[0], 14);
    else map.fitBounds(points, { padding: [40, 40], maxZoom: 15 });
  }, [map, JSON.stringify(points)]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/* Mapa do destino: centro, alojamentos e atividades (todas as categorias com localização). */
export default function MapView({ ctx, dest, scored }) {
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const opts = useMemo(() => ctx.options.filter((o) => o.destinationId === dest.id && !o.descartado && (o.categoria === "alojamento" || o.categoria === "atividade")), [ctx.options, dest.id]);
  const scoreOf = Object.fromEntries((scored || []).map((x) => [x.o.id, x.score]));
  const located = opts.filter((o) => o.lat && o.lng);
  const missing = opts.filter((o) => !(o.lat && o.lng));
  const center = dest.lat && dest.lng ? [dest.lat, dest.lng] : null;
  const points = [...(center ? [center] : []), ...located.map((o) => [o.lat, o.lng])];

  async function locateDest() {
    setBusy("dest");
    const g = await geocode(`${dest.nome}${dest.pais ? ", " + dest.pais : ""}`);
    setBusy(null);
    if (!g) return toast("Não encontrei esse destino no mapa.", "err");
    await ctx.upsert("destinations", { id: dest.id, lat: g.lat, lng: g.lng });
  }
  async function locate(o) {
    setBusy(o.id);
    const g = await geocode(`${o.morada || o.nome}, ${dest.nome}`);
    setBusy(null);
    if (!g) return toast(`Não encontrei "${o.morada || o.nome}". Põe a morada em Editar.`, "err");
    const patch = { id: o.id, lat: g.lat, lng: g.lng };
    if (o.categoria === "alojamento" && o.distancia == null && dest.lat) patch.distancia = kmBetween(dest, g);
    await ctx.upsert("options", patch);
  }

  if (!points.length) {
    return (
      <Card className="items-center gap-3 px-6 py-12 text-center">
        <MapPin className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Ainda não há nada localizado em {dest.nome}.</p>
        <Button onClick={locateDest} disabled={busy === "dest"}><LocateFixed /> Localizar {dest.nome}</Button>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      <Card className="overflow-hidden p-0">
        <MapContainer center={points[0]} zoom={13} scrollWheelZoom className="z-0 h-[480px] w-full">
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <FitBounds points={points} />
          {center && (
            <CircleMarker center={center} radius={7} pathOptions={{ color: "#111", fillColor: "#fff", fillOpacity: 1, weight: 3 }}>
              <Popup>Centro de {dest.nome}</Popup>
            </CircleMarker>
          )}
          {located.map((o) => (
            <CircleMarker key={o.id} center={[o.lat, o.lng]} radius={o.escolhido ? 11 : 9}
              pathOptions={{ color: o.escolhido ? "#16a34a" : "#fff", weight: o.escolhido ? 4 : 2, fillColor: COLORS[o.categoria], fillOpacity: 0.95 }}>
              <MapLabel permanent direction="right" offset={[10, 0]} opacity={0.95}>{o.nome.length > 24 ? o.nome.slice(0, 23) + "…" : o.nome}</MapLabel>
              <Popup>
                <div className="space-y-0.5">
                  <b>{o.nome}</b><br />
                  {CATEGORIES[o.categoria].one}{o.preco != null ? ` · ${eur(o.preco)}` : ""}{scoreOf[o.id] != null ? ` · ${scoreOf[o.id]} pts` : ""}
                  {center && <><br />{kmBetween(dest, o)} km do centro</>}
                  {o.escolhido && <><br /><b>Escolhido</b></>}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </Card>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full border-2 border-foreground bg-background" />Centro</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-chart-2" />Alojamento</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-chart-4" />Atividade</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full border-2 border-green-600" />Escolhido</span>
        {!center && <Button size="xs" variant="outline" onClick={locateDest} disabled={busy === "dest"}><LocateFixed /> Marcar o centro</Button>}
      </div>
      {missing.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Sem localização:</span>
          {missing.map((o) => (
            <Button key={o.id} size="sm" variant="outline" disabled={busy === o.id} onClick={() => locate(o)}><LocateFixed /> {o.nome}</Button>
          ))}
        </div>
      )}
    </div>
  );
}
