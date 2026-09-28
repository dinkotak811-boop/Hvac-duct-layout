# AeroDuct CAD/CAM — প্রজেক্ট রিভিউ

তারিখ: ২০২৬-০৯-২৮ · ব্রাঞ্চ: `arena/01a0e709-hvac-duct-layout`

## ১. রিপোর্জিটরিতে আসলে কী আছে

রিপোতে ট্র্যাক করা ফাইল মাত্র **একটি** — `aeroduct-project.zip` (190 KB, ৫২ ফাইল)।
সোর্স কোড Git-এ নেই, তাই diff/history/PR রিভিউ কিছুই কাজ করে না।

**সুপারিশ:** zip টা আনপ্যাক করে সোর্স ফাইলগুলো কমিট করা হোক (`aeroduct-project.zip` তখন মুছে ফেলা বা `.gitignore` করা যায়)। বলুন, আমি এক টার্নেই করে দিতে পারি।

## ২. স্ট্যাক

| অংশ | টেক |
|---|---|
| UI | React 19 + TypeScript + Tailwind CSS 4 |
| Build | Vite 8 (`dev` → port 3000, host 0.0.0.0) |
| 3D | three.js 0.186 (`Model3DViewer.tsx`) |
| Export | jsPDF (PDF), কাস্টম DXF/SVG/CSV exporter |
| Icons/anim | lucide-react, motion |
| Persist | `localStorage` (`aeroduct_saved_projects`) — কোনো ব্যাকএন্ড নেই |

আর্কিটেকচার পরিষ্কার: `types/` → `standards/` (seams, materials, bend deduction, notch library) → `engines/` (প্রতি ফিটিং-এ একটি ইঞ্জিন, `DuctCalculationEngine` ইন্টারফেস + `EngineRegistry` ফ্যাক্টরি) → `components/` (2D প্যাটার্ন ভিউয়ার, 3D ভিউয়ার, BOM, নেস্টিং) → `exporters/`. প্লাগেবল ইঞ্জিন প্যাটার্নটা ভালো — নতুন ফিটিং যোগ করা সহজ।

## ৩. স্বাস্থ্য পরীক্ষা (আমি চালিয়ে দেখেছি)

- `tsc --noEmit` → **০ এরর**
- `vite build` → **সফল** (1.9k মডিউল, ~1.07s)
- বিল্ট-ইন ইউনিট টেস্ট (`src/tests/engineTests.ts`) → **12/12 পাস**
- ১৭টি ইঞ্জিনের ডিফল্ট প্যারামিটারে স্মোক টেস্ট → সবগুলো বৈধ পার্ট, ওজন, 3D জিওমেট্রি দেয়; কোনো NaN/শূন্য ব্ল্যাঙ্ক নেই
- Dev server চালু করে লাইভ প্রিভিউ দেখাচ্ছি

## ৪. যেসব সমস্যা/ফাঁক পেয়েছি

1. **৭টি মডেল টাইপে ডিফাইন করা কিন্তু ইঞ্জিন নেই** — UI-তে দেখাবেই না:
   `rect_45_elbow`, `rect_reducing_tee`, `lateral_tee`, `rect_eccentric_reducer`, `oval_to_round`, `round_offset`, `rect_45_branch`, `round_saddle_branch`.
2. **`branch` ক্যাটেগরি** `DuctCategory` টাইপে আছে, কিন্তু `DUCT_CATEGORIES` লিস্টে নেই → কোনো ট্যাব নেই (wye branch এখন `tee`-তে আছে)।
3. **npm install ভাঙে**: `esbuild ^0.25` vs `vite 8` (peer `^0.27||^0.28`) কনফ্লিক্ট। `--legacy-peer-deps` ছাড়া ইনস্টল হয় না। `esbuild`/`tsx` আসলে দরকারই নেই।
4. **অব্যবহৃত ডিপেন্ডেন্সি**: `@google/genai`, `express`, `dotenv` — সোর্সে একটাও ব্যবহার হয়নি (`metadata.json`-এ `SERVER_SIDE_GEMINI_API` ক্যাপাবিলিটি দাবি করা আছে, কিন্তু কোনো সার্ভার কোড নেই)। বান্ডল ও অ্যাটাক সারফেস বাড়ায়।
5. **`package.json` name = `react-example`**, version `0.0.0` — প্রজেক্টের নাম দেওয়া উচিত।
6. **প্রিভিউ/হোস্টিং**: `vite.config.ts`-এ `server.allowedHosts` নেই, তাই e2b/প্রক্সি ডোমেইনে 403 আসে (আমি টেম্প কপিতে ঠিক করে প্রিভিউ চালিয়েছি)। `__dirname` ব্যবহারে Vite 8 ওয়ার্নিং — `import.meta.dirname` ব্যবহার করা ভালো।
7. **বান্ডল সাইজ**: একক চাঙ্ক 1.48 MB (gzip 410 KB) — three.js + jsPDF + html2canvas। 3D ভিউয়ার ও PDF এক্সপোর্টার lazy-load করলে অনেক কমবে।
8. **টেস্ট শুধু UI মডালে** — CLI/CI রানার নেই, `npm test` স্ক্রিপ্ট নেই, কোনো GitHub Actions নেই।
9. **README/লাইসেন্স নেই**; `@license Apache-2.0` হেডার শুধু `App.tsx`-এ, বাকিতে নেই।
10. **বড় ফাইল**: `Pattern2DViewer.tsx` (48 KB), `ManufacturingValidationEngine.ts` (44 KB) — ভাগ করা গেলে মেইনটেন করা সহজ হবে।
11. **lockfile**: `bun.lock` আছে কিন্তু সরঞ্জাম/ডক নেই যে bun লাগবে; npm ব্যবহারকারীর জন্য লকফাইল নেই।

## ৫. প্রস্তাবিত পরবর্তী ধাপ (অগ্রাধিকার অনুসারে)

1. zip আনপ্যাক করে সোর্স কমিট + `.gitignore` ঠিক করা
2. ডিপেন্ডেন্সি পরিষ্কার (esbuild/tsx/express/dotenv/genai বাদ) → `npm i` ঝামেলামুক্ত
3. `allowedHosts` + `import.meta.dirname` ফিক্স, `package.json` নাম/স্ক্রিপ্ট ঠিক করা
4. `npm test` (node/tsx রানার) + সাধারণ CI ওয়ার্কফ্লো
5. বাকি ৭টি ফিটিং ইঞ্জিন যোগ করা, `branch` ক্যাটেগরি চালু করা
6. three.js/jsPDF lazy-load করে বান্ডল স্লিম করা
7. README (স্ক্রিনশট, SMACNA রেফারেন্স, ইঞ্জিন যোগ করার গাইড)
