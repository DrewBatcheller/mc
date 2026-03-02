/**
 * Permissions service - fetch user permissions from Airtable.
 * Server-side utility to look up a user's permissions based on their Department.
 */

import { listAllRecords } from './airtable'
import type { UserPermissions, PermissionsRecord } from './permission-types'
import type { AirtableRecord } from './types'

const PERMISSIONS_TABLE = 'Permissions'
const DEFAULT_PERMISSION_VIEW = 'Team'  // Fallback for departments without unique permissions

interface AirtablePermissionsRow {
  'View': string
  'Finances'?: boolean
  'Sales'?: boolean
  'Experiments'?: boolean
  'Clients'?: boolean
  'Client Dashboard'?: boolean
  'Management'?: boolean
  'Team'?: boolean
  'Affiliates'?: boolean
}

/**
 * Fetch user permissions from Airtable based on their Department.
 * If Department doesn't have a unique Permissions entry, defaults to "Team".
 *
 * @param department - User's department (from Team table) or role name
 * @returns UserPermissions object or null if lookup fails
 */
export async function fetchUserPermissions(department: string): Promise<UserPermissions | null> {
  try {
    // Try exact match first
    let permissions = await lookupPermissionsByView(department)
    
    // Fall back to "Team" if not found
    if (!permissions) {
      console.log(`[permissions] Department "${department}" not found, using fallback "Team"`)
      permissions = await lookupPermissionsByView(DEFAULT_PERMISSION_VIEW)
    }
    
    return permissions
  } catch (err) {
    console.error('[permissions] Failed to fetch permissions:', err)
    return null
  }
}

/**
 * Look up a specific permission view by name
 */
async function lookupPermissionsByView(viewName: string): Promise<UserPermissions | null> {
  try {
    const records = await listAllRecords<AirtablePermissionsRow>(PERMISSIONS_TABLE)
    
    console.log(`[v0] Fetched ${records.length} records from Permissions table`)
    console.log(`[v0] Looking for view: "${viewName}"`)
    console.log(`[v0] Available views:`, records.map(r => ({ view: r.fields['View'], id: r.id })))
    
    const record = records.find(r => {
      const view = (r.fields)['View']
      const matches = view?.toLowerCase() === viewName.toLowerCase()
      console.log(`[v0] Comparing "${view}" (type: ${typeof view}) with "${viewName}" (type: ${typeof viewName}) => ${matches}`)
      return matches
    })
    
    if (!record) {
      console.log(`[v0] No record found for view "${viewName}"`)
      return null
    }
    
    const fields = record.fields
    
    return {
      finances: fields['Finances'] ?? false,
      sales: fields['Sales'] ?? false,
      experiments: fields['Experiments'] ?? false,
      clients: fields['Clients'] ?? false,
      clientDashboard: fields['Client Dashboard'] ?? false,
      management: fields['Management'] ?? false,
      team: fields['Team'] ?? false,
      affiliates: fields['Affiliates'] ?? false,
    }
  } catch (err) {
    console.error(`[permissions] Failed to lookup view "${viewName}":`, err)
    return null
  }
}

/**
 * Get all available permission views (for debugging/admin)
 */
export async function getAllPermissionViews(): Promise<PermissionsRecord[]> {
  try {
    const records = await listAllRecords<AirtablePermissionsRow>(PERMISSIONS_TABLE)
    
    return records.map(r => ({
      view: r.fields['View'] || 'Unknown',
      permissions: {
        finances: r.fields['Finances'] ?? false,
        sales: r.fields['Sales'] ?? false,
        experiments: r.fields['Experiments'] ?? false,
        clients: r.fields['Clients'] ?? false,
        clientDashboard: r.fields['Client Dashboard'] ?? false,
        management: r.fields['Management'] ?? false,
        team: r.fields['Team'] ?? false,
        affiliates: r.fields['Affiliates'] ?? false,
      },
      recordId: r.id,
    }))
  } catch (err) {
    console.error('[permissions] Failed to fetch all permission views:', err)
    return []
  }
}
