/**
 * Permissions service - fetch user permissions from Airtable.
 * Server-side utility to look up a user's permissions based on their Department.
 */

import { listRecords } from './airtable'
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
    const records = await listRecords(PERMISSIONS_TABLE)
    
    const record = records.find(r => {
      const view = (r.fields as AirtablePermissionsRow)['View']
      return view?.toLowerCase() === viewName.toLowerCase()
    })
    
    if (!record) return null
    
    const fields = record.fields as AirtablePermissionsRow
    
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
    const records = await listRecords(PERMISSIONS_TABLE)
    
    return records.map(r => ({
      view: (r.fields as AirtablePermissionsRow)['View'] || 'Unknown',
      permissions: {
        finances: (r.fields as AirtablePermissionsRow)['Finances'] ?? false,
        sales: (r.fields as AirtablePermissionsRow)['Sales'] ?? false,
        experiments: (r.fields as AirtablePermissionsRow)['Experiments'] ?? false,
        clients: (r.fields as AirtablePermissionsRow)['Clients'] ?? false,
        clientDashboard: (r.fields as AirtablePermissionsRow)['Client Dashboard'] ?? false,
        management: (r.fields as AirtablePermissionsRow)['Management'] ?? false,
        team: (r.fields as AirtablePermissionsRow)['Team'] ?? false,
        affiliates: (r.fields as AirtablePermissionsRow)['Affiliates'] ?? false,
      },
      recordId: r.id,
    }))
  } catch (err) {
    console.error('[permissions] Failed to fetch all permission views:', err)
    return []
  }
}
