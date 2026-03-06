'use client'

import { useState, useEffect, useMemo } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SelectField } from '@/components/shared/select-field'
import { useUser } from '@/contexts/UserContext'
import { useToast } from '@/hooks/use-toast'
import { useAirtable } from '@/hooks/use-airtable'

interface NewIdeaModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface ClientOption {
  id: string
  name: string
}

interface FormData {
  client: string       // record ID for linked field
  clientName: string   // display name for UI
  title: string
  placementLabel: string
  placementUrl: string
  hypothesis: string
  rationale: string
  primaryGoals: string[]
  devices: string
  countries: string[]
  weighting: string
  designBrief: string
  developmentBrief: string
  mediaLinks: string
  walkthroughUrl: string
}

const PRIMARY_GOALS = ['ATC', 'SCVR', 'CVR', 'AOV', 'RPV', 'APPV', 'PPV', 'CTR', 'Other', 'LTV', 'Bounce Rate', 'Session Depth', 'Search Usage', 'Units per Order', 'Add to Cart Rate', 'Trust Score', 'Bundle CTR']

const DEVICES = ['All Devices', 'Desktop', 'Mobile']

const COUNTRIES = ['United States', 'Canada', 'United Kingdom', 'Australia', 'Mexico', 'European Union', 'Germany', 'France', 'Spain', 'Italy', 'Japan', 'South Korea', 'India', 'Brazil', 'New Zealand', 'AU (Primary Focus)', 'All GEOs', 'International']

