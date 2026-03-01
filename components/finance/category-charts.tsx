"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"

const revenueData = [
  { name: "CRO Retainer", value: 83.8, color: "hsl(195, 70%, 50%)" },
  { name: "Affiliate Software", value: 8.3, color: "hsl(220, 70%, 50%)" },
  { name: "Shopify Design & Dev", value: 7.8, color: "hsl(175, 60%, 42%)" },
  { name: "CRO Course", value: 0.4, color: "hsl(142, 72%, 40%)" },
  { name: "Development Retainer", value: 4.3, color: "hsl(38, 92%, 50%)" },
  { name: "Affiliate Referral", value: 0.3, color: "hsl(0, 72%, 51%)" },
  { name: "Meta Media Buying", value: 1.5, color: "hsl(262, 52%, 47%)" },
  { name: "CRO Audit", value: 0.2, color: "hsl(340, 60%, 50%)" },
  { name: "Shopify Site Speed Dev", value: 1.1, color: "hsl(160, 50%, 40%)" },
]

const expenseData = [
  { name: "Outsourcing / Freelancers", value: 31.5, color: "hsl(195, 70%, 50%)" },
  { name: "Affiliate Payment", value: 0.8, color: "hsl(220, 70%, 50%)" },
  { name: "Outsourcing (Strategy)", value: 6.4, color: "hsl(175, 60%, 42%)" },
  { name: "Other", value: 0.8, color: "hsl(142, 72%, 40%)" },
  { name: "Outsourcing (Development)", value: 0.2, color: "hsl(38, 92%, 50%)" },
  { name: "Outsourcing (Video)", value: 0.7, color: "hsl(0, 72%, 51%)" },
  { name: "Software (Testing)", value: 0.2, color: "hsl(262, 52%, 47%)" },
  { name: "Travel", value: 0.6, color: "hsl(340, 60%, 50%)" },
  { name: "Operations", value: 0.6, color: "hsl(160, 50%, 40%)" },
  { name: "Equipment / Infra", value: 0.6, color: "hsl(30, 60%, 50%)" },
  { name: "Software", value: 1.0, color: "hsl(200, 55%, 60%)" },
  { name: "Legal", value: 0.3, color: "hsl(280, 45%, 55%)" },
  { name: "Outsourcing (Design)", value: 0.3, color: "hsl(120, 40%, 50%)" },
  { name: "Interest & Bank Fees", value: 0.2, color: "hsl(50, 70%, 50%)" },
  { name: "Marketing & Branding", value: 0.2, color: "hsl(15, 65%, 50%)" },
  { name: "Outsourcing (QA)", value: 1.0, color: "hsl(310, 50%, 50%)" },
  { name: "Accounting", value: 2.8, color: "hsl(70, 55%, 45%)" },
  { name: "Educational", value: 0.4, color: "hsl(240, 45%, 55%)" },
]

interface CategoryPieProps {
  title: string
  subtitle: string
  data: { name: string; value: number; color: string }[]
  dateRange?: string
}

function CategoryPie({ title, subtitle, data, dateRange = "All Time" }: CategoryPieProps) {
  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <div className="p-5 flex flex-col lg:flex-row items-center justify-center gap-6 min-h-80">
        <div className="h-[220px] w-[220px] shrink-0 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={0}
                outerRadius={100}
                paddingAngle={0.5}
                dataKey="value"
                stroke="white"
                strokeWidth={1.5}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid hsl(220, 13%, 91%)",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                  backgroundColor: "white",
                }}
                formatter={(value: number, name: string) => [`${value}%`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] lg:max-h-[220px] lg:overflow-y-auto">
          {data.map((entry) => (
            <div key={entry.name} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">
                {entry.name}{" "}
                <span className="text-foreground font-medium">
                  {entry.value}%
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function RevenueByCategoryChart({ dateRange = "All Time" }: { dateRange?: string }) {
  return (
    <CategoryPie
      title="Revenue by Category"
      subtitle="Revenue distribution across categories"
      data={revenueData}
      dateRange={dateRange}
    />
  )
}

export function ExpenseByCategoryChart({ dateRange = "All Time" }: { dateRange?: string }) {
  return (
    <CategoryPie
      title="Expense by Category"
      subtitle="Expense distribution across categories"
      data={expenseData}
      dateRange={dateRange}
    />
  )
}
