import { PromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { z } from 'zod';
import { createLLM, AI_CONFIG, AVAILABLE_CATEGORIES, CategoryType } from '../config/ai.config';

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
  totalDebt: number;
  monthlyIncome: number;
  totalEMI: number;
  availableForDebt: number;
  strategy: string;
  recommendations: string[];
  payoffTimeline: string;
  priorityDebts: Array<{
    debtName: string;
    priority: number;
    reasoning: string;
  }>;
}

export interface BudgetRecommendation {
  category: string;
  recommendedAmount: number;
  currentAmount: number;
  reasoning: string;
  adjustmentType: 'increase' | 'decrease' | 'maintain';
}

class AIService {
  /**
   * Categorize a single transaction based on narration
   */
  async categorizeTransaction(
    narration: string,
    amount: number,
    isCredit: boolean
  ): Promise<CategorizationResult> {
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
      console.error('Failed to parse AI response:', cleanedResponse);
      console.error('Parse error:', parseError);

      // Try manual JSON parsing as fallback
      try {
        const jsonResult = JSON.parse(cleanedResponse);
        return jsonResult as CategorizationResult;
      } catch (jsonError) {
        console.error('Manual JSON parse also failed:', jsonError);
        throw new Error(
          `Failed to parse AI response. Response: ${cleanedResponse.substring(0, 200)}...`
        );
      }
    }
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
    const chunkSize = 10;
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

      const response = await llm.invoke(input);
      const cleanedResponse = cleanJsonResponse(response.content as string);

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
      debtName: string;
      totalAmount: number;
      remainingAmount: number;
      monthlyEMI: number;
      interestRate: number;
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

Task:
1. Prioritize debts (highest interest first, or snowball method)
2. Suggest a realistic debt-free strategy
3. Calculate approximate payoff timeline
4. Provide actionable recommendations

Focus on:
- Debt avalanche (high interest first) vs snowball (smallest first)
- Extra payment suggestions
- Budget optimization
- Emergency fund considerations

Provide a comprehensive strategy in JSON format:
{{
  "strategy": "Overall strategy summary",
  "recommendations": ["recommendation1", "recommendation2", ...],
  "payoffTimeline": "Estimated timeline to be debt-free",
  "priorityDebts": [
    {{
      "debtName": "name",
      "priority": 1,
      "reasoning": "why this debt should be prioritized"
    }}
  ]
}}
`);

    const debtsText = data.debts
      .map(
        (d, idx) =>
          `${idx + 1}. ${d.debtName}\n   Total: ₹${d.totalAmount}\n   Remaining: ₹${d.remainingAmount}\n   Monthly EMI: ₹${d.monthlyEMI}\n   Interest Rate: ${d.interestRate}%`
      )
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
    const content = response.content as string;

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        totalDebt,
        monthlyIncome: data.monthlyIncome,
        totalEMI,
        availableForDebt,
        ...parsed,
      };
    }

    // Fallback if no JSON found
    return {
      totalDebt,
      monthlyIncome: data.monthlyIncome,
      totalEMI,
      availableForDebt,
      strategy: content,
      recommendations: ['Review the detailed strategy above'],
      payoffTimeline: 'Calculate based on current EMI payments',
      priorityDebts: data.debts.map((d, idx) => ({
        debtName: d.debtName,
        priority: idx + 1,
        reasoning: `Interest rate: ${d.interestRate}%`,
      })),
    };
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
