'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SelectField } from '@/components/shared/select-field'
import { useToast } from '@/hooks/use-toast'

interface NewIdeaModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  clientName: string
  clientId: string
}

interface FormData {
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

export function NewIdeaModal({ isOpen, onClose, onSuccess, clientName, clientId }: NewIdeaModalProps) {
  const { toast } = useToast()
  const [showCountriesMenu, setShowCountriesMenu] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<FormData>({
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
    if (!formData.title || !formData.placementLabel || !formData.placementUrl || !formData.hypothesis || !formData.rationale || formData.primaryGoals.length === 0 || !formData.weighting || !formData.designBrief) {
      toast({ title: 'Missing required fields', description: 'Please fill in all required fields', variant: 'destructive' })
      return
    }

    setIsSubmitting(true)
    
    try {
      const airtableFields = {
        'Test Description': formData.title,
        'Placement': formData.placementLabel,
        'Placement URL': formData.placementUrl,
        'Hypothesis': formData.hypothesis,
        'Rationale': formData.rationale,
        'Primary Goals': formData.primaryGoals.join(', '),
        'Devices': formData.devices,
        'GEOs': formData.countries.join(', '),
        'Weighting': formData.weighting,
        'Design Brief': formData.designBrief,
        'Development Brief': formData.developmentBrief,
        'Media/Links': formData.mediaLinks,
        'Walkthrough Video URL': formData.walkthroughUrl,
        'Brand Name': clientId,
      }

      const response = await fetch('/api/airtable/experiment-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: airtableFields }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create idea')
      }

      toast({ title: 'Success', description: 'Experiment idea created successfully' })
      
      setFormData({
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-lg">
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-border bg-card">
          <h2 className="text-lg font-semibold text-foreground">Add a Test Idea for {clientName}</h2>
          <button onClick={onClose} disabled={isSubmitting} className="p-1 hover:bg-muted rounded-md transition-colors disabled:opacity-50">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">
              Test Description <span className="text-rose-600">*</span>
            </label>
            <p className="text-[12px] text-muted-foreground mb-3">A short, clear title describing the test</p>
            <input type="text" value={formData.title} onChange={(e) => handleChange('title', e.target.value)} placeholder="e.g. 'Sticky Add to Cart on PDP'" required disabled={isSubmitting} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">
                Placement <span className="text-rose-600">*</span>
              </label>
              <p className="text-[12px] text-muted-foreground mb-3">Enter the placement where the experiment will run. Separate with commas if multiple.</p>
              <input type="text" value={formData.placementLabel} onChange={(e) => handleChange('placementLabel', e.target.value)} placeholder="e.g. Below ATC" required disabled={isSubmitting} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">
                Placement URL <span className="text-rose-600">*</span>
              </label>
              <p className="text-[12px] text-muted-foreground mb-3">Enter the URL(s) where the test will run.</p>
              <input type="text" value={formData.placementUrl} onChange={(e) => handleChange('placementUrl', e.target.value)} placeholder="e.g. https://store.com/product" required disabled={isSubmitting} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1">
              Hypothesis <span className="text-rose-600">*</span>
            </label>
            <p className="text-[12px] text-muted-foreground mb-3">State the expected outcome of the change and the reasoning behind it.</p>
            <textarea value={formData.hypothesis} onChange={(e) => handleChange('hypothesis', e.target.value)} placeholder="If we change [X], then [Y] will happen because..." required disabled={isSubmitting} rows={4} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none disabled:opacity-50" />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1">
              Rationale <span className="text-rose-600">*</span>
            </label>
            <p className="text-[12px] text-muted-foreground mb-3">Describe the evidence supporting your hypothesis and why this change is likely to improve performance.</p>
            <textarea value={formData.rationale} onChange={(e) => handleChange('rationale', e.target.value)} placeholder="Based on [evidence], this change will..." required disabled={isSubmitting} rows={4} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none disabled:opacity-50" />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1">
              Primary Goals <span className="text-rose-600">*</span>
            </label>
            <p className="text-[12px] text-muted-foreground mb-3">Select the metrics this test aims to influence. You may select multiple.</p>
            <div className="grid grid-cols-3 gap-2">
              {PRIMARY_GOALS.map(goal => (
                <button key={goal} type="button" onClick={() => togglePrimaryGoal(goal)} disabled={isSubmitting} className={cn('px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50', formData.primaryGoals.includes(goal) ? 'bg-slate-700 border-slate-700 text-white' : 'bg-background border-border text-foreground hover:border-slate-400')}>
                  {goal}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">
                Devices <span className="text-rose-600">*</span>
              </label>
              <p className="text-[12px] text-muted-foreground mb-3">Select which device types should be targeted.</p>
              <SelectField value={formData.devices} onChange={(v) => handleChange('devices', v)} options={DEVICES} containerClassName="w-full" className="w-full disabled:opacity-50" disabled={isSubmitting} />
            </div>
            <div className="relative">
              <label className="text-sm font-medium text-foreground block mb-1">Countries</label>
              <p className="text-[12px] text-muted-foreground mb-3">Select target countries (multi-select).</p>
              <button type="button" onClick={() => setShowCountriesMenu(!showCountriesMenu)} disabled={isSubmitting} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-left text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50">
                {formData.countries.length === 0 ? 'Select countries...' : `${formData.countries.length} selected`}
              </button>
              {showCountriesMenu && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {COUNTRIES.map(country => (
                    <label key={country} className="flex items-center px-3 py-2 hover:bg-muted cursor-pointer border-b border-border last:border-b-0">
                      <input type="checkbox" checked={formData.countries.includes(country)} onChange={() => toggleCountry(country)} disabled={isSubmitting} className="mr-2 cursor-pointer disabled:opacity-50" />
                      <span className="text-sm text-foreground">{country}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1">
              Weighting <span className="text-rose-600">*</span>
            </label>
            <p className="text-[12px] text-muted-foreground mb-3">Define how traffic will be split between variants (e.g., 50/50, 33/33/33).</p>
            <input type="text" value={formData.weighting} onChange={(e) => handleChange('weighting', e.target.value)} placeholder="e.g. 50/50" required disabled={isSubmitting} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50" />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1">
              Design Brief <span className="text-rose-600">*</span>
            </label>
            <p className="text-[12px] text-muted-foreground mb-3">Link a Loom Video describing exactly how the test should be designed, including references, examples, and visual direction.</p>
            <textarea value={formData.designBrief} onChange={(e) => handleChange('designBrief', e.target.value)} placeholder="Paste Loom link or description..." required disabled={isSubmitting} rows={3} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none disabled:opacity-50" />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Development Brief</label>
            <p className="text-[12px] text-muted-foreground mb-3">Link a Loom Video describing technical requirements for implementing the test, including functionality and targeting rules.</p>
            <textarea value={formData.developmentBrief} onChange={(e) => handleChange('developmentBrief', e.target.value)} placeholder="Paste Loom link or description..." disabled={isSubmitting} rows={3} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none disabled:opacity-50" />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Media/Links</label>
            <p className="text-[12px] text-muted-foreground mb-3">Add any supporting assets, references, screenshots, or external links that will help the team understand or execute the test.</p>
            <textarea value={formData.mediaLinks} onChange={(e) => handleChange('mediaLinks', e.target.value)} placeholder="Paste links or describe media..." disabled={isSubmitting} rows={3} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none disabled:opacity-50" />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Walkthrough Video URL</label>
            <input type="url" value={formData.walkthroughUrl} onChange={(e) => handleChange('walkthroughUrl', e.target.value)} placeholder="e.g. https://loom.com/share/..." disabled={isSubmitting} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50" />
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-border">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
              {isSubmitting ? 'Creating...' : 'Create Idea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
