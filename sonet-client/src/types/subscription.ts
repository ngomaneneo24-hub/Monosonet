export type SubscriptionTier = 'free' | 'pro' | 'max' | 'ultra'

export interface SubscriptionFeature {
  id: string
  name: string
  description: string
  available: boolean
  tier: SubscriptionTier
  icon?: string
}

export interface SubscriptionTierInfo {
  id: SubscriptionTier
  name: string
  price: number
  billingPeriod: 'monthly' | 'yearly'
  description: string
  features: SubscriptionFeature[]
  fomoTriggers: string[]
  socialProof: string[]
  limitedAvailability?: string
  welcomeMessage: string
}

export interface UserSubscription {
  tier: SubscriptionTier
  startDate: string
  endDate: string
  autoRenew: boolean
  features: SubscriptionFeature[]
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, SubscriptionTierInfo> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    billingPeriod: 'monthly',
    description: 'Basic Sonet experience',
    features: [
      {
        id: 'basic_upload',
        name: 'Basic Media Uploads',
        description: '1080p images, 2-minute videos',
        available: true,
        tier: 'free'
      },
      {
        id: 'basic_analytics',
        name: 'Basic Analytics',
        description: 'Simple profile views and engagement',
        available: true,
        tier: 'free'
      },
      {
        id: 'standard_search',
        name: 'Standard Search',
        description: 'Regular search ranking',
        available: true,
        tier: 'free'
      }
    ],
    fomoTriggers: [
      'Upgrade to unlock your potential',
      'Join 500K+ creators on Pro',
      'Get verified faster with Pro'
    ],
    socialProof: [
      'Join millions of free users'
    ],
    welcomeMessage: 'Welcome to Sonet!'
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 4.99,
    billingPeriod: 'monthly',
    description: 'Creator Starter Pack',
    features: [
      {
        id: 'advanced_analytics',
        name: 'Advanced Analytics Dashboard',
        description: 'Profile views, note performance, follower growth, peak engagement times',
        available: true,
        tier: 'pro'
      },
      {
        id: 'premium_media',
        name: 'Premium Media Features',
        description: '10-minute videos, 4K images, custom thumbnails, GIF/sticker uploads',
        available: true,
        tier: 'pro'
      },
      {
        id: 'verification',
        name: 'Verification Blue Checkmark',
        description: 'Get verified and stand out',
        available: true,
        tier: 'pro'
      },
      {
        id: 'custom_reactions',
        name: 'Custom Reaction Emojis',
        description: '10 custom reaction slots',
        available: true,
        tier: 'pro'
      },
      {
        id: 'generic_feed',
        name: 'Generic Feed Toggle',
        description: 'Enhanced privacy controls',
        available: true,
        tier: 'pro'
      },
      {
        id: 'custom_app_icons',
        name: 'Custom App Icons',
        description: '20+ exclusive icon designs',
        available: true,
        tier: 'pro'
      }
    ],
    fomoTriggers: [
      'Level up to Max for business tools',
      'Get Ultra exclusive content previews',
      'Join the creator economy'
    ],
    socialProof: [
      'Join 500K+ creators on Pro',
      'Pro users report 200% more engagement'
    ],
    limitedAvailability: 'Pro tier: Join 500K+ creators',
    welcomeMessage: 'Welcome to the creator economy!'
  },
  max: {
    id: 'max',
    name: 'Max',
    price: 9.99,
    billingPeriod: 'monthly',
    description: 'Power User Paradise',
    features: [
      {
        id: 'golden_checkmark',
        name: 'Golden Checkmark',
        description: 'Elite verification status',
        available: true,
        tier: 'max'
      },
      {
        id: 'fast_verification',
        name: 'Profile Verification Fast-Track',
        description: 'Get verified in 24 hours',
        available: true,
        tier: 'max'
      },
      {
        id: 'exclusive_community',
        name: 'Exclusive Max Community',
        description: 'Access to Max-only community',
        available: true,
        tier: 'max'
      },
      {
        id: 'neo_qiss_access',
        name: 'Direct Line to Neo Qiss',
        description: 'Limited monthly Q&A with founder',
        available: true,
        tier: 'max'
      },
      {
        id: 'scheduled_notes',
        name: 'Schedule Notes',
        description: 'Schedule notes up to 30 days ahead',
        available: true,
        tier: 'max'
      },
      {
        id: 'multi_account',
        name: 'Multi-Account Management',
        description: 'Manage up to 3 accounts',
        available: true,
        tier: 'max'
      },
      {
        id: 'business_analytics',
        name: 'Business Growth Analytics',
        description: 'Advanced business insights',
        available: true,
        tier: 'max'
      },
      {
        id: 'promoted_credits',
        name: 'Promoted Note Credits',
        description: '$20/month value in promotion credits',
        available: true,
        tier: 'max'
      }
    ],
    fomoTriggers: [
      'Join the Ultra elite',
      'Get personal account manager',
      'Access Ultra member directory'
    ],
    socialProof: [
      'Max users report 300% more engagement',
      'Join 100K+ power users'
    ],
    limitedAvailability: 'Max tier: Limited to 100,000 members',
    welcomeMessage: "You're now in the top 1% of Sonet users!"
  },
  ultra: {
    id: 'ultra',
    name: 'Ultra',
    price: 99.99,
    billingPeriod: 'monthly',
    description: 'Digital VIP Lifestyle',
    features: [
      {
        id: 'platinum_checkmark',
        name: 'Platinum Checkmark',
        description: 'Rare elite verification status',
        available: true,
        tier: 'ultra'
      },
      {
        id: 'account_manager',
        name: 'Personal Account Manager',
        description: 'Dedicated account support',
        available: true,
        tier: 'ultra'
      },
      {
        id: 'neo_qiss_1on1',
        name: 'Monthly 1-on-1 with Neo Qiss',
        description: 'Direct founder access',
        available: true,
        tier: 'ultra'
      },
      {
        id: 'ultra_directory',
        name: 'Ultra Member Directory',
        description: 'Exclusive member network',
        available: true,
        tier: 'ultra'
      },
      {
        id: 'custom_communities',
        name: 'Custom Community Creation',
        description: 'Advanced community tools',
        available: true,
        tier: 'ultra'
      },
      {
        id: 'white_label',
        name: 'White-Label Sonet',
        description: 'Custom branding for organizations',
        available: true,
        tier: 'ultra'
      },
      {
        id: 'api_access',
        name: 'API Access',
        description: 'Personal project integration',
        available: true,
        tier: 'ultra'
      },
      {
        id: 'priority_servers',
        name: 'Priority Servers',
        description: 'Faster loading times',
        available: true,
        tier: 'ultra'
      },
      {
        id: 'revenue_sharing',
        name: 'Revenue Sharing',
        description: 'Earn from promoted content',
        available: true,
        tier: 'ultra'
      },
      {
        id: 'feature_voting',
        name: 'Feature Development Vote',
        description: 'Influence platform development',
        available: true,
        tier: 'ultra'
      }
    ],
    fomoTriggers: [
      'Join digital royalty',
      'Access exclusive creator content',
      'Shape the future of Sonet'
    ],
    socialProof: [
      'Ultra members include top creators',
      'Join the digital elite'
    ],
    limitedAvailability: 'Only 10,000 Ultra memberships available globally',
    welcomeMessage: 'Welcome to digital royalty!'
  }
}

export function getSubscriptionTier(tier: SubscriptionTier): SubscriptionTierInfo {
  return SUBSCRIPTION_TIERS[tier]
}

export function hasFeature(userTier: SubscriptionTier, requiredTier: SubscriptionTier): boolean {
  const tierOrder = ['free', 'pro', 'max', 'ultra']
  const userIndex = tierOrder.indexOf(userTier)
  const requiredIndex = tierOrder.indexOf(requiredTier)
  return userIndex >= requiredIndex
}

export function getUpgradeMessage(currentTier: SubscriptionTier): string {
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