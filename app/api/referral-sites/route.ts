import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { encrypt } from '@/lib/encryption'

/**
 * POST /api/referral-sites - Create or update a referral site config
 * Handles password encryption server-side
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 })
    }

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      id,
      property_id,
      platform,
      hotel_id,
      account_number,
      username,
      password,
      extranet_url,
      config_data,
      is_active,
      notes,
      currency_code,
      currency_symbol
    } = body

    // Verify user owns the property
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', property_id)
      .eq('host_id', user.id)
      .single()

    if (propError || !property) {
      return NextResponse.json({ error: 'Property not found or access denied' }, { status: 403 })
    }

    // Encrypt password if provided
    let passwordEncrypted: string | null = null
    if (password && password.trim() !== '') {
      try {
        passwordEncrypted = encrypt(password)
      } catch (err) {
        console.error('Failed to encrypt password:', err)
        return NextResponse.json({ error: 'Failed to encrypt password' }, { status: 500 })
      }
    }

    const insertData: any = {
      property_id,
      platform,
      hotel_id: hotel_id || null,
      account_number: account_number || null,
      username: username || null,
      extranet_url: extranet_url || null,
      config_data: config_data || {},
      is_active: is_active !== undefined ? is_active : true,
      notes: notes || null,
      currency_code: currency_code || null,
      currency_symbol: currency_symbol || null,
      updated_at: new Date().toISOString()
    }

    // Only set password_encrypted if a new password was provided
    if (passwordEncrypted !== null) {
      insertData.password_encrypted = passwordEncrypted
    }

    let result
    if (id) {
      // Update existing
      const updateFields: any = { ...insertData }
      // If updating and no password provided, don't update password_encrypted
      if (password === undefined) {
        delete updateFields.password_encrypted
      } else if (password === '') {
        // Empty string means clear the password
        updateFields.password_encrypted = null
      }

      const { data, error } = await supabase
        .from('referral_site_configs')
        .update(updateFields)
        .eq('id', id)
        .eq('property_id', property_id) // Extra security check
        .select()
        .single()

      if (error) {
        console.error('Error updating referral site config:', error)
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      result = data
    } else {
      // Create new
      const { data, error } = await supabase
        .from('referral_site_configs')
        .upsert(insertData, {
          onConflict: 'property_id,platform',
          ignoreDuplicates: false
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating referral site config:', error)
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      result = data
    }

    return NextResponse.json({ data: result, error: null })
  } catch (error: any) {
    console.error('Referral site API error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

