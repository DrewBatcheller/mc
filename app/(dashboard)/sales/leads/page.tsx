import { LeadsStatCards } from "@/components/sales/leads-stat-cards"
import { LeadsTable } from "@/components/sales/leads-table"
import { AddLeadButton } from "@/components/sales/add-lead-button"

export default function SalesLeadsPage() {
  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">
            Sales Leads
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Manage and track all leads in the pipeline
          </p>
        </div>
        <AddLeadButton />
      </div>

      <LeadsStatCards />
      <LeadsTable />
    </>
  )
}
