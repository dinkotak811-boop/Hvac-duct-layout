import { DuctCalculationEngine } from './DuctCalculationEngine';
import { DuctCategory, DuctModelId } from '../types';

import { RectangularStraightEngine } from './RectangularStraightEngine';
import { RoundStraightEngine } from './RoundStraightEngine';
import { OvalStraightEngine } from './OvalStraightEngine';
import { RectangularRadiusElbowEngine } from './RectangularRadiusElbowEngine';
import { RectangularSquareElbowEngine } from './RectangularSquareElbowEngine';
import { RoundSegmentedElbowEngine } from './RoundSegmentedElbowEngine';
import { SquareToRoundEngine } from './SquareToRoundEngine';
import { RoundReducerEngine } from './RoundReducerEngine';
import { RectangularReducerEngine } from './RectangularReducerEngine';
import { RoundTeeEngine } from './RoundTeeEngine';
import { RectangularTeeEngine } from './RectangularTeeEngine';
import { WyeBranchEngine } from './WyeBranchEngine';
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
    description: 'Rectangular, Round, and Flat Oval straight sections',
    iconName: 'Maximize2',
  },
  {
    id: 'elbow',
    name: 'Elbows & Bends',
    nameBn: 'এলবো ও বেন্ড (Elbows)',
    description: '90°/45° Radius, Square Throat, and Lobster Back Gores',
    iconName: 'CornerDownRight',
  },
  {
    id: 'tee',
    name: 'Tees & Branches',
    nameBn: 'টি ও ব্রাঞ্চ (Tees & Branches)',
    description: 'Straight Tee, Reducing Tee, 90° Fish-Mouth, and Wye Pant Leg',
    iconName: 'GitFork',
  },
  {
    id: 'reducer',
    name: 'Reducers & Transitions',
    nameBn: 'রিডিউসার ও ট্রানজিশন',
    description: 'Square-to-Round Triangulation, Conical, and Rectangular Tapers',
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
    this.register(new RoundStraightEngine());
    this.register(new OvalStraightEngine());
    this.register(new RectangularRadiusElbowEngine());
    this.register(new RectangularSquareElbowEngine());
    this.register(new RoundSegmentedElbowEngine());
    this.register(new SquareToRoundEngine());
    this.register(new RoundReducerEngine());
    this.register(new RectangularReducerEngine());
    this.register(new RoundTeeEngine());
    this.register(new RectangularTeeEngine());
    this.register(new WyeBranchEngine());
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