export function NewIdeaModal({ isOpen, onClose, onSuccess }: NewIdeaModalProps) {
  const { user } = useUser()
  const { toast } = useToast()
  const [showCountriesMenu, setShowCountriesMenu] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch clients for the dropdown — this is an internal-only modal
  const { data: clientRecords } = useAirtable('clients', {
    fields: ['Brand Name'],
    sort: [{ field: 'Brand Name', direction: 'asc' }],
    enabled: isOpen,
  })

  const clientOptions = useMemo<ClientOption[]>(() => {
    if (!clientRecords) return []
    return clientRecords.map(r => ({
      id: r.id,
      name: String((r.fields as Record<string, unknown>)['Brand Name'] ?? ''),
    })).filter(c => c.name)
  }, [clientRecords])

  const clientSelectOptions = useMemo(
    () => ['Select a client...', ...clientOptions.map(c => c.name)],
    [clientOptions]
  )

  const [formData, setFormData] = useState<FormData>({
    client: '',
    clientName: '',
    title: '',
    placementLabel: '',
    placementUrl: '',
    hypothesis: '',
    rationale: '',
    primaryGoals: [],
    devices: 'All Devices',
    countries: [],
    weighting: '',
    designBrief: '',
    developmentBrief: '',
    mediaLinks: '',
    walkthroughUrl: '',
  })

  // Auto-set client when user context changes
  const handleChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const togglePrimaryGoal = (goal: string) => {
    setFormData(prev => ({
      ...prev,
      primaryGoals: prev.primaryGoals.includes(goal)
        ? prev.primaryGoals.filter(g => g !== goal)
        : [...prev.primaryGoals, goal]
    }))
  }

  const toggleCountry = (country: string) => {
    setFormData(prev => ({
      ...prev,
      countries: prev.countries.includes(country)
        ? prev.countries.filter(c => c !== country)
        : [...prev.countries, country]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate all required fields
    if (!formData.client || !formData.title || !formData.placementLabel || !formData.placementUrl || 
        !formData.hypothesis || !formData.rationale || formData.primaryGoals.length === 0 || 
        !formData.weighting || !formData.designBrief) {
      toast({ title: 'Missing required fields', description: 'Please fill in all required fields', variant: 'destructive' })
      return
    }

    setIsSubmitting(true)
    
    try {
      // Map form data to Airtable field names
      // Brand Name is a linked record field — needs [recordId] format
      const airtableFields = {
        'Test Description': formData.title,
        'Brand Name': [formData.client],
        'Is Experiment': false,
        'Placement': formData.placementLabel,
        'Placement URL': formData.placementUrl,
        'Hypothesis': formData.hypothesis,
        'Rationale': formData.rationale,
        'Category Primary Goals': formData.primaryGoals,
        'Devices': formData.devices,
        'GEOs': formData.countries,
        'Variants Weight': formData.weighting,
        'Design Brief': formData.designBrief,
        'Development Brief': formData.developmentBrief,
        'Media/Links': formData.mediaLinks,
        'Walkthrough Video URL': formData.walkthroughUrl,
      }

      const response = await fetch('/api/airtable/experiment-ideas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': user?.role ?? '',
          'x-user-id': user?.id ?? '',
          'x-user-name': user?.name ?? '',
          ...(user?.clientId ? { 'x-client-id': user.clientId } : {}),
        },
        body: JSON.stringify({ fields: airtableFields }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create idea')
      }

      const { record } = await response.json()
      
      toast({ title: 'Success', description: 'Experiment idea created successfully' })
      
      // Reset form
      setFormData({
        client: user?.clientId || '',
        clientName: user?.name || '',
        title: '',
        placementLabel: '',
        placementUrl: '',
        hypothesis: '',
        rationale: '',
        primaryGoals: [],
        devices: 'All Devices',
        countries: [],
        weighting: '',
        designBrief: '',
        developmentBrief: '',
        mediaLinks: '',
        walkthroughUrl: '',
      })
      
      onClose()
      onSuccess?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create idea'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose()
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [isOpen, isSubmitting, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-lg" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-border bg-card">
          <h2 className="text-lg font-semibold text-foreground">Add an Experiment Idea</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-md transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* Client */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">
              Client <span className="text-rose-600">*</span>
            </label>
            <p className="text-[12px] text-muted-foreground mb-3">Select which client this idea is for.</p>
            <SelectField
              value={formData.clientName || 'Select a client...'}
              onChange={(name) => {
                const match = clientOptions.find(c => c.name === name)
                if (match) {
                  handleChange('client', match.id)
                  handleChange('clientName', match.name)
                }
              }}
              options={clientSelectOptions}
              containerClassName="w-full"
              disabled={isSubmitting}
            />
          </div>

          {/* Experiment Title */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">
              Experiment Title <span className="text-rose-600">*</span>
            </label>
            <p className="text-[12px] text-muted-foreground mb-3">A short, clear title describing the test</p>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g. 'Sticky Add to Cart on PDF'"
              required
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
          </div>

          {/* Experiment Placement */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">
                Experiment Placement <span className="text-rose-600">*</span>
              </label>
              <p className="text-[12px] text-muted-foreground mb-3">Enter the placement where the experiment will run on the page(s). Separate with Commas if more than 1 placement location.</p>
              <input
                type="text"
                value={formData.placementLabel}
                onChange={(e) => handleChange('placementLabel', e.target.value)}
                placeholder="e.g. Below ATC"
                required
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">
                Experiment Placement URL <span className="text-rose-600">*</span>
              </label>
              <p className="text-[12px] text-muted-foreground mb-3">Enter the URL(s) where the experiment will run. If the test spans multiple pages, separate each URL with a comma.</p>
              <input
                type="text"
                value={formData.placementUrl}
                onChange={(e) => handleChange('placementUrl', e.target.value)}
                placeholder="e.g. https://store.com/product"
                required
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              />
            </div>
          </div>

          {/* Experiment Hypothesis */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">
              Experiment Hypothesis <span className="text-rose-600">*</span>
            </label>
            <p className="text-[12px] text-muted-foreground mb-3">State the expected outcome of the change and the reasoning behind it (what will improve and why).</p>
            <div className="mb-2">
              <a href="https://bit.ly/mc-addtest" target="_blank" rel="noopener noreferrer" className="text-[12px] text-sky-600 hover:underline">
                ChatGPT Prompt
              </a>
            </div>
            <textarea
              value={formData.hypothesis}
              onChange={(e) => handleChange('hypothesis', e.target.value)}
              placeholder="If we change [X], then [Y] will happen because..."
              required
              disabled={isSubmitting}
              rows={4}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none disabled:opacity-50"
            />
          </div>

          {/* Experiment Rationale */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">
              Experiment Rationale <span className="text-rose-600">*</span>
            </label>
            <p className="text-[12px] text-muted-foreground mb-3">Describe the evidence supporting your hypothesis and why the change is likely to improve performance (analytics, user behavior, heuristics, heatmaps, etc.)</p>
            <div className="mb-2">
              <a href="https://bit.ly/mc-addtest" target="_blank" rel="noopener noreferrer" className="text-[12px] text-sky-600 hover:underline">
                ChatGPT Prompt
              </a>
            </div>
            <textarea
              value={formData.rationale}
              onChange={(e) => handleChange('rationale', e.target.value)}
              placeholder="Based on [evidence], this change will..."
              required
              disabled={isSubmitting}
              rows={4}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none disabled:opacity-50"
            />
          </div>

          {/* Primary Goals */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">
              Primary Goals <span className="text-rose-600">*</span>
            </label>
            <p className="text-[12px] text-muted-foreground mb-3">Select the metrics this test aims to influence. You may select multiple.</p>
            <div className="grid grid-cols-3 gap-2">
              {PRIMARY_GOALS.map(goal => (
                <button
                  key={goal}
                  type="button"
                  onClick={() => togglePrimaryGoal(goal)}
                  disabled={isSubmitting}
                  className={cn(
                    'px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50',
                    formData.primaryGoals.includes(goal)
                      ? 'bg-slate-700 border-slate-700 text-white'
                      : 'bg-background border-border text-foreground hover:border-slate-400'
                  )}
                >
                  {goal}
                </button>
              ))}
            </div>
          </div>

          {/* Devices & Countries */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">
                Devices <span className="text-rose-600">*</span>
              </label>
              <p className="text-[12px] text-muted-foreground mb-3">Select which device types should be targeted (Desktop, Mobile, Tablet, All).</p>
              <SelectField
                value={formData.devices}
                onChange={(v) => handleChange('devices', v)}
                options={DEVICES}
                containerClassName="w-full"
                className="w-full disabled:opacity-50"
                disabled={isSubmitting}
              />
            </div>
            <div className="relative">
              <label className="text-sm font-medium text-foreground block mb-1">
                Countries
              </label>
              <p className="text-[12px] text-muted-foreground mb-3">Select target countries (multi-select).</p>
              <button
                type="button"
                onClick={() => setShowCountriesMenu(!showCountriesMenu)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-left text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              >
                {formData.countries.length === 0 ? 'Select countries...' : `${formData.countries.length} selected`}
              </button>
              {showCountriesMenu && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {COUNTRIES.map(country => (
                    <label key={country} className="flex items-center px-3 py-2 hover:bg-muted cursor-pointer border-b border-border last:border-b-0">
                      <input
                        type="checkbox"
                        checked={formData.countries.includes(country)}
                        onChange={() => toggleCountry(country)}
                        disabled={isSubmitting}
                        className="mr-2 cursor-pointer disabled:opacity-50"
                      />
                      <span className="text-sm text-foreground">{country}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Weighting */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">
              Weighting <span className="text-rose-600">*</span>
            </label>
            <p className="text-[12px] text-muted-foreground mb-3">Define how traffic will be split between variants (e.g., 50/50, 33/33/33).</p>
            <input
              type="text"
              value={formData.weighting}
              onChange={(e) => handleChange('weighting', e.target.value)}
              placeholder="e.g. 50/50"
              required
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
          </div>

          {/* Design Brief */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">
              Design Brief <span className="text-rose-600">*</span>
            </label>
            <p className="text-[12px] text-muted-foreground mb-3">Link a Loom Video describing exactly how the test should be designed, including references, examples, layout notes, and any visual direction the designer needs. If the test includes multiple variants, provide these details for each one.</p>
            <textarea
              value={formData.designBrief}
              onChange={(e) => handleChange('designBrief', e.target.value)}
              placeholder="Paste Loom link or description..."
              required
              disabled={isSubmitting}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none disabled:opacity-50"
            />
          </div>

          {/* Development Brief */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">
              Development Brief
            </label>
            <p className="text-[12px] text-muted-foreground mb-3">Link a Loom Video describing technical requirements for implementing the test, including functionality, logic, targeting rules, and any special behaviors the developer needs to build. If there are multiple variants, include the requirements for each.</p>
            <textarea
              value={formData.developmentBrief}
              onChange={(e) => handleChange('developmentBrief', e.target.value)}
              placeholder="Paste Loom link or description..."
              disabled={isSubmitting}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none disabled:opacity-50"
            />
          </div>

          {/* Media/Links */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">
              Media/Links
            </label>
            <p className="text-[12px] text-muted-foreground mb-3">Add any supporting assets, references, screenshots, or external links that will help the team understand or execute the test. Include anything not already covered in the briefs.</p>
            <textarea
              value={formData.mediaLinks}
              onChange={(e) => handleChange('mediaLinks', e.target.value)}
              placeholder="Paste links or describe media..."
              disabled={isSubmitting}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none disabled:opacity-50"
            />
          </div>

          {/* Walkthrough Video URL */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">
              Walkthrough Video URL
            </label>
            <input
              type="url"
              value={formData.walkthroughUrl}
              onChange={(e) => handleChange('walkthroughUrl', e.target.value)}
              placeholder="e.g. https://loom.com/share/..."
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
          </div>

          {/* Submit Button */}
          <div className="flex items-center gap-3 pt-6 border-t border-border mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors text-sm font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-800 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Idea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

