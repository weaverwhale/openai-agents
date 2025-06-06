// Export all tools from their individual files
export { getWeatherTool, getWeather } from './weather';
export { searchTool, search } from './search';
export { calculatorTool } from './calculator';
export { fileOperationsTool } from './fileOperations';
export { timeTool } from './time';
export { systemInfoTool } from './systemInfo';

// Export types
export * from './types';

// Export all tools as an array for easy importing
import { getWeatherTool } from './weather';
import { searchTool } from './search';
import { calculatorTool } from './calculator';
import { fileOperationsTool } from './fileOperations';
import { timeTool } from './time';
import { systemInfoTool } from './systemInfo';

export const allTools = [
  getWeatherTool,
  searchTool,
  calculatorTool,
  fileOperationsTool,
  timeTool,
  systemInfoTool,
]; 