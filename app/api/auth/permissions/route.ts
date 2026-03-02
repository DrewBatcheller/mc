/**
 * GET /api/auth/permissions
 *
 * Fetches permissions for the authenticated user based on their role/department.
 * Called by the client after successful login to load permissions.
 */

import { NextResponse } from 'next/server'
import { fetchUserPermissions } from '@/lib/permissions-service'

export async function POST(request: Request) {
  try {
    const { department, role } = await request.json()

    if (!department && !role) {
      return NextResponse.json({ error: 'Department or role is required' }, { status: 400 })
    }

    // Fetch permissions based on department or role
    const permissionKey = department || role
    const permissions = await fetchUserPermissions(permissionKey)

    if (!permissions) {
      return NextResponse.json({ error: 'Permissions not found' }, { status: 404 })
    }

    return NextResponse.json({ permissions })
  } catch (err) {
    console.error('[/api/auth/permissions] Error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    )
  }
}
