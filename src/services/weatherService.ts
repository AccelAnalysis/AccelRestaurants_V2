
interface WeatherData {
  temp: number;
  condition: string;
  high: number;
  low: number;
  locationName: string;
}

// Simple in-memory cache
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
const cache = new Map<string, { data: WeatherData; timestamp: number }>();

// WMO Weather interpretation codes (WW)
const getWeatherCondition = (code: number): string => {
  if (code === 0) return 'Clear Sky';
  if (code === 1) return 'Mainly Clear';
  if (code === 2) return 'Partly Cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Foggy';
  if (code >= 51 && code <= 55) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Unknown';
};

export const WeatherService = {
  getWeather: async (location: string): Promise<WeatherData | null> => {
    // Normalizing location for cache key
    const cacheKey = location.toLowerCase().trim();
    
    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      // 1. Geocoding (Open-Meteo Geocoding API - Free, no key required)
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`);
      const geoData = await geoRes.json();

      if (!geoData.results || geoData.results.length === 0) {
        console.warn(`WeatherService: Location not found - ${location}`);
        return null;
      }

      const { latitude, longitude, name, admin1 } = geoData.results[0];
      const locationName = admin1 ? `${name}, ${admin1}` : name;

      // 2. Weather (Open-Meteo Forecast API - Free, non-commercial use)
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto`
      );
      const weatherData = await weatherRes.json();

      if (!weatherData.current || !weatherData.daily) {
        return null;
      }

      const result: WeatherData = {
        temp: Math.round(weatherData.current.temperature_2m),
        condition: getWeatherCondition(weatherData.current.weather_code),
        high: Math.round(weatherData.daily.temperature_2m_max[0]),
        low: Math.round(weatherData.daily.temperature_2m_min[0]),
        locationName: locationName
      };

      // Update cache
      cache.set(cacheKey, { data: result, timestamp: Date.now() });

      return result;
    } catch (error) {
      console.error('WeatherService Error:', error);
      return null;
    }
  }
};
