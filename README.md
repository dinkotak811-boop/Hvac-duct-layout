# AeroDuct CAD/CAM

HVAC **rectangular** sheet-metal duct fabrication & flat-pattern (development) layout engine.
প্রতিটি ফিটিং-এর জন্য আলাদা ক্যালকুলেশন ইঞ্জিন, 2D flat pattern + 3D প্রিভিউ, SMACNA সিম/গেজ স্ট্যান্ডার্ড এবং DXF / SVG / PDF / CSV এক্সপোর্ট।

## Quick start

```bash
npm install
npm run dev           # http://localhost:3000
npm run build         # production build → dist/
npm run build:single  # single offline file → aeroduct-standalone.html
npm run typecheck     # tsc --noEmit
```

### Single-file offline build

`npm run build:single` পুরো অ্যাপ (JS + CSS) একটা ফাইলে ইনলাইন করে
**`aeroduct-standalone.html`** বানায় (~1.8 MB)। ফাইলটা ফোনে/পিসিতে ডাউনলোড করে
সরাসরি ব্রাউজারে খুললেই চলে — কোনো সার্ভার, ইন্টারনেট বা ইনস্টল লাগে না।
এক্সপোর্ট (DXF/SVG/PDF/CSV/JSON), 2D/3D ভিউ, প্রজেক্ট সেভ — সবই অফলাইনে কাজ করে।

## Tech stack

React 19 · TypeScript · Vite 8 · Tailwind CSS 4 · three.js · jsPDF · lucide-react

## Supported fittings (11 engines)

| Category | Model | Engine |
|---|---|---|
| Straight | Rectangular Straight Duct | `RectangularStraightEngine` |
| Elbow | Rectangular Radius Elbow (90°/45°) | `RectangularRadiusElbowEngine` |
| Elbow | Square Throat Elbow (turning vanes) | `RectangularSquareElbowEngine` |
| Tee | Rectangular 90° Tee (straight & reducing) | `RectangularTeeEngine` |
| Reducer | Rectangular Reducer / Transition | `RectangularReducerEngine` |
| Reducer | Square/Rectangular → Round Transition | `SquareToRoundEngine` |
| Offset | Rectangular Offset / Jog | `RectangularOffsetEngine` |
| Special | Plenum Box (AHU / FCU) | `PlenumBoxEngine` |
| Special | Register Boot | `RegisterBootEngine` |
| Special | Rectangular End Cap | `EndCapEngine` |
| Special | VCD Damper Sleeve | `DamperSleeveEngine` |

> স্কোপ: প্রজেক্টটি রেকটেঙ্গুলার ডাক্টের জন্য। বিশুদ্ধ round ও flat-oval ডাক্ট মডেল (round straight, flat oval, lobster-back gore elbow, conical reducer, round tee, wye branch) সরিয়ে ফেলা হয়েছে। রেকটেঙ্গুলার-থেকে-রাউন্ড কানেকশন (Square-to-Round, Register Boot collar, Plenum takeoff collar) রাখা হয়েছে।

## Project structure

```
src/
  types/        # Core domain types (models, parts, geometry, inputs)
  standards/    # SMACNA data: seams, materials/gauges, bend deduction, notch library
  engines/      # One calculation engine per fitting + registry + validation engine
  components/   # UI: model selector, parameter form, 2D viewer, 3D viewer, BOM, nesting
  exporters/    # DXF, SVG, PDF, CSV output
  tests/        # Engine unit tests (run from the in-app "Unit Tests" modal)
```

## Adding a new fitting engine

1. `src/types/index.ts`-এ নতুন `DuctModelId` যোগ করুন।
2. `src/engines/`-এ `DuctCalculationEngine` ইন্টারফেস ইমপ্লিমেন্ট করে ক্লাস লিখুন (`id`, `category`, `parameters`, `validate()`, `calculate()`)।
3. `src/engines/EngineRegistry.ts`-এর `registerDefaults()`-এ রেজিস্টার করুন — UI নিজে থেকেই ক্যাটেগরি ট্যাবে দেখাবে।
4. দরকার হলে `ManufacturingValidationEngine`-এ মডেল-স্পেসিফিক চেক যোগ করুন এবং `src/tests/engineTests.ts`-এ টেস্ট লিখুন।

## Notes

- সব ডাইমেনশন **মিলিমিটার (mm)**-এ; ওজন kg; এরিয়া m²।
- প্রজেক্ট প্রিসেট ও সেভ করা কাজ ব্রাউজারের `localStorage`-এ থাকে (`aeroduct_saved_projects`) — কোনো ব্যাকএন্ড নেই।
- `vite.config.ts`-এ `allowedHosts: true` দেওয়া আছে, তাই Cloud Run / e2b / ngrok-এর মতো প্রক্সি হোস্টনেমেও dev ও preview সার্ভার কাজ করে।
