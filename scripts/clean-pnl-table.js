import { readFileSync, writeFileSync } from "fs"

const filePath = "/vercel/share/v0-project/components/finance/pnl-table.tsx"
let content = readFileSync(filePath, "utf8")

// Remove unused imports
content = content.replace(
  `import { ArrowUpDown, Check, Pencil, Trash2, AlertCircle } from "lucide-react"`,
  `import { ArrowUpDown, Check } from "lucide-react"`
)

// Remove showCreateModal and setShowCreateModal from interface
content = content.replace(
  `interface PnlTableProps {
  year: string
  showDividends: boolean
  showCreateModal?: boolean
  setShowCreateModal?: (show: boolean) => void
  exportTrigger?: number
}`,
  `interface PnlTableProps {
  year: string
  showDividends: boolean
  exportTrigger?: number
}`
)

// Remove showCreateModal and setShowCreateModal from function signature
content = content.replace(
  `export function PnlTable({ year, showDividends, showCreateModal, setShowCreateModal, exportTrigger }: PnlTableProps) {`,
  `export function PnlTable({ year, showDividends, exportTrigger }: PnlTableProps) {`
)

// Remove state for deleteConfirm, editingPnl, formData
content = content.replace(
  `  const [deleteConfirm, setDeleteConfirm] = useState<{index: number, row: PnlRow} | null>(null)
  const [editingPnl, setEditingPnl] = useState<{index: number, row: PnlRow} | null>(null)
  const [formData, setFormData] = useState<Partial<PnlRow>>({
    month: "",
    monthIndex: 0,
    revenue: 0,
    fees: 0,
    expenses: 0,
    netProfit: 0,
    adjustedProfit: 0,
    revenueGrowth: 0,
    dividendConnor: false,
    dividendJayden: false,
    connor: 0,
    jayden: 0,
  })

  const handleExport`,
  `  const handleExport`
)

// Clean up handleExport - remove "Actions" header and "Edit, Delete" push
content = content.replace(`    headers.push("Actions")

    const rows = sortedData.map(row => {
      const values = [
        row.month,
        row.revenue,
        row.fees,
        row.expenses,
        row.netProfit,
        row.adjustedProfit,
        row.revenueGrowth,
      ]
      if (showDividends) {
        values.push(row.dividendConnor ? "Yes" : "No", row.dividendJayden ? "Yes" : "No", row.connor, row.jayden)
      }
      values.push("Edit, Delete")
      return values
    })

    // Add totals row
    const totalsRow = [
      "Totals",
      totals.revenue,
      totals.fees,
      totals.expenses,
      totals.netProfit,
      totals.adjustedProfit,
      "",
    ]
    if (showDividends) {
      totalsRow.push("", "", totals.connor, totals.jayden)
    }
    totalsRow.push("")
    rows.push(totalsRow)`,
  `    const rows = sortedData.map(row => {
      const values = [
        row.month,
        row.revenue,
        row.fees,
        row.expenses,
        row.netProfit,
        row.adjustedProfit,
        row.revenueGrowth,
      ]
      if (showDividends) {
        values.push(row.dividendConnor ? "Yes" : "No", row.dividendJayden ? "Yes" : "No", row.connor, row.jayden)
      }
      return values
    })

    // Add totals row
    const totalsRow = [
      "Totals",
      totals.revenue,
      totals.fees,
      totals.expenses,
      totals.netProfit,
      totals.adjustedProfit,
      "",
    ]
    if (showDividends) {
      totalsRow.push("", "", totals.connor, totals.jayden)
    }
    rows.push(totalsRow)`
)

// Remove handleEditRow, handleDeleteRow, confirmDelete, handleSavePnl, handleCloseModal
content = content.replace(
  `  const handleEditRow = (index: number, row: PnlRow) => {
    setEditingPnl({index, row})
    setFormData(row)
  }

  const handleDeleteRow = (index: number, row: PnlRow) => {
    setDeleteConfirm({index, row})
  }

  const confirmDelete = () => {
    if (deleteConfirm) {
      console.log("Delete PnL entry:", deleteConfirm)
      setDeleteConfirm(null)
    }
  }

  const handleSavePnl = () => {
    if (editingPnl) {
      console.log("Update PnL entry:", editingPnl.index, formData)
    } else {
      console.log("Create PnL entry:", formData)
    }
    setEditingPnl(null)
    if (setShowCreateModal) setShowCreateModal(false)
    setFormData({
      month: "",
      monthIndex: 0,
      revenue: 0,
      fees: 0,
      expenses: 0,
      netProfit: 0,
      adjustedProfit: 0,
      revenueGrowth: 0,
      dividendConnor: false,
      dividendJayden: false,
      connor: 0,
      jayden: 0,
    })
  }

  const handleCloseModal = () => {
    setEditingPnl(null)
    if (setShowCreateModal) setShowCreateModal(false)
    setFormData({
      month: "",
      monthIndex: 0,
      revenue: 0,
      fees: 0,
      expenses: 0,
      netProfit: 0,
      adjustedProfit: 0,
      revenueGrowth: 0,
      dividendConnor: false,
      dividendJayden: false,
      connor: 0,
      jayden: 0,
    })
  }

  // Handle export when trigger changes`,
  `  // Handle export when trigger changes`
)

// Remove Actions th header
content = content.replace(
  `              <th className="px-4 py-3 text-[13px] font-medium text-muted-foreground whitespace-nowrap text-center">
                Actions
              </th>`,
  ``
)

// Remove the Edit/Delete action buttons td in tbody
content = content.replace(
  `                <td className="px-4 py-3.5 text-center flex items-center justify-center gap-1">
                  <button
                    onClick={() => handleEditRow(i, row)}
                    className="h-7 w-7 rounded flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteRow(i, row)}
                    className="h-7 w-7 rounded flex items-center justify-center hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>`,
  ``
)

// Remove Edit/Create modal
const editModalStart = content.indexOf(`      {/* Edit/Create P&L Modal */}`)
const editModalEnd = content.indexOf(`      {/* Delete Confirmation Modal */}`)
if (editModalStart !== -1 && editModalEnd !== -1) {
  content = content.slice(0, editModalStart) + content.slice(editModalEnd)
}

// Remove Delete Confirmation modal
const deleteModalStart = content.indexOf(`      {/* Delete Confirmation Modal */}`)
const deleteModalEnd = content.indexOf(`    </div>\n  )\n}`)
if (deleteModalStart !== -1 && deleteModalEnd !== -1) {
  content = content.slice(0, deleteModalStart) + content.slice(deleteModalEnd)
}

writeFileSync(filePath, content, "utf8")
console.log("Done! P&L table cleaned.")
