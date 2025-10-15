import { defineStore } from 'pinia'
import { Preferences } from '@capacitor/preferences'

export interface FinancialSettings {
  hourlyRate: number
  socialClass: number
  weeklyHours: number
  taxClass: number
}

export interface FinancialCalculation {
  grossHourly: number
  grossDaily: number
  grossWeekly: number
  grossMonthly: number
  grossYearly: number
  
  netHourly: number
  netDaily: number
  netWeekly: number
  netMonthly: number
  netYearly: number
  
  taxes: {
    incomeTax: number
    socialContributions: number
    solidaritySurcharge: number
    totalTaxes: number
  }
  
  socialContributions: {
    healthInsurance: number
    pensionInsurance: number
    unemploymentInsurance: number
    careInsurance: number
    totalSocial: number
  }
}

const STORAGE_KEY = 'tt2_financial_v1'

export const useFinancialStore = defineStore('financial', {
  state: (): FinancialSettings => ({
    hourlyRate: 16.5,
    socialClass: 1,
    weeklyHours: 40,
    taxClass: 1,
  }),
  
  getters: {
    // Calculate gross income
    grossIncome: (state) => {
      const hourly = state.hourlyRate
      const daily = hourly * 8 // Assuming 8 hours per day
      const weekly = hourly * state.weeklyHours
      const monthly = weekly * 4.33 // Average weeks per month
      const yearly = weekly * 52
      
      return {
        hourly,
        daily,
        weekly,
        monthly,
        yearly
      }
    },
    
    // Calculate taxes for Germany/Bayern
    calculateTaxes: (state) => {
      const gross = state.hourlyRate * state.weeklyHours * 52
      
      // Income tax calculation (simplified for tax class 1)
      let incomeTax = 0
      if (gross > 10908) {
        if (gross <= 62810) {
          // Progressive tax rate
          const taxableIncome = gross - 10908
          incomeTax = taxableIncome * 0.14 + (taxableIncome - 10908) * 0.2397
        } else {
          // Higher tax bracket
          incomeTax = gross * 0.42
        }
      }
      
      // Social contributions (approximately 20% of gross)
      const socialContributions = gross * 0.20
      
      // Solidarity surcharge (0.825% of income tax)
      const solidaritySurcharge = incomeTax * 0.00825
      
      const totalTaxes = incomeTax + socialContributions + solidaritySurcharge
      
      return {
        incomeTax,
        socialContributions,
        solidaritySurcharge,
        totalTaxes
      }
    },
    
    // Calculate net income
    netIncome: (state) => {
      // Calculate gross income directly
      const hourly = state.hourlyRate
      const daily = hourly * 8
      const weekly = hourly * state.weeklyHours
      const monthly = weekly * 4.33
      const yearly = weekly * 52
      
      // Calculate taxes directly
      let incomeTax = 0
      if (yearly > 10908) {
        if (yearly <= 62810) {
          const taxableIncome = yearly - 10908
          incomeTax = taxableIncome * 0.14 + (taxableIncome - 10908) * 0.2397
        } else {
          incomeTax = yearly * 0.42
        }
      }
      
      const socialContributions = yearly * 0.20
      const solidaritySurcharge = incomeTax * 0.00825
      const totalTaxes = incomeTax + socialContributions + solidaritySurcharge
      
      const netHourly = hourly - (totalTaxes / (state.weeklyHours * 52))
      const netDaily = daily - (totalTaxes / (state.weeklyHours * 52)) * 8
      const netWeekly = weekly - (totalTaxes / 52)
      const netMonthly = monthly - (totalTaxes / 12)
      const netYearly = yearly - totalTaxes
      
      return {
        hourly: Math.max(0, netHourly),
        daily: Math.max(0, netDaily),
        weekly: Math.max(0, netWeekly),
        monthly: Math.max(0, netMonthly),
        yearly: Math.max(0, netYearly)
      }
    },
    
    // Detailed financial breakdown
    financialBreakdown: (state): FinancialCalculation => {
      // Calculate everything directly to avoid circular dependencies
      const hourly = state.hourlyRate
      const daily = hourly * 8
      const weekly = hourly * state.weeklyHours
      const monthly = weekly * 4.33
      const yearly = weekly * 52
      
      // Calculate taxes
      let incomeTax = 0
      if (yearly > 10908) {
        if (yearly <= 62810) {
          const taxableIncome = yearly - 10908
          incomeTax = taxableIncome * 0.14 + (taxableIncome - 10908) * 0.2397
        } else {
          incomeTax = yearly * 0.42
        }
      }
      
      const socialContributions = yearly * 0.20
      const solidaritySurcharge = incomeTax * 0.00825
      const totalTaxes = incomeTax + socialContributions + solidaritySurcharge
      
      // Calculate net
      const netHourly = hourly - (totalTaxes / (state.weeklyHours * 52))
      const netDaily = daily - (totalTaxes / (state.weeklyHours * 52)) * 8
      const netWeekly = weekly - (totalTaxes / 52)
      const netMonthly = monthly - (totalTaxes / 12)
      const netYearly = yearly - totalTaxes
      
      // Social contributions breakdown
      const socialContributionsBreakdown = {
        healthInsurance: yearly * 0.146, // 14.6%
        pensionInsurance: yearly * 0.186, // 18.6%
        unemploymentInsurance: yearly * 0.024, // 2.4%
        careInsurance: yearly * 0.031, // 3.1%
        totalSocial: yearly * 0.20
      }
      
      return {
        grossHourly: hourly,
        grossDaily: daily,
        grossWeekly: weekly,
        grossMonthly: monthly,
        grossYearly: yearly,
        netHourly: Math.max(0, netHourly),
        netDaily: Math.max(0, netDaily),
        netWeekly: Math.max(0, netWeekly),
        netMonthly: Math.max(0, netMonthly),
        netYearly: Math.max(0, netYearly),
        taxes: {
          incomeTax,
          socialContributions,
          solidaritySurcharge,
          totalTaxes
        },
        socialContributions: socialContributionsBreakdown
      }
    }
  },
  
  actions: {
    async load() {
      try {
        const { value } = await Preferences.get({ key: STORAGE_KEY })
        if (value) {
          const settings = JSON.parse(value)
          // Validate loaded settings
          if (settings.hourlyRate && settings.hourlyRate >= 0 && settings.hourlyRate <= 1000) {
            this.hourlyRate = settings.hourlyRate
          }
          if (settings.weeklyHours && settings.weeklyHours >= 1 && settings.weeklyHours <= 80) {
            this.weeklyHours = settings.weeklyHours
          }
          if (settings.taxClass && settings.taxClass >= 1 && settings.taxClass <= 6) {
            this.taxClass = settings.taxClass
          }
          if (settings.socialClass && settings.socialClass >= 1 && settings.socialClass <= 3) {
            this.socialClass = settings.socialClass
          }
        }
      } catch (error) {
        console.error('Error loading financial settings:', error instanceof Error ? error.message : 'Unknown error')
        // Reset to default values on error
        this.$patch({
          hourlyRate: 16.5,
          socialClass: 1,
          weeklyHours: 40,
          taxClass: 1
        })
      }
    },
    
    async persist() {
      try {
        const settings = {
          hourlyRate: this.hourlyRate,
          socialClass: this.socialClass,
          weeklyHours: this.weeklyHours,
          taxClass: this.taxClass
        }
        await Preferences.set({
          key: STORAGE_KEY,
          value: JSON.stringify(settings)
        })
      } catch (error) {
        console.error('Error saving financial settings:', error instanceof Error ? error.message : 'Unknown error')
        throw new Error('Failed to save financial settings')
      }
    },
    
    updateSettings(settings: Partial<FinancialSettings>) {
      // Validate settings before applying
      const validatedSettings: Partial<FinancialSettings> = {}
      
      if (settings.hourlyRate !== undefined) {
        validatedSettings.hourlyRate = Math.max(0, Math.min(1000, settings.hourlyRate))
      }
      if (settings.weeklyHours !== undefined) {
        validatedSettings.weeklyHours = Math.max(1, Math.min(80, settings.weeklyHours))
      }
      if (settings.taxClass !== undefined) {
        validatedSettings.taxClass = Math.max(1, Math.min(6, settings.taxClass))
      }
      if (settings.socialClass !== undefined) {
        validatedSettings.socialClass = Math.max(1, Math.min(3, settings.socialClass))
      }
      
      this.$patch(validatedSettings)
      void this.persist()
    }
  }
})