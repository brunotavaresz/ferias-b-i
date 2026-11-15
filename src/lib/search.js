/* Links de pesquisa já com destino, datas e viajantes. */
import { CITY_AIRPORTS } from "./model.js";

const enc = encodeURIComponent;
const yymmdd = (d) => (d ? d.slice(2, 4) + d.slice(5, 7) + d.slice(8, 10) : "");

export function searchLinks(dest, trip) {
  const city = dest?.nome || "";
  const adults = Number(trip?.pessoas) || 2;
  const { inicio, fim } = dest || {};
  const from = trip?.origem || "Porto";
  const fromIata = (trip?.origemAeroporto || CITY_AIRPORTS[from] || "OPO").toLowerCase();
  const toIata = (dest?.aeroporto || CITY_AIRPORTS[city] || "").toLowerCase();
  const dates = inicio && fim;
  const L = {
    voo: [
      { label: "Google Flights", href: `https://www.google.com/travel/flights?hl=pt-PT&curr=EUR&q=${enc(`Voos de ${from} para ${city}${dates ? ` de ${inicio} a ${fim}` : ""} ${adults} adultos`)}` },
      toIata && { label: "Skyscanner", href: `https://www.skyscanner.pt/transporte/voos/${fromIata}/${toIata}/${dates ? `${yymmdd(inicio)}/${yymmdd(fim)}/` : ""}?adultsv2=${adults}&cabinclass=economy` },
    ],
    alojamento: [
      { label: "Booking", href: `https://www.booking.com/searchresults.pt-pt.html?ss=${enc(city)}${dates ? `&checkin=${inicio}&checkout=${fim}` : ""}&group_adults=${adults}&no_rooms=1&group_children=0` },
      { label: "Airbnb", href: `https://www.airbnb.pt/s/${enc(city)}/homes?adults=${adults}${dates ? `&checkin=${inicio}&checkout=${fim}` : ""}` },
    ],
    transporte: [
      { label: "Aeroporto → centro", href: `https://www.google.com/maps/dir/?api=1&origin=${enc(`Aeroporto ${city}`)}&destination=${enc(city)}&travelmode=transit` },
      { label: "Rome2Rio", href: `https://www.rome2rio.com/s/${enc(from)}/${enc(city)}` },
    ],
    atividade: [
      { label: "GetYourGuide", href: `https://www.getyourguide.pt/s/?q=${enc(city)}${dates ? `&date_from=${inicio}&date_to=${fim}` : ""}` },
      { label: "O que ver (Maps)", href: `https://www.google.com/maps/search/${enc(`atrações ${city}`)}` },
    ],
  };
  for (const k of Object.keys(L)) L[k] = L[k].filter(Boolean);
  return L;
}
