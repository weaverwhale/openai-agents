// Shared types for tools

// Search interfaces
export interface SearchSource {
  title: string;
  snippet: string;
  url: string;
}

export interface SearchResponse {
  answer: string;
  sources: SearchSource[];
}

// Weather data interface
export interface WeatherData {
  location: string;
  temperature: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  feelsLike: number;
}
