import { readFileSync, writeFileSync } from "fs"

// Fix content-card.tsx — add flex-1 flex flex-col to children wrapper
const cardPath = "/vercel/share/v0-project/components/shared/content-card.tsx"
let card = readFileSync(cardPath, "utf8")
card = card.replace(
  /<div>\{children\}<\/div>/,
  '<div className="flex-1 flex flex-col">{children}</div>'
)
writeFileSync(cardPath, card)
console.log("[v0] content-card.tsx updated:", card.includes("flex-1 flex flex-col"))

// Fix donut-chart.tsx — add flex-1 to content row
const donutPath = "/vercel/share/v0-project/components/shared/donut-chart.tsx"
let donut = readFileSync(donutPath, "utf8")
donut = donut.replace(
  /className="p-5 flex flex-row items-center gap-6"/,
  'className="flex-1 flex flex-row items-center justify-center gap-6 p-5"'
)
writeFileSync(donutPath, donut)
console.log("[v0] donut-chart.tsx updated:", donut.includes("flex-1 flex flex-row"))
