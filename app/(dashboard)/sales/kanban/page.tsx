import { KanbanBoard } from "@/components/sales/kanban-board"

export default function SalesKanbanPage() {
  return (
    <>
      <div>
        <h1 className="text-lg font-semibold text-foreground tracking-tight">
          Sales Pipeline
        </h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Drag and drop to update lead stages
        </p>
      </div>

      <KanbanBoard />
    </>
  )
}
