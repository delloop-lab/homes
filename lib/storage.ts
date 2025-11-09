import { createClient } from '@/lib/supabase'

export interface UploadResult {
  success: boolean
  url?: string
  error?: string
}

export class StorageService {
  private getSupabaseClient() {
    const client = createClient()
    if (!client) throw new Error('Supabase client not available')
    return client
  }

  /**
   * Upload file to Supabase Storage
   */
  async uploadFile(
    file: File, 
    bucket: string = 'indentification',
    folder: string = 'bookings'
  ): Promise<UploadResult> {
    try {
      const supabase = this.getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { success: false, error: 'Not authenticated' }

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

      // Upload file
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || undefined
        })

      if (error) {
        console.error('Storage upload error:', error)
        return {
          success: false,
          error: error.message
        }
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path)

      return {
        success: true,
        url: urlData.publicUrl
      }

    } catch (error) {
      console.error('Upload service error:', error)
      return {
        success: false,
        error: String(error)
      }
    }
  }

  /**
   * Delete file from Supabase Storage
   */
  async deleteFile(url: string, bucket: string = 'passport-images'): Promise<boolean> {
    try {
      const supabase = this.getSupabaseClient()

      // Extract path from URL
      const urlParts = url.split('/')
      const bucketIndex = urlParts.findIndex(part => part === bucket)
      if (bucketIndex === -1) return false

      const filePath = urlParts.slice(bucketIndex + 1).join('/')

      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath])

      if (error) {
        console.error('Storage delete error:', error)
        return false
      }

      return true

    } catch (error) {
      console.error('Delete service error:', error)
      return false
    }
  }

  /**
   * Convert file to base64 (fallback for when Supabase Storage is not available)
   */
  async fileToBase64(file: File): Promise<UploadResult> {
    return new Promise((resolve) => {
      const reader = new FileReader()
      
      reader.onload = (event) => {
        const base64String = event.target?.result as string
        resolve({
          success: true,
          url: base64String
        })
      }
      
      reader.onerror = () => {
        resolve({
          success: false,
          error: 'Failed to convert file to base64'
        })
      }
      
      reader.readAsDataURL(file)
    })
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return {
        valid: false,
        error: 'Please select a valid image file'
      }
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return {
        valid: false,
        error: 'Image must be less than 5MB'
      }
    }

    // Check file name length
    if (file.name.length > 255) {
      return {
        valid: false,
        error: 'File name is too long'
      }
    }

    return { valid: true }
  }
}

// Export singleton instance
export const storageService = new StorageService()