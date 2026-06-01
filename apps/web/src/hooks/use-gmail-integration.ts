'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export function useGmailIntegration() {
  const [isConnected, setIsConnected] = useState(false)
  const [gmailEmail, setGmailEmail] = useState<string | null>(null)
  const [status, setStatus] = useState<'active' | 'expired' | 'revoked' | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createSupabaseBrowserClient()

  const checkIntegration = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setIsConnected(false)
        setGmailEmail(null)
        setStatus(null)
        setIsLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('integrations')
        .select('status, metadata')
        .eq('provider', 'gmail')
        .eq('founder_id', session.user.id)
        .maybeSingle()

      if (error) {
        console.error('Error loading integration:', error)
      }

      if (data) {
        setIsConnected(true)
        setGmailEmail(data.metadata?.gmail_email || null)
        setStatus(data.status as any)
      } else {
        setIsConnected(false)
        setGmailEmail(null)
        setStatus(null)
      }
    } catch (e) {
      console.error('Unexpected error checking Gmail integration:', e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkIntegration()
    // Listen for window focus to refresh integration state (e.g. after returning from OAuth popup/tab redirection)
    window.addEventListener('focus', checkIntegration)
    return () => window.removeEventListener('focus', checkIntegration)
  }, [])

  const disconnect = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('provider', 'gmail')
        .eq('founder_id', session.user.id)

      if (error) {
        throw error
      }

      setIsConnected(false)
      setGmailEmail(null)
      setStatus(null)
    } catch (e) {
      console.error('Failed to disconnect Gmail:', e)
      throw e
    }
  }

  return {
    isConnected,
    gmailEmail,
    status,
    isLoading,
    disconnect,
    refetch: checkIntegration,
  }
}
