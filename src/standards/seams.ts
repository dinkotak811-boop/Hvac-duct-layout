import { LongitudinalSeam, TransverseConnector } from '../types';

export interface SeamAllowanceSpec {
  id: LongitudinalSeam;
  name: string;
  nameBn: string;
  femalePocketAllowanceMm: number; // For Pittsburgh / Snaplock pocket side
  maleTongueAllowanceMm: number;    // For Pittsburgh / Snaplock single edge side
  totalPerimeterAdditionMm: number;
  description: string;
}

export interface ConnectorAllowanceSpec {
  id: TransverseConnector;
  name: string;
  nameBn: string;
  allowancePerEndMm: number;
  notchDepthMm: number;
  notchAngleDeg: number;
  description: string;
}

export const LONGITUDINAL_SEAMS: Record<LongitudinalSeam, SeamAllowanceSpec> = {
  pittsburgh: {
    id: 'pittsburgh',
    name: 'Pittsburgh Lock (SMACNA Standard)',
    nameBn: 'পিটসবার্গ লক (SMACNA Standard)',
    femalePocketAllowanceMm: 25.4, // 1 inch pocket
    maleTongueAllowanceMm: 6.35,   // 1/4 inch flanged edge
    totalPerimeterAdditionMm: 31.75,
    description: 'Airtight lock seam for medium & high pressure rectangular ducts. Pocket roll-formed on brake/roll-former.',
  },
  snap_lock: {
    id: 'snap_lock',
    name: 'Button Snap Lock',
    nameBn: 'স্ন্যাপ লক (Button Snap Lock)',
    femalePocketAllowanceMm: 12.7, // 1/2 inch
    maleTongueAllowanceMm: 12.7,   // 1/2 inch with punch indentations
    totalPerimeterAdditionMm: 25.4,
    description: 'Fast assembly snap lock for low pressure commercial & residential ducts.',
  },
  grooved_seam: {
    id: 'grooved_seam',
    name: 'Grooved Seam (Pipe Lock)',
    nameBn: 'গ্রুভড সিম (পাইপ লক)',
    femalePocketAllowanceMm: 10.0,
    maleTongueAllowanceMm: 10.0,
    totalPerimeterAdditionMm: 20.0,
    description: 'Traditional folded flat seam for round pipe and light gauge fabrication.',
  },
  standing_seam: {
    id: 'standing_seam',
    name: 'Standing Seam (Reinforced)',
    nameBn: 'স্ট্যান্ডিং সিম',
    femalePocketAllowanceMm: 25.0,
    maleTongueAllowanceMm: 25.0,
    totalPerimeterAdditionMm: 50.0,
    description: 'Self-reinforcing longitudinal seam for large ducts.',
  },
  butt_weld: {
    id: 'butt_weld',
    name: 'Butt Weld / Fusion Seam',
    nameBn: 'ওয়েল্ডেড সিম (Butt Weld)',
    femalePocketAllowanceMm: 0,
    maleTongueAllowanceMm: 0,
    totalPerimeterAdditionMm: 0,
    description: 'Zero allowance. For welded stainless steel, kitchen exhaust or industrial ducts.',
  },
};

export const TRANSVERSE_CONNECTORS: Record<TransverseConnector, ConnectorAllowanceSpec> = {
  tdc_tdf: {
    id: 'tdc_tdf',
    name: 'TDC / TDF Flange (35 mm roll-formed)',
    nameBn: 'TDC / TDF ফ্ল্যাঞ্জ (৩৫ মিমি)',
    allowancePerEndMm: 35.0,
    notchDepthMm: 35.0,
    notchAngleDeg: 45.0,
    description: 'Transverse Duct Connector roll-formed directly on sheet ends. Corner clips and gasketed corners.',
  },
  s_and_drive: {
    id: 's_and_drive',
    name: 'S-Cleat & Drive Slip',
    nameBn: 'এস-ক্লিট ও ড্রাইভ স্লিপ',
    allowancePerEndMm: 28.0,
    notchDepthMm: 28.0,
    notchAngleDeg: 30.0,
    description: 'Traditional slip connector. Flat S-cleat on wide sides (28mm fold) and Drive cleats on narrow sides (13mm fold).',
  },
  companion_angle: {
    id: 'companion_angle',
    name: 'Companion Angle Iron Flange (38 mm turn-up)',
    nameBn: 'অ্যাঙ্গেল আয়রন ফ্ল্যাঞ্জ (৩৮ মিমি)',
    allowancePerEndMm: 38.0,
    notchDepthMm: 38.0,
    notchAngleDeg: 90.0,
    description: 'Sheet metal edge bent outward 90 degrees to clamp behind structural steel angle iron.',
  },
  crimped_beaded: {
    id: 'crimped_beaded',
    name: 'Crimped & Beaded (Round Slip)',
    nameBn: 'ক্রিম্পড ও বিডেড স্লিপ (৩৮ মিমি)',
    allowancePerEndMm: 38.0,
    notchDepthMm: 0,
    notchAngleDeg: 0,
    description: 'Male slip end crimped with a bead stop for inserting into adjacent round duct.',
  },
  raw_edge: {
    id: 'raw_edge',
    name: 'Raw Cut Edge',
    nameBn: 'র কাটিং এজ (Raw Edge)',
    allowancePerEndMm: 0,
    notchDepthMm: 0,
    notchAngleDeg: 0,
    description: 'Clean cut edge with no additional fold allowance.',
  },
};

export function getLongitudinalAllowance(seam: LongitudinalSeam): SeamAllowanceSpec {
  return LONGITUDINAL_SEAMS[seam] || LONGITUDINAL_SEAMS.pittsburgh;
}

export function getTransverseAllowance(connector: TransverseConnector): ConnectorAllowanceSpec {
  return TRANSVERSE_CONNECTORS[connector] || TRANSVERSE_CONNECTORS.tdc_tdf;
}
