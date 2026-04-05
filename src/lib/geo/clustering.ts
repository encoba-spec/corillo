/**
 * DBSCAN clustering for running zones.
 * Groups activity start points into clusters (zones).
 *
 * Why DBSCAN over K-Means:
 * - Auto-detects number of clusters
 * - Handles noise gracefully (one-off runs ignored)
 * - Epsilon maps directly to our privacy grid (~500m)
 */

import { haversineDistance } from "./fuzzy";

interface Point {
  lat: number;
  lng: number;
  index: number;
}

interface Cluster {
  points: Point[];
  centerLat: number;
  centerLng: number;
  radius: number; // meters
}

const UNVISITED = 0;
const NOISE = -1;

/**
 * Run DBSCAN clustering on GPS coordinates.
 * @param points Array of {lat, lng} pairs
 * @param epsilon Maximum distance between points in a cluster (meters)
 * @param minPoints Minimum points to form a cluster
 */
export function dbscan(
  points: { lat: number; lng: number }[],
  epsilon = 500,
  minPoints = 3
): Cluster[] {
  const indexed: Point[] = points.map((p, i) => ({ ...p, index: i }));
  const labels = new Array(indexed.length).fill(UNVISITED);
  let clusterId = 0;

  for (let i = 0; i < indexed.length; i++) {
    if (labels[i] !== UNVISITED) continue;

    const neighbors = regionQuery(indexed, indexed[i], epsilon);

    if (neighbors.length < minPoints) {
      labels[i] = NOISE;
      continue;
    }

    clusterId++;
    labels[i] = clusterId;

    const seedSet = [...neighbors.filter((n) => n.index !== i)];
    let j = 0;

    while (j < seedSet.length) {
      const current = seedSet[j];

      if (labels[current.index] === NOISE) {
        labels[current.index] = clusterId;
      }

      if (labels[current.index] !== UNVISITED) {
        j++;
        continue;
      }

      labels[current.index] = clusterId;

      const currentNeighbors = regionQuery(indexed, current, epsilon);
      if (currentNeighbors.length >= minPoints) {
        for (const neighbor of currentNeighbors) {
          if (
            labels[neighbor.index] === UNVISITED ||
            labels[neighbor.index] === NOISE
          ) {
            if (!seedSet.some((s) => s.index === neighbor.index)) {
              seedSet.push(neighbor);
            }
          }
        }
      }

      j++;
    }
  }

  // Group points by cluster
  const clusterMap = new Map<number, Point[]>();
  for (let i = 0; i < labels.length; i++) {
    if (labels[i] > 0) {
      if (!clusterMap.has(labels[i])) {
        clusterMap.set(labels[i], []);
      }
      clusterMap.get(labels[i])!.push(indexed[i]);
    }
  }

  // Compute cluster centers and radii
  const clusters: Cluster[] = [];
  for (const [, clusterPoints] of clusterMap) {
    const centerLat =
      clusterPoints.reduce((sum, p) => sum + p.lat, 0) / clusterPoints.length;
    const centerLng =
      clusterPoints.reduce((sum, p) => sum + p.lng, 0) / clusterPoints.length;

    const radius = Math.max(
      ...clusterPoints.map((p) =>
        haversineDistance(centerLat, centerLng, p.lat, p.lng)
      ),
      100 // minimum radius
    );

    clusters.push({
      points: clusterPoints,
      centerLat,
      centerLng,
      radius,
    });
  }

  return clusters;
}

function regionQuery(
  points: Point[],
  target: Point,
  epsilon: number
): Point[] {
  return points.filter(
    (p) =>
      haversineDistance(target.lat, target.lng, p.lat, p.lng) <= epsilon
  );
}
