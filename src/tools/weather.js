import axios from 'axios';
import { getLogger } from '../utils/logger.js';

export const definitions = [
  {
    name: 'get_weather',
    description: 'Get current weather information for a city or location using wttr.in (no API key needed).',
    input_schema: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City name or location (e.g., "London", "Tokyo", "New York")' },
        units: { type: 'string', enum: ['metric', 'imperial'], description: 'Temperature units (default: metric)' },
      },
      required: ['location'],
    },
  },
  {
    name: 'get_forecast',
    description: 'Get a 3-day weather forecast for a location.',
    input_schema: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City name or location' },
      },
      required: ['location'],
    },
  },
];

export const handlers = {
  get_weather: async (params) => {
    const logger = getLogger();
    const { location, units = 'metric' } = params;
    const unitParam = units === 'imperial' ? 'u' : 'm';
    try {
      const res = await axios.get(`https://wttr.in/${encodeURIComponent(location)}?format=j1&${unitParam}`, { timeout: 10000 });
      const current = res.data.current_condition?.[0];
      if (!current) return { error: 'No weather data found for this location' };
      return {
        location,
        temperature: `${current.temp_C}°C / ${current.temp_F}°F`,
        feels_like: `${current.FeelsLikeC}°C / ${current.FeelsLikeF}°F`,
        condition: current.weatherDesc?.[0]?.value || 'Unknown',
        humidity: `${current.humidity}%`,
        wind: `${current.windspeedKmph} km/h ${current.winddir16Point}`,
        visibility: `${current.visibility} km`,
        uv_index: current.uvIndex,
        pressure: `${current.pressure} mb`,
      };
    } catch (err) {
      logger.error(`get_weather failed: ${err.message}`);
      return { error: `Failed to fetch weather: ${err.message}` };
    }
  },
  get_forecast: async (params) => {
    const logger = getLogger();
    try {
      const res = await axios.get(`https://wttr.in/${encodeURIComponent(params.location)}?format=j1&m`, { timeout: 10000 });
      const days = res.data.weather;
      if (!days?.length) return { error: 'No forecast data found' };
      return {
        location: params.location,
        forecast: days.map(d => ({
          date: d.date,
          max_temp: `${d.maxtempC}°C`,
          min_temp: `${d.mintempC}°C`,
          condition: d.hourly?.[4]?.weatherDesc?.[0]?.value || 'Unknown',
          rain_chance: `${d.hourly?.[4]?.chanceofrain || 0}%`,
          sunrise: d.astronomy?.[0]?.sunrise,
          sunset: d.astronomy?.[0]?.sunset,
        })),
      };
    } catch (err) {
      logger.error(`get_forecast failed: ${err.message}`);
      return { error: `Failed to fetch forecast: ${err.message}` };
    }
  },
};
