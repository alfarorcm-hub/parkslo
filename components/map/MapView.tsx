"use client";

import { Fragment, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Circle, Polyline, Popup, useMap } from "react-leaflet";
import { statusKindFor, status, brand } from "@/lib/theme";
import type { Destination, RankedSpot, UnknownSpot } from "@/lib/types";
import { destinationIcon, numberedSpotIcon, unknownSpotIcon } from "./icons";

const SLO_CENTER: [number, number] = [35.28, -120.663];
const DEFAULT_ZOOM = 16;
const WALK_SPEED_METERS_PER_MIN = 80;
const DETOUR_FACTOR = 1.3;

function walkMinutesToMeters(minutes: number): number {
  return (minutes * WALK_SPEED_METERS_PER_MIN) / DETOUR_FACTOR;
}

function midpoint(spot: RankedSpot["spot"]): [number, number] {
  if (spot.geometry === "segment" && spot.lat2 != null && spot.lng2 != null) {
    return [(spot.lat + spot.lat2) / 2, (spot.lng + spot.lng2) / 2];
  }
  return [spot.lat, spot.lng];
}

function Recenter({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, DEFAULT_ZOOM, { animate: true });
  }, [position, map]);
  return null;
}

export interface MapViewProps {
  destination: Destination | null;
  results: RankedSpot[];
  unknownSpots: UnknownSpot[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  maxWalk: number;
}

export default function MapView({
  destination,
  results,
  unknownSpots,
  selectedId,
  onSelect,
  maxWalk,
}: MapViewProps) {
  const selected = results.find((r) => r.spot.id === selectedId) ?? null;
  const destPos: [number, number] | null = destination
    ? [destination.lat, destination.lng]
    : null;

  return (
    <MapContainer
      center={SLO_CENTER}
      zoom={DEFAULT_ZOOM}
      scrollWheelZoom
      className="h-full w-full"
      attributionControl={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={19}
      />

      {destPos && <Recenter position={destPos} />}

      {destPos && (
        <>
          <Circle
            center={destPos}
            radius={walkMinutesToMeters(maxWalk)}
            pathOptions={{
              color: brand.pathBlue,
              fillColor: brand.pathBlue,
              fillOpacity: 0.08,
              opacity: 0.25,
              weight: 1,
            }}
          />
          <Marker position={destPos} icon={destinationIcon()} />
        </>
      )}

      {results.map((r, i) => {
        const isSelected = r.spot.id === selectedId;
        const kind = r.evaluation.hasUnknownWindow
          ? "unknown"
          : statusKindFor(r.spot.kind, r.evaluation.totalCost);
        const icon = numberedSpotIcon(kind, i + 1, isSelected);
        const isSegment =
          r.spot.geometry === "segment" && r.spot.lat2 != null && r.spot.lng2 != null;

        return (
          <Fragment key={r.spot.id}>
            {isSegment && (
              <Polyline
                positions={[
                  [r.spot.lat, r.spot.lng],
                  [r.spot.lat2 as number, r.spot.lng2 as number],
                ]}
                pathOptions={{ color: status[kind], weight: isSelected ? 7 : 5, opacity: 0.85 }}
                eventHandlers={{ click: () => onSelect(r.spot.id) }}
              />
            )}
            <Marker
              position={midpoint(r.spot)}
              icon={icon}
              eventHandlers={{ click: () => onSelect(r.spot.id) }}
            />
          </Fragment>
        );
      })}

      {unknownSpots.map((s) => (
        <Marker key={s.id} position={[s.lat, s.lng]} icon={unknownSpotIcon()}>
          <Popup>
            <strong>{s.name}</strong>
            <br />
            Rules unknown — check posted signs.
          </Popup>
        </Marker>
      ))}

      {selected && destPos && (
        <Polyline
          positions={[midpoint(selected.spot), destPos]}
          pathOptions={{
            color: brand.pathBlue,
            weight: 3,
            dashArray: "2 10",
            lineCap: "round",
          }}
        />
      )}
    </MapContainer>
  );
}
