import { Point2D, Line2D } from '../types';

export interface NotchParams {
  depth: number;
  width?: number;
  angleDeg?: number;
}

/**
 * Generate 2D lines for a corner 45-degree or TDC corner notch
 */
export function createCornerNotchLines(
  cornerOrigin: Point2D,
  flangeDepth: number,
  seamAllowance: number,
  cornerType: 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right'
): Line2D[] {
  const lines: Line2D[] = [];
  const d = flangeDepth;
  const s = seamAllowance;
  
  if (d <= 0) return lines;

  // Generate notched boundary lines replacing sharp corner
  switch (cornerType) {
    case 'top_left':
      lines.push(
        {
          start: { x: cornerOrigin.x + s, y: cornerOrigin.y },
          end: { x: cornerOrigin.x, y: cornerOrigin.y + d },
          type: 'notch',
          description: 'Corner Notch',
        }
      );
      break;
    case 'top_right':
      lines.push(
        {
          start: { x: cornerOrigin.x - s, y: cornerOrigin.y },
          end: { x: cornerOrigin.x, y: cornerOrigin.y + d },
          type: 'notch',
          description: 'Corner Notch',
        }
      );
      break;
    case 'bottom_left':
      lines.push(
        {
          start: { x: cornerOrigin.x + s, y: cornerOrigin.y },
          end: { x: cornerOrigin.x, y: cornerOrigin.y - d },
          type: 'notch',
          description: 'Corner Notch',
        }
      );
      break;
    case 'bottom_right':
      lines.push(
        {
          start: { x: cornerOrigin.x - s, y: cornerOrigin.y },
          end: { x: cornerOrigin.x, y: cornerOrigin.y - d },
          type: 'notch',
          description: 'Corner Notch',
        }
      );
      break;
  }

  return lines;
}

/**
 * Generate V-notch at a bend line on an edge
 */
export function createVNotch(
  centerOnEdge: Point2D,
  depth: number,
  angleDeg: number = 90,
  edgeDirection: 'horizontal_top' | 'horizontal_bottom' | 'vertical_left' | 'vertical_right'
): Line2D[] {
  const halfSpread = depth * Math.tan(((angleDeg / 2) * Math.PI) / 180);
  const lines: Line2D[] = [];

  switch (edgeDirection) {
    case 'horizontal_top':
      lines.push(
        {
          start: { x: centerOnEdge.x - halfSpread, y: centerOnEdge.y },
          end: { x: centerOnEdge.x, y: centerOnEdge.y - depth },
          type: 'cut',
          description: 'V-Notch',
        },
        {
          start: { x: centerOnEdge.x, y: centerOnEdge.y - depth },
          end: { x: centerOnEdge.x + halfSpread, y: centerOnEdge.y },
          type: 'cut',
          description: 'V-Notch',
        }
      );
      break;

    case 'horizontal_bottom':
      lines.push(
        {
          start: { x: centerOnEdge.x - halfSpread, y: centerOnEdge.y },
          end: { x: centerOnEdge.x, y: centerOnEdge.y + depth },
          type: 'cut',
          description: 'V-Notch',
        },
        {
          start: { x: centerOnEdge.x, y: centerOnEdge.y + depth },
          end: { x: centerOnEdge.x + halfSpread, y: centerOnEdge.y },
          type: 'cut',
          description: 'V-Notch',
        }
      );
      break;

    case 'vertical_left':
      lines.push(
        {
          start: { x: centerOnEdge.x, y: centerOnEdge.y - halfSpread },
          end: { x: centerOnEdge.x + depth, y: centerOnEdge.y },
          type: 'cut',
          description: 'V-Notch',
        },
        {
          start: { x: centerOnEdge.x + depth, y: centerOnEdge.y },
          end: { x: centerOnEdge.x, y: centerOnEdge.y + halfSpread },
          type: 'cut',
          description: 'V-Notch',
        }
      );
      break;

    case 'vertical_right':
      lines.push(
        {
          start: { x: centerOnEdge.x, y: centerOnEdge.y - halfSpread },
          end: { x: centerOnEdge.x - depth, y: centerOnEdge.y },
          type: 'cut',
          description: 'V-Notch',
        },
        {
          start: { x: centerOnEdge.x - depth, y: centerOnEdge.y },
          end: { x: centerOnEdge.x, y: centerOnEdge.y + halfSpread },
          type: 'cut',
          description: 'V-Notch',
        }
      );
      break;
  }

  return lines;
}
