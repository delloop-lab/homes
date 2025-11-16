import { createClient } from '@/lib/supabase'
import { decrypt } from '@/lib/encryption'

export interface ReferralSiteConfig {
  id: string
  property_id: string
  platform: string
  hotel_id?: string | null
  currency_code?: string | null
  currency_symbol?: string | null
  account_number?: string | null
  username?: string | null
  password_encrypted?: string | null
  password?: string | null // Decrypted password (only when explicitly requested)
  api_key?: string | null
  api_secret?: string | null
  extranet_url?: string | null
  config_data?: any
  is_active: boolean
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface CreateReferralSiteConfigData {
  property_id: string
  platform: string
  hotel_id?: string
  currency_code?: string
  currency_symbol?: string
  account_number?: string
  username?: string
  password?: string // Plain text password (will be encrypted before storing)
  api_key?: string
  api_secret?: string
  extranet_url?: string
  config_data?: any
  is_active?: boolean
  notes?: string
}

export interface UpdateReferralSiteConfigData extends Partial<CreateReferralSiteConfigData> {
  id: string
}

export class ReferralSiteService {
  private getSupabaseClient() {
    const client = createClient()
    if (!client) throw new Error('Supabase client not available')
    return client
  }

  /**
   * Get all referral site configs for a property
   * Passwords are NOT decrypted by default (only encrypted version is returned)
   */
  async getConfigsByProperty(propertyId: string, decryptPasswords: boolean = false): Promise<{ data: ReferralSiteConfig[]; error: string | null }> {
    try {
      const supabase = this.getSupabaseClient()
      
      const { data, error } = await supabase
        .from('referral_site_configs')
        .select('*')
        .eq('property_id', propertyId)
        .order('platform', { ascending: true })

      if (error) {
        console.error('Error fetching referral site configs:', error)
        return { data: [], error: error.message }
      }

      // Decrypt passwords if requested
      const configs = (data || []).map((config: any) => {
        const result: ReferralSiteConfig = { ...config }
        if (decryptPasswords && config.password_encrypted) {
          try {
            result.password = decrypt(config.password_encrypted)
          } catch (err) {
            console.error('Failed to decrypt password for config:', config.id, err)
            result.password = null
          }
        }
        return result
      })

      return { data: configs, error: null }
    } catch (error) {
      console.error('Referral site configs fetch error:', error)
      return { data: [], error: String(error) }
    }
  }

  /**
   * Get a specific referral site config by property and platform
   */
  async getConfig(propertyId: string, platform: string): Promise<{ data: ReferralSiteConfig | null; error: string | null }> {
    try {
      const supabase = this.getSupabaseClient()
      
      const { data, error } = await supabase
        .from('referral_site_configs')
        .select('*')
        .eq('property_id', propertyId)
        .eq('platform', platform)
        .maybeSingle()

      if (error) {
        console.error('Error fetching referral site config:', error)
        return { data: null, error: error.message }
      }

      return { data: data as ReferralSiteConfig | null, error: null }
    } catch (error) {
      console.error('Referral site config fetch error:', error)
      return { data: null, error: String(error) }
    }
  }

  /**
   * Create or update a referral site config (upsert)
   * NOTE: Password encryption is handled server-side via API route
   * This method is kept for backward compatibility but should use API route instead
   */
  async upsertConfig(configData: CreateReferralSiteConfigData): Promise<{ data: ReferralSiteConfig | null; error: string | null }> {
    try {
      // Use API route for encryption
      const response = await fetch('/api/referral-sites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configData),
      })

      const result = await response.json()
      
      if (result.error) {
        return { data: null, error: result.error }
      }

      return { data: result.data, error: null }
    } catch (error) {
      console.error('Referral site config upsert error:', error)
      return { data: null, error: String(error) }
    }
  }

  /**
   * Update a referral site config
   * NOTE: Password encryption is handled server-side via API route
   */
  async updateConfig(updateData: UpdateReferralSiteConfigData): Promise<{ data: ReferralSiteConfig | null; error: string | null }> {
    try {
      // Use API route for encryption
      const response = await fetch('/api/referral-sites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      const result = await response.json()
      
      if (result.error) {
        return { data: null, error: result.error }
      }

      return { data: result.data, error: null }
    } catch (error) {
      console.error('Referral site config update error:', error)
      return { data: null, error: String(error) }
    }
  }

  /**
   * Delete a referral site config
   */
  async deleteConfig(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabase = this.getSupabaseClient()

      const { error } = await supabase
        .from('referral_site_configs')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting referral site config:', error)
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (error) {
      console.error('Referral site config delete error:', error)
      return { success: false, error: String(error) }
    }
  }
}

// Export singleton instance
export const referralSiteService = new ReferralSiteService()

