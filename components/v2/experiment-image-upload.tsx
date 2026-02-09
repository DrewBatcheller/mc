"use client"

import React from "react"
import { useState, useRef } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Upload, X } from "lucide-react"

interface ExperimentImageUploadProps {
  label: string
  currentUrl?: string | Array<{ url: string; filename: string }>
  onUpload: (file: File) => void
  isLoading?: boolean
}

export function ExperimentImageUpload({ label, currentUrl, onUpload, isLoading }: ExperimentImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setPreview(event.target?.result as string)
      }
      reader.readAsDataURL(file)
      onUpload(file)
    }
  }

  const handleRemove = () => {
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Extract URL from different formats
  const getImageUrl = (): string | null => {
    if (preview) return preview
    if (!currentUrl) return null
    
    if (typeof currentUrl === "string") return currentUrl
    if (Array.isArray(currentUrl) && currentUrl[0]?.url) return currentUrl[0].url
    
    return null
  }

  const displayUrl = getImageUrl()

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium">{label}</label>
      <div className="flex items-start gap-3">
        {displayUrl && (
          <div className="relative h-20 w-20 rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-gray-200">
            <Image
              src={displayUrl || "/placeholder.svg"}
              alt={label}
              fill
              className="object-cover"
            />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={isLoading}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
          {preview && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
