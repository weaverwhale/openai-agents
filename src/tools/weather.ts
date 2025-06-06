import { z } from 'zod';
import { tool } from '@openai/agents';
import { WeatherData } from './types';

// Weather API function using Visual Crossing
export const getWeather = async (lat: number, lon: number): Promise<WeatherData> => {
  const API_KEY = process.env.VISUAL_CROSSING_API_KEY;

  if (!API_KEY) {
    throw new Error('Visual Crossing API key not found');
  }

  try {
    // Visual Crossing API uses lat,lon format
    const location = `${lat},${lon}`;
    const response = await fetch(
      `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${location}?unitGroup=metric&include=current&key=${API_KEY}&contentType=json`
    );

    if (!response.ok) {
      throw new Error(`Weather API Error: ${response.status}`);
    }

    const data = await response.json();

    // Visual Crossing API response structure
    const currentConditions = data.currentConditions;

    return {
      location: data.resolvedAddress,
      temperature: Math.round(currentConditions.temp),
      description: currentConditions.conditions,
      icon: currentConditions.icon,
      humidity: currentConditions.humidity,
      windSpeed: currentConditions.windspeed,
      feelsLike: Math.round(currentConditions.feelslike),
    };
  } catch (error) {
    console.error('Weather API Error:', error);
    throw error;
  }
};

// Weather Tool
export const getWeatherTool = tool({
  name: 'get_weather',
  description: 'Get current weather information for a location using latitude and longitude coordinates',
  parameters: z.object({
    lat: z.number().describe('Latitude coordinate (-90 to 90)'),
    lon: z.number().describe('Longitude coordinate (-180 to 180)'),
  }),
  needsApproval: async (_ctx, { lat, lon }) => {
    // Require approval for potentially sensitive coordinates
    // You can customize this logic based on your needs
    return false; // No approval needed for weather data
  },
  execute: async ({ lat, lon }) => {
    try {
      // Validate coordinates
      if (isNaN(lat) || isNaN(lon)) {
        throw new Error('Invalid latitude or longitude coordinates');
      }
      
      if (lat < -90 || lat > 90) {
        throw new Error('Latitude must be between -90 and 90 degrees');
      }
      
      if (lon < -180 || lon > 180) {
        throw new Error('Longitude must be between -180 and 180 degrees');
      }

      const weather = await getWeather(lat, lon);
      
      return `
        Weather for ${weather.location}:
        🌡️ Temperature: ${weather.temperature}°C (feels like ${weather.feelsLike}°C)
        🌤️ Condition: ${weather.description}
        💧 Humidity: ${weather.humidity}%
        💨 Wind Speed: ${weather.windSpeed} km/h
        ☁️ Icon: ${weather.icon}
      `;
    } catch (error) {
      return `Error fetching weather data: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  },
}); 