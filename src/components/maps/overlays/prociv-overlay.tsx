"use client";

import { CircleMarker, Popup } from "react-leaflet";
import type { ProCivIncident } from "@/lib/overlays/prociv-api";
import { getIncidentColor, getIncidentRadius } from "@/lib/overlays/prociv-api";

export type ProCivOverlayProps = {
  incidents: ProCivIncident[];
};

export function ProCivOverlay({ incidents }: ProCivOverlayProps) {
  return (
    <>
      {incidents.map((incident) => {
        const color = getIncidentColor(incident.naturezaCode);
        const radius = getIncidentRadius(incident.man, incident.important);
        const timestamp = incident.dateTime.sec * 1000;

        return (
          <CircleMarker
            key={incident.id}
            center={[incident.lat, incident.lng]}
            radius={radius}
            pathOptions={{
              fillColor: color,
              fillOpacity: incident.active ? 0.7 : 0.35,
              color: incident.important ? "#fff" : color,
              weight: incident.important ? 2.5 : 1.5,
              opacity: incident.active ? 0.9 : 0.5,
              dashArray: incident.active ? undefined : "4 4",
            }}
          >
            <Popup>
              <div className="grid gap-1 min-w-[200px]">
                <div className="font-semibold text-sm">{incident.natureza}</div>
                <div className="text-xs text-muted-foreground">
                  {incident.location}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(timestamp).toLocaleString()}
                </div>
                <div
                  className="inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: `#${incident.statusColor}20`,
                    color: `#${incident.statusColor}`,
                  }}
                >
                  {incident.status}
                </div>
                {(incident.man > 0 || incident.terrain > 0 || incident.aerial > 0) && (
                  <div className="flex gap-3 text-xs text-muted-foreground pt-1">
                    {incident.man > 0 && (
                      <span>{incident.man} operacionais</span>
                    )}
                    {incident.terrain > 0 && (
                      <span>{incident.terrain} terrestres</span>
                    )}
                    {incident.aerial > 0 && (
                      <span>{incident.aerial} aéreos</span>
                    )}
                  </div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}
