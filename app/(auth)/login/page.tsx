'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    // Simulate login delay
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // Store auth state in localStorage (mockup only)
    localStorage.setItem('isAuthenticated', 'true')
    localStorage.setItem('userEmail', email)
    
    // Redirect to dashboard
    router.push('/clients/client-dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-2">Sign in to your account to continue</p>
        </div>

        {/* Login form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-sky-500 transition-all"
            />
          </div>

          {/* Password field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                Password
              </label>
              <a href="#" className="text-xs text-sky-600 hover:text-sky-700">
                Forgot password?
              </a>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-sky-500 transition-all"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-sky-600 hover:bg-sky-700 disabled:bg-muted text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm mt-6"
          >
            {isLoading ? (
              <>
                <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        {/* Demo mode note */}
        <p className="text-xs text-muted-foreground text-center mt-6">
          Demo mode: Enter any email and password to continue
        </p>
      </div>
    </div>
  )
}
