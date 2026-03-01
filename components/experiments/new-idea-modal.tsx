'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SelectField } from '@/components/shared/select-field'

interface NewIdeaModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: FormData) => void
}

interface FormData {
  client: string
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

const clients = ['The Ayurveda Experience', 'Vita Hustle', 'Cosara', 'Fake Brand', 'Dr Woof Apparel', 'Shop Noble', 'Perfect White Tee', 'Goose Creek Candles', 'Live Love Locks LLC']

const PRIMARY_GOALS = ['ATC', 'SCVR', 'CVR', 'AOV', 'RPV', 'APPV', 'PPV', 'CTR', 'Other', 'LTV', 'Bounce Rate', 'Session Depth', 'Search Usage', 'Units per Order', 'Add to Cart Rate', 'Trust Score', 'Bundle CTR']

const DEVICES = ['All Devices', 'Desktop', 'Mobile']

const COUNTRIES = ['United States', 'Canada', 'United Kingdom', 'Australia', 'Mexico', 'European Union', 'Germany', 'France', 'Spain', 'Italy', 'Japan', 'South Korea', 'India', 'Brazil', 'New Zealand', 'AU (Primary Focus)', 'All GEOs', 'International']

export function NewIdeaModal({ isOpen, onClose, onSubmit }: NewIdeaModalProps) {
  const [showCountriesMenu, setShowCountriesMenu] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    client: '',
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Validate all required fields
    if (!formData.client || !formData.title || !formData.placementLabel || !formData.placementUrl || 
        !formData.hypothesis || !formData.rationale || formData.primaryGoals.length === 0 || 
        !formData.weighting || !formData.designBrief) {
      alert('Please fill in all required fields')
      return
    }
    onSubmit(formData)
    setFormData({
      client: '',
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
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-lg">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-border bg-card">
          <h2 className="text-lg font-semibold text-foreground">Add an Experiment Idea</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-md transition-colors"
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
            <p className="text-[12px] text-muted-foreground mb-3">Select the brand this experiment idea belongs to.</p>
            <SelectField
              value={formData.client || "Select a client..."}
              onChange={(v) => handleChange('client', v === "Select a client..." ? "" : v)}
              options={["Select a client...", ...clients]}
              containerClassName="w-full"
              className="w-full"
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
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
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
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
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
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
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
              rows={4}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
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
              rows={4}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
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
                  className={cn(
                    'px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors',
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
                className="w-full"
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
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-left text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
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
                        className="mr-2 cursor-pointer"
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
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
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
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
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
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
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
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
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
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Submit Button */}
          <div className="flex items-center gap-3 pt-6 border-t border-border mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-800 transition-colors text-sm font-medium"
            >
              Create Idea
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

