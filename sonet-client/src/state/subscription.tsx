import React, {createContext, useContext, useState, useEffect} from 'react'
import {type SubscriptionTier, type UserSubscription, SUBSCRIPTION_TIERS, getSubscriptionTier} from '#/types/subscription'

interface SubscriptionContextType {
  currentTier: SubscriptionTier
  subscription: UserSubscription | null
  isLoading: boolean
  upgradeSubscription: (tier: SubscriptionTier) => Promise<void>
  cancelSubscription: () => Promise<void>
  hasFeature: (requiredTier: SubscriptionTier) => boolean
  getUpgradeMessage: () => string
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

export function SubscriptionProvider({children}: {children: React.ReactNode}) {
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>('free')
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Mock subscription data - replace with actual API calls
  useEffect(() => {
    // Simulate loading subscription data
    const loadSubscription = async () => {
      setIsLoading(true)
      try {
        // TODO: Replace with actual API call
        // const userSubscription = await api.getUserSubscription()
        
        // For now, default to free tier
        setCurrentTier('free')
        setSubscription(null)
      } catch (error) {
        console.error('Failed to load subscription:', error)
        setCurrentTier('free')
        setSubscription(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadSubscription()
  }, [])

  const upgradeSubscription = async (tier: SubscriptionTier): Promise<void> => {
    setIsLoading(true)
    try {
      // TODO: Replace with actual payment processing
      // await api.upgradeSubscription(tier)
      
      const newSubscription: UserSubscription = {
        tier,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        autoRenew: true,
        features: getSubscriptionTier(tier).features
      }
      
      setCurrentTier(tier)
      setSubscription(newSubscription)
      
      // Show success message
      console.log(`Successfully upgraded to ${tier}!`)
    } catch (error) {
      console.error('Failed to upgrade subscription:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const cancelSubscription = async (): Promise<void> => {
    setIsLoading(true)
    try {
      // TODO: Replace with actual API call
      // await api.cancelSubscription()
      
      setCurrentTier('free')
      setSubscription(null)
      
      console.log('Subscription cancelled successfully')
    } catch (error) {
      console.error('Failed to cancel subscription:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const hasFeature = (requiredTier: SubscriptionTier): boolean => {
    const tierOrder = ['free', 'pro', 'max', 'ultra']
    const userIndex = tierOrder.indexOf(currentTier)
    const requiredIndex = tierOrder.indexOf(requiredTier)
    return userIndex >= requiredIndex
  }

  const getUpgradeMessage = (): string => {
    switch (currentTier) {
      case 'free':
        return 'Upgrade to Pro to unlock your potential!'
      case 'pro':
        return 'Level up to Max for business tools!'
      case 'max':
        return 'Join the Ultra elite!'
      default:
        return 'You have the ultimate experience!'
    }
  }

  const value: SubscriptionContextType = {
    currentTier,
    subscription,
    isLoading,
    upgradeSubscription,
    cancelSubscription,
    hasFeature,
    getUpgradeMessage
  }

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription(): SubscriptionContextType {
  const context = useContext(SubscriptionContext)
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }
  return context
}