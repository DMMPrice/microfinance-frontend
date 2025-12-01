export interface EMICalculation {
  monthlyEMI: number;
  totalInterest: number;
  totalPayable: number;
}

/**
 * Calculate EMI using simple interest methodology
 * Formula: EMI = (P + (P * R * T / 100)) / T
 * where P = Principal, R = Annual Interest Rate, T = Tenure in months
 */
export function calculateEMI(
  principal: number,
  annualInterestRate: number,
  tenureMonths: number
): EMICalculation {
  // Calculate total interest using simple interest
  const totalInterest = (principal * annualInterestRate * tenureMonths) / (100 * 12);
  
  // Total amount to be paid
  const totalPayable = principal + totalInterest;
  
  // Monthly EMI
  const monthlyEMI = totalPayable / tenureMonths;
  
  return {
    monthlyEMI: Math.round(monthlyEMI * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPayable: Math.round(totalPayable * 100) / 100,
  };
}

/**
 * Generate repayment schedule for a loan
 */
export function generateRepaymentSchedule(
  loanId: string,
  startDate: string,
  monthlyEMI: number,
  tenureMonths: number
): Array<{
  id: string;
  loanId: string;
  installmentNo: number;
  dueDate: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
}> {
  const schedule = [];
  const start = new Date(startDate);
  
  for (let i = 1; i <= tenureMonths; i++) {
    const dueDate = new Date(start);
    dueDate.setMonth(dueDate.getMonth() + i);
    
    schedule.push({
      id: `${loanId}-${i}`,
      loanId,
      installmentNo: i,
      dueDate: dueDate.toISOString().split('T')[0],
      amount: monthlyEMI,
      status: 'pending' as const,
    });
  }
  
  return schedule;
}
