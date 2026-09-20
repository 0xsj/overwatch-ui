import type { PlaceGeometry } from "./index";

export type PlaceMapPoint = {
  x: number;
  y: number;
};

/** Project authored longitude/latitude onto a deterministic equirectangular canvas.
 *
 * This deliberately does not try to draw geography or call a geocoder. The
 * map is a provenance surface: the coordinates are the authored values, and
 * the canvas makes their relative position and precision visible without
 * pretending that an external basemap is evidence. */
export function projectPlaceGeometry(geometry: PlaceGeometry, width: number, height: number): PlaceMapPoint {
  return {
    x: ((geometry.longitude + 180) / 360) * width,
    y: ((90 - geometry.latitude) / 180) * height,
  };
}

export function placePrecisionLabel(precision: PlaceGeometry["precision"]): string {
  return precision === "exact" ? "Exact coordinate" : precision === "approximate" ? "Approximate coordinate" : "Regional coordinate";
}
