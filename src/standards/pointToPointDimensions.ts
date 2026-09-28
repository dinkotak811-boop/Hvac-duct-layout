/**
 * Point-to-Point Dimension Extraction & Annotation Utility
 * 
 * Computes exact Euclidean lengths between every start and end coordinate
 * for 2D flat pattern cut lines, bend lines, seam allowances, and contours.
 */

import { Line2D, Point2D, FlatPatternPart } from '../types';

export interface PointToPointSegment {
  id: string;
  startIndex: number;
  start: Point2D;
  end: Point2D;
  lengthMm: number;
  midpoint: Point2D;
  angleDeg: number;
  labelPosition: Point2D;
  label: string;
  type: 'cut' | 'bend_up' | 'bend_down' | 'seam' | 'notch' | 'guide';
  description?: string;
}

/**
 * Extracts point-to-point segments with lengths, midpoints, and offset label positions
 */
export function extractPointToPointSegments(part: FlatPatternPart): PointToPointSegment[] {
  const segments: PointToPointSegment[] = [];
  let segId = 1;

  if (!part || !part.lines) return segments;

  part.lines.forEach((line, idx) => {
    const dx = line.end.x - line.start.x;
    const dy = line.end.y - line.start.y;
    const len = Math.hypot(dx, dy);

    // Skip negligible micro-segments (< 2mm) to avoid visual clutter
    if (len < 2) return;

    const midX = (line.start.x + line.end.x) / 2;
    const midY = (line.start.y + line.end.y) / 2;
    const angleRad = Math.atan2(dy, dx);
    const angleDeg = (angleRad * 180) / Math.PI;

    // Normal unit vector perpendicular to the segment for text offset
    const nx = -dy / len;
    const ny = dx / len;
    const offsetDist = 6.0; // mm offset

    // Ensure angle is readable (not upside down when viewing CAD drawings)
    let displayAngle = angleDeg;
    if (displayAngle > 90) displayAngle -= 180;
    else if (displayAngle < -90) displayAngle += 180;

    segments.push({
      id: `p2p_${segId++}`,
      startIndex: idx,
      start: { x: Number(line.start.x.toFixed(2)), y: Number(line.start.y.toFixed(2)) },
      end: { x: Number(line.end.x.toFixed(2)), y: Number(line.end.y.toFixed(2)) },
      lengthMm: Number(len.toFixed(1)),
      midpoint: { x: Number(midX.toFixed(2)), y: Number(midY.toFixed(2)) },
      angleDeg: Number(displayAngle.toFixed(1)),
      labelPosition: {
        x: Number((midX + nx * offsetDist).toFixed(2)),
        y: Number((midY + ny * offsetDist).toFixed(2)),
      },
      label: `${len.toFixed(1)} mm`,
      type: line.type,
      description: line.description,
    });
  });

  return segments;
}

/**
 * Formats a point coordinate cleanly as (X, Y)
 */
export function formatPoint(p: Point2D): string {
  return `(${p.x.toFixed(1)}, ${p.y.toFixed(1)})`;
}
