import { DuctCalculationEngine } from './DuctCalculationEngine';
import { DuctCategory, DuctModelId } from '../types';

import { RectangularStraightEngine } from './RectangularStraightEngine';
import { RectangularRadiusElbowEngine } from './RectangularRadiusElbowEngine';
import { RectangularSquareElbowEngine } from './RectangularSquareElbowEngine';
import { SquareToRoundEngine } from './SquareToRoundEngine';
import { RectangularReducerEngine } from './RectangularReducerEngine';
import { RectangularTeeEngine } from './RectangularTeeEngine';
import { RectangularOffsetEngine } from './RectangularOffsetEngine';
import { RegisterBootEngine } from './RegisterBootEngine';
import { PlenumBoxEngine } from './PlenumBoxEngine';
import { EndCapEngine } from './EndCapEngine';
import { DamperSleeveEngine } from './DamperSleeveEngine';

export interface DuctCategoryInfo {
  id: DuctCategory;
  name: string;
  nameBn: string;
  description: string;
  iconName: string;
}

export const DUCT_CATEGORIES: DuctCategoryInfo[] = [
  {
    id: 'straight',
    name: 'Straight Ducts',
    nameBn: 'সোজা ডাক্ট (Straight)',
    description: 'Rectangular straight sections (1-piece wrap, 2-piece L, 4-piece panels)',
    iconName: 'Maximize2',
  },
  {
    id: 'elbow',
    name: 'Elbows & Bends',
    nameBn: 'এলবো ও বেন্ড (Elbows)',
    description: '90°/45° radius elbows and square throat miters with turning vanes',
    iconName: 'CornerDownRight',
  },
  {
    id: 'tee',
    name: 'Tees & Branches',
    nameBn: 'টি ও ব্রাঞ্চ (Tees & Branches)',
    description: 'Rectangular straight and reducing tees with tabbed branch collars',
    iconName: 'GitFork',
  },
  {
    id: 'reducer',
    name: 'Reducers & Transitions',
    nameBn: 'রিডিউসার ও ট্রানজিশন',
    description: 'Rectangular tapers (concentric/FOB/FOT/FOS) and square-to-round triangulation',
    iconName: 'Minimize2',
  },
  {
    id: 'offset',
    name: 'Offsets & Jogs',
    nameBn: 'অফসেট ও জগ (Offsets)',
    description: 'S-Curve and Z-Offset obstacle bypass transitions',
    iconName: 'TrendingUp',
  },
  {
    id: 'special',
    name: 'Special & Fittings',
    nameBn: 'স্পেশাল ফিটিংস (Special)',
    description: 'Plenums, Register Boots, End Caps, and Damper Sleeves',
    iconName: 'Box',
  },
];

class CalculationEngineFactory {
  private engines = new Map<DuctModelId, DuctCalculationEngine>();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults() {
    this.register(new RectangularStraightEngine());
    this.register(new RectangularRadiusElbowEngine());
    this.register(new RectangularSquareElbowEngine());
    this.register(new SquareToRoundEngine());
    this.register(new RectangularReducerEngine());
    this.register(new RectangularTeeEngine());
    this.register(new RectangularOffsetEngine());
    this.register(new RegisterBootEngine());
    this.register(new PlenumBoxEngine());
    this.register(new EndCapEngine());
    this.register(new DamperSleeveEngine());
  }

  public register(engine: DuctCalculationEngine) {
    this.engines.set(engine.id, engine);
  }

  public getEngine(modelId: DuctModelId): DuctCalculationEngine {
    const engine = this.engines.get(modelId);
    if (!engine) {
      throw new Error(`Calculation engine not found for model: ${modelId}`);
    }
    return engine;
  }

  public getAllEngines(): DuctCalculationEngine[] {
    return Array.from(this.engines.values());
  }

  public getEnginesByCategory(category: DuctCategory): DuctCalculationEngine[] {
    return this.getAllEngines().filter(e => e.category === category);
  }
}

export const EngineFactory = new CalculationEngineFactory();
