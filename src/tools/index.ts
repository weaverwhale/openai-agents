// Export all tools from their individual files
export { getWeatherTool, getWeather } from './weather';
export { searchTool, search } from './search';
export { calculatorTool } from './calculator';
export { fileOperationsTool } from './fileOperations';
export { timeTool } from './time';
export { systemInfoTool } from './systemInfo';
export { imageGenerationTool, generateImageFunction } from './imageGeneration';
export { mobyTool, queryMoby } from './moby';
export { urbanDictionaryTool, lookupUrbanDictionary } from './urbanDictionary';
export { wikipediaTool, searchWikipedia } from './wikipedia';
export { forecastTool, generateForecast } from './forecast';
export { weeklyReportTool, createWeeklyReport } from './weeklyReport';

// Export types
export * from './types';

// Export all tools as an array for easy importing
import { getWeatherTool } from './weather';
import { searchTool } from './search';
import { calculatorTool } from './calculator';
import { fileOperationsTool } from './fileOperations';
import { timeTool } from './time';
import { systemInfoTool } from './systemInfo';
import { imageGenerationTool } from './imageGeneration';
import { mobyTool } from './moby';
import { urbanDictionaryTool } from './urbanDictionary';
import { wikipediaTool } from './wikipedia';
import { forecastTool } from './forecast';
import { weeklyReportTool } from './weeklyReport';

export const allTools = [
  getWeatherTool,
  searchTool,
  calculatorTool,
  fileOperationsTool,
  timeTool,
  systemInfoTool,
  imageGenerationTool,
  mobyTool,
  urbanDictionaryTool,
  wikipediaTool,
  forecastTool,
  weeklyReportTool,
]; 