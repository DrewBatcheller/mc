"use client"

import React from "react"

import { useState, useRef } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Upload, X } from "lucide-react"

interface AvatarUploadProps {
  currentUrl?: string
  onUpload: (file: File) => void
  isLoading?: boolean
}

export function AvatarUpload({ currentUrl, onUpload, isLoading }: AvatarUploadProps) {
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

  const displayUrl = preview || currentUrl

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        {displayUrl && (
          <div className="relative h-24 w-24 rounded-lg overflow-hidden bg-muted">
            <Image
              src={displayUrl || "/placeholder.svg"}
              alt="Avatar preview"
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
            Upload Avatar
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
