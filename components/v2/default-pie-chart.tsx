"use client"

import { useRef, useEffect, useState } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

interface DefaultPieChartProps {
  data: Array<{ name: string; value: number }>
  colors?: string[]
  height?: number
  showLegend?: boolean
  valueFormatter?: (value: number) => string
}

const DEFAULT_COLORS = ["#0891b2", "#06b6d4", "#0ea5e9", "#0d9488", "#10b981", "#14b8a6", "#f43f5e", "#ec4899", "#a855f7", "#8b5cf6", "#6366f1", "#3b82f6"]

const renderCustomLabel = (props: any, data: Array<{ name: string; value: number }>) => {
  try {
    const { cx, cy, midAngle, outerRadius, percent, index } = props
    
    // Hide labels for slices smaller than 3%
    if ((percent || 0) < 0.03) {
      return null
    }
    
    if (cx === undefined || cy === undefined || midAngle === undefined || outerRadius === undefined) {
      return null
    }
    
    const RADIAN = Math.PI / 180
    const labelRadius = outerRadius * 0.65
    const x = cx + labelRadius * Math.cos(-midAngle * RADIAN)
    const y = cy + labelRadius * Math.sin(-midAngle * RADIAN)

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central" 
        fontSize="14" 
        fontWeight="bold"
        pointerEvents="none"
      >
        {`${((percent || 0) * 100).toFixed(1)}%`}
      </text>
    )
  } catch (error) {
    return null
  }
}

const renderTooltip = (props: any, data: Array<{ name: string; value: number }>) => {
  const { active, payload } = props
  if (!active || !payload || !payload[0]) {
    return null
  }

  const entry = payload[0]
  const index = entry.payload.index
  const item = data[index]
  
  // Calculate percentage
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const percent = ((item.value / total) * 100).toFixed(1)

  return (
    <div className="bg-white border border-gray-200 rounded-md p-2 shadow-lg">
      <p className="text-sm font-medium text-foreground">{item.name}</p>
      <p className="text-sm text-muted-foreground">{percent}%</p>
    </div>
  )
}

export function DefaultPieChart({
  data,
  colors = DEFAULT_COLORS,
  height = 300,
  showLegend = true,
  valueFormatter,
}: DefaultPieChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [outerRadius, setOuterRadius] = useState(120)

  useEffect(() => {
    const updateRadius = () => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      
      // Only update if we have valid dimensions
      if (rect.width === 0 || rect.height === 0) {
        return
      }

      const availableWidth = rect.width * 0.65 // 65% of width for pie chart
      const availableHeight = rect.height

      // Calculate max radius with padding (50% reduction: 30 -> 15)
      const maxRadius = Math.min(availableWidth, availableHeight) / 2 - 15
      const newRadius = Math.max(maxRadius, 80) // Minimum radius of 80

      setOuterRadius(newRadius)
    }

    // Use a small delay to ensure DOM is fully laid out
    const timer = setTimeout(updateRadius, 100)
    
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(updateRadius, 0)
    })
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      clearTimeout(timer)
      resizeObserver.disconnect()
    }
  }, [])

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No data available
      </div>
    )
  }

  // Add index to data for tooltip rendering
  const dataWithIndex = data.map((item, idx) => ({ ...item, index: idx }))

  return (
    <div ref={containerRef} className="flex items-center gap-4 h-full w-full">
      {/* Pie Chart - 65% */}
      <div className="flex-1 flex items-center justify-center h-full w-full">
        <div style={{ width: "100%", height: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataWithIndex}
                cx="50%"
                cy="50%"
                innerRadius={0}
                outerRadius={outerRadius}
                fill="#8884d8"
                dataKey="value"
                labelLine={false}
                label={(props) => renderCustomLabel(props, data)}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip 
                content={(props) => renderTooltip(props, data)}
                cursor={{ fill: "rgba(0,0,0,0.1)" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Legend - 35% */}
      {showLegend && (
        <div className="flex flex-col justify-center w-[35%] overflow-y-auto pr-2 space-y-1.5 h-full">
          {data.map((item, index) => {
            const total = data.reduce((sum, d) => sum + d.value, 0)
            const percent = ((item.value / total) * 100).toFixed(1)
            
            return (
              <div key={item.name} className="flex items-start gap-2 min-w-0">
                <div
                  className="h-2 w-2 rounded-full flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-medium truncate">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{percent}%</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
