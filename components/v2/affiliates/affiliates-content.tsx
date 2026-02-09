"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users } from "lucide-react"

export function AffiliatesContent() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Affiliates</h1>
        <p className="text-muted-foreground">Manage affiliate partnerships and referrals</p>
      </div>

      <Card>
        <CardHeader className="text-center py-12">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>Affiliates Coming Soon</CardTitle>
          <CardDescription>
            This page will be connected once the Affiliates table is added to Airtable.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  )
}
