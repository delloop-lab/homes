import { createClient } from '@/lib/supabase'

export type Property = {
  id: string
  name: string
  address: string
  notes: string | null
  host_id: string
  created_at: string
  updated_at: string
  image_url?: string | null
  default_cleaning_cost?: number | null
  cleaning_duration_minutes?: number | null
}

export interface CreatePropertyInput {
  name: string
  address: string
  notes?: string
  default_cleaning_cost?: number
  cleaning_duration_minutes?: number
}

export interface UpdatePropertyInput {
  id: string
  name?: string
  address?: string
  notes?: string | null
  default_cleaning_cost?: number | null
  cleaning_duration_minutes?: number | null
}

class PropertiesService {
  private getClient() {
    const client = createClient()
    if (!client) throw new Error('Supabase client not available')
    return client
  }

  async listMyProperties(): Promise<{ data: Property[]; error: string | null }> {
    try {
      const supabase = this.getClient()
      
      // Add timeout to prevent hanging
      const queryPromise = supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false })
      
      const timeoutPromise = new Promise<{ data: any[]; error: { message: string } }>((resolve) => {
        setTimeout(() => resolve({ 
          data: [], 
          error: { message: 'Request timed out after 10 seconds' } 
        }), 10000)
      })
      
      const { data, error } = await Promise.race([queryPromise, timeoutPromise])
      
      if (error) return { data: [], error: error.message }
      return { data: (data || []) as Property[], error: null }
    } catch (e) {
      return { data: [], error: String(e) }
    }
  }

  async createProperty(input: CreatePropertyInput): Promise<{ data: Property | null; error: string | null }> {
    try {
      const supabase = this.getClient()
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id
      if (!userId) return { data: null, error: 'Not authenticated' }

      const { data, error } = await supabase
        .from('properties')
        .insert({
          name: input.name,
          address: input.address,
          notes: input.notes || null,
          host_id: userId,
          default_cleaning_cost: input.default_cleaning_cost ?? null,
          cleaning_duration_minutes: input.cleaning_duration_minutes ?? null,
        })
        .select('*')
        .single()

      if (error) return { data: null, error: error.message }
      return { data: data as Property, error: null }
    } catch (e) {
      return { data: null, error: String(e) }
    }
  }

  async updateProperty(input: UpdatePropertyInput): Promise<{ data: Property | null; error: string | null }> {
    try {
      const supabase = this.getClient()
      const updates: Partial<Property> = {}
      if (typeof input.name === 'string') updates.name = input.name
      if (typeof input.address === 'string') updates.address = input.address
      if (input.notes !== undefined) updates.notes = input.notes
      if (input.default_cleaning_cost !== undefined) updates.default_cleaning_cost = input.default_cleaning_cost
      if (input.cleaning_duration_minutes !== undefined) updates.cleaning_duration_minutes = input.cleaning_duration_minutes

      const { data, error } = await supabase
        .from('properties')
        .update(updates)
        .eq('id', input.id)
        .select('*')
        .single()

      if (error) return { data: null, error: error.message }
      return { data: data as Property, error: null }
    } catch (e) {
      return { data: null, error: String(e) }
    }
  }

  async uploadPropertyImage(propertyId: string, file: File): Promise<{ url: string | null; error: string | null }> {
    try {
      const supabase = this.getClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      console.log('Upload started - User:', user?.id, 'Property:', propertyId, 'File:', file.name)
      
      if (!user) {
        console.error('No authenticated user found')
        return { url: null, error: 'Not authenticated' }
      }

      // Validate file
      if (file.size > 5 * 1024 * 1024) {
        return { url: null, error: 'File too large (max 5MB)' }
      }

      // Step 1: Check if properties bucket exists
      const { data: bucket, error: bucketError } = await supabase.storage.getBucket('properties')
      if (bucketError) {
        console.error('Properties bucket check failed:', bucketError)
        return { url: null, error: `Storage bucket error: ${bucketError.message}` }
      }
      console.log('Properties bucket exists:', bucket?.public)

      // Step 2: Get the current property to check for existing image
      const { data: property, error: propError } = await supabase
        .from('properties')
        .select('image_url')
        .eq('id', propertyId)
        .single()

      if (propError) {
        console.error('Property fetch error:', propError)
        return { url: null, error: `Property not found: ${propError.message}` }
      }

      // Step 3: Delete old image if it exists
      if (property?.image_url) {
        try {
          const urlParts = property.image_url.split('/storage/v1/object/public/properties/')
          if (urlParts.length > 1) {
            const oldFilePath = urlParts[1]
            const { error: deleteError } = await supabase.storage.from('properties').remove([oldFilePath])
            if (deleteError) {
              console.warn('Could not delete old image:', deleteError)
            } else {
              console.log('Deleted old image:', oldFilePath)
            }
          }
        } catch (deleteError) {
          console.warn('Delete old image error:', deleteError)
        }
      }

      // Step 4: Upload new image
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${user.id}/${propertyId}.${ext}`
      
      console.log('Uploading to path:', path)

      const { data: uploadData, error: upErr } = await supabase.storage
        .from('properties')
        .upload(path, file, {
          upsert: true,
          cacheControl: '3600',
          contentType: file.type || `image/${ext}`
        })
      
      if (upErr) {
        console.error('Upload error:', upErr)
        return { url: null, error: `Upload failed: ${upErr.message}` }
      }

      console.log('Upload successful:', uploadData?.path)

      // Step 5: Get the new public URL
      const { data: pub } = supabase.storage.from('properties').getPublicUrl(path)
      const publicUrl = pub.publicUrl
      
      console.log('Public URL generated:', publicUrl)

      // Step 6: Update the property record
      const { error: updateErr } = await supabase
        .from('properties')
        .update({ image_url: publicUrl })
        .eq('id', propertyId)

      if (updateErr) {
        console.error('Database update error:', updateErr)
        return { url: null, error: `Database update failed: ${updateErr.message}` }
      }

      console.log('Property updated successfully with new image URL')
      return { url: publicUrl, error: null }
      
    } catch (e) {
      console.error('Upload service error:', e)
      return { url: null, error: String(e) }
    }
  }
}

export const propertiesService = new PropertiesService()


