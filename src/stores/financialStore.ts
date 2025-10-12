import { defineStore } from 'pinia'

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

// const STORAGE_KEY = 'tt2_financial_v1'

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
      const gross = this.grossIncome!
      const taxes = this.calculateTaxes!
      
      const netHourly = state.hourlyRate - (taxes.totalTaxes / (state.weeklyHours * 52))
      const netDaily = gross.daily - (taxes.totalTaxes / (state.weeklyHours * 52)) * 8
      const netWeekly = gross.weekly - (taxes.totalTaxes / 52)
      const netMonthly = gross.monthly - (taxes.totalTaxes / 12)
      const netYearly = gross.yearly - taxes.totalTaxes
      
      return {
        hourly: Math.max(0, netHourly),
        daily: Math.max(0, netDaily),
        weekly: Math.max(0, netWeekly),
        monthly: Math.max(0, netMonthly),
        yearly: Math.max(0, netYearly)
      }
    },
    
    // Detailed financial breakdown
    financialBreakdown: (): FinancialCalculation => {
      const gross = this.grossIncome!
      const net = this.netIncome!
      const taxes = this.calculateTaxes!
      
      // Social contributions breakdown
      const socialContributions = {
        healthInsurance: gross.yearly * 0.146, // 14.6%
        pensionInsurance: gross.yearly * 0.186, // 18.6%
        unemploymentInsurance: gross.yearly * 0.024, // 2.4%
        careInsurance: gross.yearly * 0.031, // 3.1%
        totalSocial: gross.yearly * 0.20
      }
      
      return {
        grossHourly: gross.hourly,
        grossDaily: gross.daily,
        grossWeekly: gross.weekly,
        grossMonthly: gross.monthly,
        grossYearly: gross.yearly,
        netHourly: net.hourly,
        netDaily: net.daily,
        netWeekly: net.weekly,
        netMonthly: net.monthly,
        netYearly: net.yearly,
        taxes: {
          incomeTax: taxes.incomeTax,
          socialContributions: taxes.socialContributions,
          solidaritySurcharge: taxes.solidaritySurcharge,
          totalTaxes: taxes.totalTaxes
        },
        socialContributions
      }
    }
  },
  
  actions: {
    async load() {
      // Load from storage if needed
    },
    
    async persist() {
      // Save to storage if needed
    },
    
    updateSettings(settings: Partial<FinancialSettings>) {
      this.$patch(settings)
    }
  }
})