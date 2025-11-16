import React from 'react'

/**
 * Utility functions for email handling
 * Note: This file must be .tsx (not .ts) because it contains JSX
 */

/**
 * Check if a string is a valid email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Convert email text to a clickable mailto link
 * If the text contains an email, it will be wrapped in an <a> tag
 */
export function emailToLink(email: string | null | undefined): React.ReactNode {
  if (!email) return null
  
  const trimmed = email.trim()
  if (!isValidEmail(trimmed)) {
    return <span>{email}</span>
  }
  
  return (
    <a 
      href={`mailto:${trimmed}`}
      className="text-blue-600 hover:text-blue-800 hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      {email}
    </a>
  )
}


