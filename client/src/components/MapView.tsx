import { useEffect, useMemo } from "react";
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { StopRecord } from "../../../shared/routes";
import "leaflet/dist/leaflet.css";

const CHENNAI_CENTER: [number, number] = [13.0827, 80.2707];

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

type Point = { lat: number; lng: number };
type OverlayPath = { id: number; points: [number, number][] };
type Props = {
  stops: StopRecord[];
  currentLocation: Point | null;
  pickedLocation: Point | null;
  highlightedStopId: number | null;
  overlayPaths?: OverlayPath[];
  onPickLocation?: (point: Point) => void;
};

function MapPicker({ onPickLocation }: { onPickLocation?: (point: Point) => void }): null {
  useMapEvents({
    click(event) {
      if (!onPickLocation) return;
      onPickLocation({ lat: event.latlng.lat, lng: event.latlng.lng });
    }
  });
  return null;
}

function FocusController({
  currentLocation,
  pickedLocation,
  stops
}: {
  currentLocation: Point | null;
  pickedLocation: Point | null;
  stops: StopRecord[];
}): null {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 80);
    return () => window.clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (pickedLocation) {
      map.flyTo([pickedLocation.lat, pickedLocation.lng], 14, { duration: 0.4 });
      return;
    }

    if (currentLocation) {
      map.flyTo([currentLocation.lat, currentLocation.lng], 13, { duration: 0.4 });
      return;
    }

    if (stops.length > 0) {
      const bounds = L.latLngBounds(stops.map((stop) => [stop.latitude, stop.longitude]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
      return;
    }

    map.setView(CHENNAI_CENTER, 11);
  }, [currentLocation, map, pickedLocation, stops]);

  return null;
}

function stopColors(isHighlighted: boolean): { line: string; fill: string } {
  if (isHighlighted) return { line: "#ffffff", fill: "#ffffff3a" };
  return { line: "#b8b8b8", fill: "#b8b8b833" };
}

export function MapView({
  stops,
  currentLocation,
  pickedLocation,
  highlightedStopId,
  overlayPaths = [],
  onPickLocation
}: Props): JSX.Element {
  const orderedStops = useMemo(
    () => [...stops].sort((a, b) => a.sortOrder - b.sortOrder),
    [stops]
  );

  const path = useMemo(() => orderedStops.map((stop) => [stop.latitude, stop.longitude] as [number, number]), [orderedStops]);

  return (
    <div className="map-wrapper">
      <MapContainer center={CHENNAI_CENTER} zoom={11} scrollWheelZoom className="map-fullscreen">
        <MapPicker onPickLocation={onPickLocation} />
        <FocusController currentLocation={currentLocation} pickedLocation={pickedLocation} stops={orderedStops} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {overlayPaths.map((track) =>
          track.points.length > 1 ? (
            <Polyline
              key={`overlay-${track.id}`}
              positions={track.points}
              pathOptions={{ color: "#9b9b9b", weight: 3, dashArray: "9 7", opacity: 0.85 }}
            />
          ) : null
        )}

        {path.length > 1 ? <Polyline positions={path} pathOptions={{ color: "#f5f5f5", weight: 4 }} /> : null}

        {currentLocation ? (
          <Marker position={[currentLocation.lat, currentLocation.lng]} icon={markerIcon}>
            <Popup>Current location</Popup>
          </Marker>
        ) : null}

        {pickedLocation ? (
          <Marker
            position={[pickedLocation.lat, pickedLocation.lng]}
            icon={markerIcon}
            draggable={Boolean(onPickLocation)}
            eventHandlers={{
              dragend(event) {
                if (!onPickLocation) return;
                const next = event.target.getLatLng();
                onPickLocation({ lat: next.lat, lng: next.lng });
              }
            }}
          >
            <Popup>Selected custom point</Popup>
          </Marker>
        ) : null}

        {orderedStops.map((stop) => {
          const colors = stopColors(stop.id === highlightedStopId);
          return (
            <Circle
              key={`circle-${stop.id}`}
              center={[stop.latitude, stop.longitude]}
              radius={stop.radiusMeters}
              pathOptions={{ color: colors.line, fillColor: colors.fill, fillOpacity: 0.3 }}
            >
              <Popup>
                <strong>{stop.label}</strong>
                <br />
                Alert radius: {stop.radiusMeters}m
              </Popup>
            </Circle>
          );
        })}

        {orderedStops.map((stop) => (
          <Marker key={stop.id} position={[stop.latitude, stop.longitude]} icon={markerIcon}>
            <Popup>
              <strong>{stop.label}</strong>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
