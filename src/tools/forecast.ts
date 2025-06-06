import { z } from 'zod';
import { tool } from '@openai/agents';

// Define the parameter types to match the zod schema
type ForecastParams = {
  data: number[];
  periods?: number;
  interval?: 'days' | 'weeks' | 'months';
};

// Simple linear regression implementation
function linearRegression(data: number[]): { slope: number; intercept: number; r2: number } {
  const n = data.length;
  const x = Array.from({ length: n }, (_, i) => i + 1);
  const y = data;
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);
  const sumYY = y.reduce((acc, yi) => acc + yi * yi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Calculate R²
  const yMean = sumY / n;
  const totalSumSquares = y.reduce((acc, yi) => acc + Math.pow(yi - yMean, 2), 0);
  const residualSumSquares = y.reduce((acc, yi, i) => {
    const predicted = slope * (i + 1) + intercept;
    return acc + Math.pow(yi - predicted, 2);
  }, 0);
  
  const r2 = totalSumSquares !== 0 ? 1 - (residualSumSquares / totalSumSquares) : 0;
  
  return { slope, intercept, r2 };
}

// Moving average forecast
function movingAveragePredict(data: number[], periods: number): number[] {
  const windowSize = Math.min(3, data.length);
  const lastValues = data.slice(-windowSize);
  const average = lastValues.reduce((a, b) => a + b, 0) / lastValues.length;
  
  return Array(periods).fill(average);
}

// Exponential smoothing forecast
function exponentialSmoothing(data: number[], periods: number, alpha: number = 0.3): number[] {
  if (data.length === 0) return [];
  
  let smoothed = data[0];
  for (let i = 1; i < data.length; i++) {
    smoothed = alpha * data[i] + (1 - alpha) * smoothed;
  }
  
  return Array(periods).fill(Number(smoothed.toFixed(2)));
}

// Forecast function
export const generateForecast = async (data: number[], periods: number = 5, interval: string = 'days'): Promise<{ forecast: string } | { error: string }> => {
  if (!data || data.length === 0) {
    return { error: 'Data array is required and cannot be empty' };
  }

  if (data.length < 2) {
    return { error: 'At least 2 data points are required for forecasting' };
  }

  try {
    console.log('Processing forecast:', {
      dataLength: data.length,
      periods,
      interval,
    });

    // Validate data
    if (data.some((val) => !Number.isFinite(val))) {
      throw new Error('Invalid data points detected - all values must be valid numbers');
    }

    // Calculate different forecasting methods
    const linearModel = linearRegression(data);
    const movingAvgForecast = movingAveragePredict(data, periods);
    const expSmoothingForecast = exponentialSmoothing(data, periods);
    
    // Linear regression forecast
    const linearForecast = Array.from({ length: periods }, (_, i) => {
      const x = data.length + i + 1;
      const predicted = linearModel.slope * x + linearModel.intercept;
      return Number(predicted.toFixed(2));
    });

    // Calculate standard error for confidence intervals
    const residuals = data.map((y, i) => {
      const predicted = linearModel.slope * (i + 1) + linearModel.intercept;
      return y - predicted;
    });
    
    const standardError = Math.sqrt(
      residuals.reduce((a, b) => a + b * b, 0) / Math.max(data.length - 2, 1)
    );
    const confidenceInterval = standardError * 1.96; // 95% confidence interval

    // Choose the best forecast method based on R²
    let bestForecast = linearForecast;
    let bestMethod = 'Linear Regression';
    let accuracy = linearModel.r2;

    // Format results
    let result = `📊 **Forecast Analysis** (${data.length} data points)\n\n`;
    
    result += `🔮 **${bestMethod} Forecast for next ${periods} ${interval}:**\n`;
    result += `   ${bestForecast.join(', ')}\n\n`;
    
    result += `📈 **Alternative Methods:**\n`;
    result += `   • Moving Average: ${movingAvgForecast.join(', ')}\n`;
    result += `   • Exponential Smoothing: ${expSmoothingForecast.join(', ')}\n\n`;
    
    result += `📊 **Statistical Information:**\n`;
    result += `   • Model Accuracy (R²): ${accuracy.toFixed(3)}\n`;
    result += `   • Trend: ${linearModel.slope > 0.1 ? 'Increasing' : linearModel.slope < -0.1 ? 'Decreasing' : 'Stable'}\n`;
    result += `   • Slope: ${linearModel.slope.toFixed(4)} per ${interval.slice(0, -1)}\n\n`;
    
    if (confidenceInterval > 0) {
      const lowerBounds = bestForecast.map(val => Number((val - confidenceInterval).toFixed(2)));
      const upperBounds = bestForecast.map(val => Number((val + confidenceInterval).toFixed(2)));
      
      result += `🎯 **95% Confidence Intervals:**\n`;
      result += `   • Lower bounds: ${lowerBounds.join(', ')}\n`;
      result += `   • Upper bounds: ${upperBounds.join(', ')}\n\n`;
    }
    
    result += `⚠️ *Forecasts are estimates based on historical data and should be used as guidance only*`;

    return { forecast: result };
  } catch (error) {
    console.error('Forecasting error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { error: `Could not generate forecast: ${errorMessage}` };
  }
};

// Forecast Tool
export const forecastTool = tool({
  name: 'forecast',
  description: 'Generate forecasts and predictions based on time series data using statistical analysis. Useful for predicting trends, sales forecasting, and data analysis.',
  parameters: z.object({
    data: z
      .array(z.number())
      .describe('Array of numerical time series data points (minimum 2 values)'),
    periods: z
      .number()
      .min(1)
      .max(12)
      .default(5)
      .describe('Number of periods to forecast (1-12)'),
    interval: z
      .enum(['days', 'weeks', 'months'])
      .default('days')
      .describe('Time interval for the forecast periods'),
  }),
  needsApproval: async (_ctx, { data, periods }) => {
    // Require approval for large datasets or long-term forecasts
    const isLargeDataset = data.length > 100;
    const isLongTermForecast = periods > 6;
    
    return isLargeDataset || isLongTermForecast;
  },
  execute: async ({ data, periods = 5, interval = 'days' }) => {
    try {
      if (!data || data.length === 0) {
        throw new Error('Data array cannot be empty');
      }

      if (periods < 1 || periods > 12) {
        throw new Error('Periods must be between 1 and 12');
      }

      const result = await generateForecast(data, periods, interval);
      
      // Check if there was an error
      if ('error' in result) {
        throw new Error(result.error);
      }
      
      return result.forecast;
    } catch (error) {
      return `Error generating forecast: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  },
}); 