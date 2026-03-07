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
  'Name': string
  'Finances'?: string | boolean
  'Finances View Only'?: string | boolean
  'Sales'?: string | boolean
  'Experiments'?: string | boolean
  'Clients'?: string | boolean
  'Client Dashboard'?: string | boolean
  'Management'?: string | boolean
  'Team'?: string | boolean
  'Affiliates'?: string | boolean
  'Forms'?: string | boolean
}

/**
 * Convert Airtable checkbox value to boolean
 * Airtable returns "checked" for checked boxes, empty string/undefined for unchecked
 */
function toBoolean(value: string | boolean | undefined): boolean {
  if (typeof value === 'boolean') return value
  return value === 'checked'
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
 * Look up a specific permission name/role
 */
async function lookupPermissionsByView(viewName: string): Promise<UserPermissions | null> {
  try {
    const records = await listAllRecords<AirtablePermissionsRow>(PERMISSIONS_TABLE)
    
    const record = records.find(r => {
      const name = r.fields['Name']
      return name?.toLowerCase() === viewName.toLowerCase()
    })
    
    if (!record) return null
    
    const fields = record.fields
    
    return {
      finances: toBoolean(fields['Finances']),
      financesViewOnly: toBoolean(fields['Finances View Only']),
      sales: toBoolean(fields['Sales']),
      experiments: toBoolean(fields['Experiments']),
      clients: toBoolean(fields['Clients']),
      clientDashboard: toBoolean(fields['Client Dashboard']),
      management: toBoolean(fields['Management']),
      team: toBoolean(fields['Team']),
      affiliates: toBoolean(fields['Affiliates']),
      forms: toBoolean(fields['Forms']),
    }
  } catch (err) {
    console.error(`[permissions] Failed to lookup permission "${viewName}":`, err)
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
      view: r.fields['Name'] || 'Unknown',
      permissions: {
        finances: toBoolean(r.fields['Finances']),
        financesViewOnly: toBoolean(r.fields['Finances View Only']),
        sales: toBoolean(r.fields['Sales']),
        experiments: toBoolean(r.fields['Experiments']),
        clients: toBoolean(r.fields['Clients']),
        clientDashboard: toBoolean(r.fields['Client Dashboard']),
        management: toBoolean(r.fields['Management']),
        team: toBoolean(r.fields['Team']),
        affiliates: toBoolean(r.fields['Affiliates']),
        forms: toBoolean(r.fields['Forms']),
      },
      recordId: r.id,
    }))
  } catch (err) {
    console.error('[permissions] Failed to fetch all permission views:', err)
    return []
  }
}
