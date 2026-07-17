import { PromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { z } from 'zod';
import { createLLM, AI_CONFIG, AVAILABLE_CATEGORIES, CategoryType } from './config/ai.config';
import { BaseService } from '../../shared/core';

/**
 * AI Service for Money Mind
 * Handles transaction categorization, debt strategy, budget recommendations
 */

/**
 * Helper function to clean LLM responses that might be wrapped in markdown code blocks
 */
function cleanJsonResponse(text: string): string {
  // Remove markdown code blocks if present
  let cleaned = text.trim();

  // Remove ```json and ``` if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '');
  }

  if (cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/\s*```$/, '');
  }

  return cleaned.trim();
}

// Schema for categorization output
const categorizationSchema = z.object({
  category: z.enum(AVAILABLE_CATEGORIES as unknown as [string, ...string[]]),
  confidence: z.number().min(0).max(1).describe('Confidence score between 0 and 1'),
  reasoning: z.string().describe('Brief explanation for the categorization'),
});

const batchCategorizationSchema = z.array(
  z.object({
    transactionId: z.string(),
    category: z.enum(AVAILABLE_CATEGORIES as unknown as [string, ...string[]]),
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
  })
);

export interface CategorizationResult {
  category: CategoryType;
  confidence: number;
  reasoning: string;
}

export interface BatchCategorizationResult {
  transactionId: string;
  category: CategoryType;
  confidence: number;
  reasoning: string;
}

export interface DebtStrategyResult {
  recommendedMethod: 'AVALANCHE' | 'SNOWBALL';
  priorityOrder: Array<{
    debtId: string;
    debtName: string;
    reason: string;
    order: number;
  }>;
  estimatedPayoffTimeline: string;
  potentialSavings: number;
  monthlyRecommendation: {
    minimumPayments: number;
    extraPaymentSuggestion: number;
    totalMonthly: number;
  };
  strategyExplanation: string;
  tips: string[];
}

export interface BudgetRecommendation {
  category: string;
  recommendedAmount: number;
  currentAmount: number;
  reasoning: string;
  adjustmentType: 'increase' | 'decrease' | 'maintain';
}

class AIService extends BaseService {
  constructor() {
    super('AIService');
  }

  /**
   * Categorize a single transaction based on narration
   */
  async categorizeTransaction(
    narration: string,
    amount: number,
    isCredit: boolean
  ): Promise<CategorizationResult> {
    return this.executeWithErrorHandling(async () => {
      const llm = createLLM(AI_CONFIG.TEMPERATURE_CATEGORIZATION);
      const parser = StructuredOutputParser.fromZodSchema(categorizationSchema);

      const prompt = PromptTemplate.fromTemplate(`
You are a financial transaction categorization expert for Money Mind, a personal finance app.

Task: Categorize the following transaction into one of the available categories.

Transaction Details:
- Narration: {narration}
- Amount: ₹{amount}
- Type: {transactionType}

Available Categories:
{categories}

Instructions:
1. Analyze the narration carefully
2. Consider the transaction amount and type (income/expense)
3. Choose the MOST appropriate category
4. Provide a confidence score (0.0 to 1.0)
5. Give a brief reasoning for your choice

{format_instructions}

Be precise and consistent. Common patterns:
- UPI payments to "PAYTM" or "PHONEPE" → likely Recharge or Shopping
- "SWIGGY", "ZOMATO" → Food
- "PETROL", "FUEL" → Fuel
- "FLIPKART", "AMAZON" → Shopping
- "LOAN", "EMI" → EMI
- Salary credits → Income
- Rent transfers → Rent
`);

      const input = await prompt.format({
        narration,
        amount: amount.toString(),
        transactionType: isCredit ? 'Credit (Income)' : 'Debit (Expense)',
        categories: AVAILABLE_CATEGORIES.join(', '),
        format_instructions: parser.getFormatInstructions(),
      });

      const response = await llm.invoke(input);
      const cleanedResponse = cleanJsonResponse(response.content as string);

      try {
        const result = await parser.parse(cleanedResponse);
        return result as CategorizationResult;
      } catch (parseError) {
        this.logger.error('Failed to parse AI response:', cleanedResponse);
        this.logger.error('Parse error:', parseError);

        // Try manual JSON parsing as fallback
        try {
          const jsonResult = JSON.parse(cleanedResponse);
          return jsonResult as CategorizationResult;
        } catch (jsonError) {
          this.logger.error('Manual JSON parse also failed:', jsonError);
          throw new Error(
            `Failed to parse AI response. Response: ${cleanedResponse.substring(0, 200)}...`
          );
        }
      }
    }, 'Failed to categorize transaction');
  }

  /**
   * Categorize multiple transactions in batch (more efficient)
   */
  async categorizeTransactionsBatch(
    transactions: Array<{
      id: string;
      narration: string;
      amount: number;
      isCredit: boolean;
    }>
  ): Promise<BatchCategorizationResult[]> {
    const llm = createLLM(AI_CONFIG.TEMPERATURE_CATEGORIZATION);
    const parser = StructuredOutputParser.fromZodSchema(batchCategorizationSchema);

    // Process in chunks of 10 to avoid token limits
    const chunkSize = 25;
    const results: BatchCategorizationResult[] = [];

    for (let i = 0; i < transactions.length; i += chunkSize) {
      const chunk = transactions.slice(i, i + chunkSize);

      const prompt = PromptTemplate.fromTemplate(`
You are a financial transaction categorization expert for Money Mind.

Task: Categorize the following {count} transactions. Return results in the exact order provided.

Transactions:
{transactions}

Available Categories:
{categories}

Instructions:
1. Categorize each transaction with high accuracy
2. Provide confidence scores (0.0 to 1.0)
3. Give brief reasoning for each
4. Maintain the exact transaction order in your response

{format_instructions}

Common patterns to recognize:
- UPI to PAYTM/PHONEPE → Recharge
- SWIGGY/ZOMATO → Food
- Petrol/Fuel stations → Fuel
- FLIPKART/AMAZON → Shopping
- EMI/LOAN payments → EMI
- Salary credits → Income
- Rent transfers → Rent
- Medical/Hospital → Medical
`);

      const transactionsText = chunk
        .map(
          (t, idx) =>
            `${idx + 1}. ID: ${t.id}\n   Narration: ${t.narration}\n   Amount: ₹${t.amount}\n   Type: ${t.isCredit ? 'Credit' : 'Debit'}`
        )
        .join('\n\n');

      const input = await prompt.format({
        count: chunk.length.toString(),
        transactions: transactionsText,
        categories: AVAILABLE_CATEGORIES.join(', '),
        format_instructions: parser.getFormatInstructions(),
      });

      const response = await Promise.race([
        llm.invoke(input),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('LLM request timed out after 20s')), 20000)
        ),
      ]);
      const cleanedResponse = cleanJsonResponse(response.content as string);

      console.info(
        `✅ LLM batch ${Math.floor(i / chunkSize) + 1} responded - ${chunk.length} transactions, response length: ${cleanedResponse.length} chars`
      );
      try {
        const chunkResults = (await parser.parse(cleanedResponse)) as BatchCategorizationResult[];
        results.push(...chunkResults);
      } catch (parseError) {
        console.error('Failed to parse AI response:', cleanedResponse);
        console.error('Parse error:', parseError);

        // Try manual JSON parsing as fallback
        try {
          const jsonResults = JSON.parse(cleanedResponse);
          if (Array.isArray(jsonResults)) {
            results.push(...jsonResults);
          } else {
            throw new Error('Response is not an array');
          }
        } catch (jsonError) {
          console.error('Manual JSON parse also failed:', jsonError);
          throw new Error(
            `Failed to parse AI response. Response: ${cleanedResponse.substring(0, 200)}...`
          );
        }
      }
    }

    return results;
  }

  /**
   * Analyze debts and provide debt-free strategy
   */
  async analyzeDebtStrategy(data: {
    monthlyIncome: number;
    debts: Array<{
      debtId?: string;
      debtName: string;
      totalAmount: number;
      remainingAmount: number;
      monthlyEMI: number;
      interestRate: number;
      emiType?: 'INTEREST_ONLY' | 'PRINCIPAL_AND_INTEREST';
      principalComponent?: number;
      interestComponent?: number;
    }>;
    monthlyExpenses: number;
  }): Promise<DebtStrategyResult> {
    const llm = createLLM(AI_CONFIG.TEMPERATURE_STRATEGY);

    const totalDebt = data.debts.reduce((sum, d) => sum + d.remainingAmount, 0);
    const totalEMI = data.debts.reduce((sum, d) => sum + d.monthlyEMI, 0);
    const availableForDebt = data.monthlyIncome - data.monthlyExpenses;

    const prompt = PromptTemplate.fromTemplate(`
You are a financial advisor helping someone become debt-free.

Financial Situation:
- Monthly Income: ₹{income}
- Total Debt: ₹{totalDebt}
- Total Monthly EMI: ₹{totalEMI}
- Monthly Expenses (excluding EMI): ₹{monthlyExpenses}
- Available for Debt Repayment: ₹{available}

Debts:
{debts}

IMPORTANT NOTES:
- Interest-Only loans: Principal remains constant, only interest is paid. These are high-priority to convert or pay off.
- Principal+Interest loans: Principal reduces each month with standard EMI payments.
- Prioritize converting interest-only loans to principal+interest or paying them off entirely.

Task:
1. Choose between AVALANCHE (pay high interest first) or SNOWBALL (pay smallest debt first) method
2. Give SPECIAL PRIORITY to interest-only loans as they don't reduce principal
3. Prioritize debts according to the chosen method
4. Calculate potential interest savings
5. Suggest extra monthly payment amount (if budget allows)
6. Estimate debt-free timeline (accounting for interest-only loans)
7. Provide actionable tips (especially for interest-only loans)

Provide a comprehensive strategy in JSON format:
{{
  "recommendedMethod": "AVALANCHE" or "SNOWBALL",
  "strategyExplanation": "Brief explanation of why this method was chosen, mention interest-only loans if any",
  "priorityOrder": [
    {{
      "debtName": "name",
      "order": 1,
      "reason": "why this debt should be paid first (mention if interest-only)"
    }}
  ],
  "monthlyRecommendation": {{
    "minimumPayments": {totalEMI},
    "extraPaymentSuggestion": <amount user can pay extra>,
    "totalMonthly": <minimum + extra>
  }},
  "potentialSavings": <estimated interest savings in rupees>,
  "estimatedPayoffTimeline": "X months" or "Y years Z months",
  "tips": ["tip1 (prioritize interest-only conversion)", "tip2", "tip3"]
}}

IMPORTANT: Return ONLY the JSON object, no other text.
`);

    const debtsText = data.debts
      .map((d, idx) => {
        const emiTypeText =
          d.emiType === 'INTEREST_ONLY' ? ' (Interest-Only)' : ' (Principal + Interest)';
        const breakdownText =
          d.principalComponent && d.interestComponent
            ? `\n   EMI Breakdown: Principal ₹${d.principalComponent.toFixed(0)}, Interest ₹${d.interestComponent.toFixed(0)}`
            : '';
        return `${idx + 1}. ${d.debtName}${emiTypeText}\n   Total: ₹${d.totalAmount}\n   Remaining: ₹${d.remainingAmount}\n   Monthly EMI: ₹${d.monthlyEMI}\n   Interest Rate: ${d.interestRate}%${breakdownText}`;
      })
      .join('\n\n');

    const input = await prompt.format({
      income: data.monthlyIncome.toString(),
      totalDebt: totalDebt.toString(),
      totalEMI: totalEMI.toString(),
      monthlyExpenses: data.monthlyExpenses.toString(),
      available: availableForDebt.toString(),
      debts: debtsText,
    });

    const response = await llm.invoke(input);
    const content = cleanJsonResponse(response.content as string);

    try {
      const parsed = JSON.parse(content);

      // Add debtId to priorityOrder if available
      const priorityOrderWithIds = parsed.priorityOrder.map(
        (item: { debtName: string; order: number; reason: string }) => {
          const matchingDebt = data.debts.find((d) => d.debtName === item.debtName);
          return {
            ...item,
            debtId: matchingDebt?.debtId || '',
          };
        }
      );

      return {
        ...parsed,
        priorityOrder: priorityOrderWithIds,
      } as DebtStrategyResult;
    } catch {
      this.logger.error('Failed to parse debt strategy response:', content);

      // Return fallback strategy
      const sortedByInterest = [...data.debts].sort((a, b) => b.interestRate - a.interestRate);
      const extraPayment = Math.max(0, availableForDebt - totalEMI);

      return {
        recommendedMethod: 'AVALANCHE',
        strategyExplanation:
          'Using debt avalanche method to minimize interest payments by targeting highest interest rate debts first.',
        priorityOrder: sortedByInterest.map((d, idx) => ({
          debtId: d.debtId || '',
          debtName: d.debtName,
          order: idx + 1,
          reason: `Interest rate: ${d.interestRate}% - Paying this first saves the most on interest`,
        })),
        monthlyRecommendation: {
          minimumPayments: totalEMI,
          extraPaymentSuggestion: Math.round(extraPayment * 0.5), // Suggest 50% of available surplus
          totalMonthly: Math.round(totalEMI + extraPayment * 0.5),
        },
        potentialSavings: Math.round(totalDebt * 0.1), // Rough estimate
        estimatedPayoffTimeline: `${Math.ceil(totalDebt / (totalEMI + extraPayment * 0.5))} months`,
        tips: [
          'Pay more than the minimum whenever possible to reduce interest',
          'Consider consolidating high-interest debts',
          'Build an emergency fund to avoid taking on new debt',
          'Review and reduce discretionary expenses to free up more for debt payment',
        ],
      };
    }
  }

  /**
   * Generate budget recommendations based on income and spending patterns
   */
  async generateBudgetRecommendations(data: {
    monthlyIncome: number;
    currentBudget: Array<{
      category: string;
      planned: number;
      actual: number;
    }>;
    spendingHistory: Array<{
      category: string;
      averageMonthly: number;
    }>;
  }): Promise<BudgetRecommendation[]> {
    const llm = createLLM(AI_CONFIG.TEMPERATURE_STRATEGY);

    const prompt = PromptTemplate.fromTemplate(`
You are a financial planning expert helping optimize a budget.

Monthly Income: ₹{income}

Current Budget:
{currentBudget}

Spending History (last 3-6 months average):
{spendingHistory}

Task:
1. Analyze current budget vs actual spending
2. Recommend adjustments based on 50/30/20 rule (50% needs, 30% wants, 20% savings)
3. Identify overspending categories
4. Suggest realistic budget amounts

Provide recommendations in JSON array format:
[
  {{
    "category": "category name",
    "recommendedAmount": amount,
    "currentAmount": current,
    "reasoning": "why this adjustment",
    "adjustmentType": "increase|decrease|maintain"
  }}
]
`);

    const currentBudgetText = data.currentBudget
      .map((b) => `- ${b.category}: Planned ₹${b.planned}, Actual ₹${b.actual}`)
      .join('\n');

    const spendingHistoryText = data.spendingHistory
      .map((s) => `- ${s.category}: Average ₹${s.averageMonthly}/month`)
      .join('\n');

    const input = await prompt.format({
      income: data.monthlyIncome.toString(),
      currentBudget: currentBudgetText,
      spendingHistory: spendingHistoryText,
    });

    const response = await llm.invoke(input);
    const content = response.content as string;

    // Extract JSON array
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return [];
  }

  /**
   * General chat for financial questions
   */
  async chat(message: string, context?: Record<string, unknown>): Promise<string> {
    const llm = createLLM(AI_CONFIG.TEMPERATURE_CHAT);

    const prompt = PromptTemplate.fromTemplate(`
You are a helpful financial assistant for Money Mind, a personal finance management app.

User Context:
{context}

User Question: {message}

Provide a helpful, actionable response. Be concise but thorough.
If you need more information, ask clarifying questions.
`);

    const input = await prompt.format({
      context: context ? JSON.stringify(context, null, 2) : 'No additional context provided',
      message,
    });

    const response = await llm.invoke(input);
    return response.content as string;
  }
}

export default new AIService();
