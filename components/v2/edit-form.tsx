"use client"

import React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

interface FormFieldProps {
  label: string
  name: string
  value: string | number | undefined
  onChange: (value: string | number) => void
  type?: string
  placeholder?: string
  disabled?: boolean
}

export function FormField({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled,
}: FormFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name} className="text-sm font-medium">
        {label}
      </Label>
      <Input
        id={name}
        type={type}
        value={value || ""}
        onChange={(e) => onChange(type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  )
}

interface EditFormProps {
  onSubmit: (data: Record<string, any>) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  showSubmitButton?: boolean
  children: React.ReactNode
  formData?: Record<string, any>
}

export function EditForm({
  onSubmit,
  onCancel,
  isLoading,
  showSubmitButton = true,
  children,
  formData = {},
}: EditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit(formData)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {children}
      {showSubmitButton && (
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || isLoading}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      )}
    </form>
  )
}
