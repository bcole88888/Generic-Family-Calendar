const express = require('express');
const router = express.Router();
const axios = require('axios');

// Franklin, TN coordinates
const FRANKLIN_TN = {
    latitude: 35.9251,
    longitude: -86.8689,
    location: 'Franklin, TN'
};

// Weather code to description mapping for Open-Meteo
const WEATHER_CODES = {
    0: { description: 'Clear sky', icon: 'fas fa-sun' },
    1: { description: 'Mainly clear', icon: 'fas fa-sun' },
    2: { description: 'Partly cloudy', icon: 'fas fa-cloud-sun' },
    3: { description: 'Overcast', icon: 'fas fa-cloud' },
    45: { description: 'Fog', icon: 'fas fa-smog' },
    48: { description: 'Depositing rime fog', icon: 'fas fa-smog' },
    51: { description: 'Light drizzle', icon: 'fas fa-cloud-drizzle' },
    53: { description: 'Moderate drizzle', icon: 'fas fa-cloud-rain' },
    55: { description: 'Dense drizzle', icon: 'fas fa-cloud-rain' },
    56: { description: 'Light freezing drizzle', icon: 'fas fa-snowflake' },
    57: { description: 'Dense freezing drizzle', icon: 'fas fa-snowflake' },
    61: { description: 'Slight rain', icon: 'fas fa-cloud-rain' },
    63: { description: 'Moderate rain', icon: 'fas fa-cloud-rain' },
    65: { description: 'Heavy rain', icon: 'fas fa-cloud-showers-heavy' },
    66: { description: 'Light freezing rain', icon: 'fas fa-snowflake' },
    67: { description: 'Heavy freezing rain', icon: 'fas fa-snowflake' },
    71: { description: 'Slight snow fall', icon: 'fas fa-snowflake' },
    73: { description: 'Moderate snow fall', icon: 'fas fa-snowflake' },
    75: { description: 'Heavy snow fall', icon: 'fas fa-snowflake' },
    77: { description: 'Snow grains', icon: 'fas fa-snowflake' },
    80: { description: 'Slight rain showers', icon: 'fas fa-cloud-rain' },
    81: { description: 'Moderate rain showers', icon: 'fas fa-cloud-rain' },
    82: { description: 'Violent rain showers', icon: 'fas fa-cloud-showers-heavy' },
    85: { description: 'Slight snow showers', icon: 'fas fa-snowflake' },
    86: { description: 'Heavy snow showers', icon: 'fas fa-snowflake' },
    95: { description: 'Thunderstorm', icon: 'fas fa-bolt' },
    96: { description: 'Thunderstorm with slight hail', icon: 'fas fa-bolt' },
    99: { description: 'Thunderstorm with heavy hail', icon: 'fas fa-bolt' }
};

// Get weather description and icon from code
function getWeatherInfo(code) {
    return WEATHER_CODES[code] || { description: 'Unknown', icon: 'fas fa-question' };
}

// Convert Celsius to Fahrenheit
function celsiusToFahrenheit(celsius) {
    return Math.round((celsius * 9/5) + 32);
}

// Fetch weather data from Open-Meteo API
async function fetchWeatherData() {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${FRANKLIN_TN.latitude}&longitude=${FRANKLIN_TN.longitude}&current=temperature_2m,relative_humidity_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=America/Chicago&forecast_days=16`;

        const response = await axios.get(url, {
            timeout: 10000, // 10 second timeout
        });

        const data = response.data;

        // Current weather
        const current = data.current;
        const currentWeatherInfo = getWeatherInfo(current.weather_code);

        // Today's and tomorrow's forecast
        const daily = data.daily;
        const todayWeatherInfo = getWeatherInfo(daily.weather_code[0]);
        const tomorrowWeatherInfo = getWeatherInfo(daily.weather_code[1]);

        return {
            location: FRANKLIN_TN.location,
            current: {
                temperature: celsiusToFahrenheit(current.temperature_2m),
                humidity: current.relative_humidity_2m,
                description: currentWeatherInfo.description,
                icon: currentWeatherInfo.icon,
                time: new Date(current.time).toISOString()
            },
            today: {
                high: celsiusToFahrenheit(daily.temperature_2m_max[0]),
                low: celsiusToFahrenheit(daily.temperature_2m_min[0]),
                description: todayWeatherInfo.description,
                icon: todayWeatherInfo.icon
            },
            tomorrow: {
                high: celsiusToFahrenheit(daily.temperature_2m_max[1]),
                low: celsiusToFahrenheit(daily.temperature_2m_min[1]),
                description: tomorrowWeatherInfo.description,
                icon: tomorrowWeatherInfo.icon
            },
            lastUpdated: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error fetching weather data:', error.message);
        throw error;
    }
}

// API endpoint to get current weather and today's forecast
router.get('/api/current', async (req, res) => {
    try {
        const weatherData = await fetchWeatherData();
        res.json(weatherData);
    } catch (error) {
        console.error('Weather API error:', error);
        res.status(500).json({
            error: 'Failed to fetch weather data',
            message: error.message
        });
    }
});

// API endpoint to get 16-day daily forecast keyed by date
router.get('/api/forecast', async (req, res) => {
    try {
        // past_days covers the earlier days of the current week (e.g. Sun-Fri when today is Saturday),
        // which the forecast API otherwise omits since it only looks forward from today.
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${FRANKLIN_TN.latitude}&longitude=${FRANKLIN_TN.longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=America/Chicago&forecast_days=16&past_days=7`;

        const response = await axios.get(url, { timeout: 10000 });
        const daily = response.data.daily;

        const forecasts = {};
        for (let i = 0; i < daily.time.length; i++) {
            const weatherInfo = getWeatherInfo(daily.weather_code[i]);
            forecasts[daily.time[i]] = {
                high: celsiusToFahrenheit(daily.temperature_2m_max[i]),
                low: celsiusToFahrenheit(daily.temperature_2m_min[i]),
                icon: weatherInfo.icon,
                weatherCode: daily.weather_code[i]
            };
        }

        res.json({ forecasts, location: FRANKLIN_TN.location, lastUpdated: new Date().toISOString() });
    } catch (error) {
        console.error('Forecast API error:', error.message);
        res.status(500).json({ error: 'Failed to fetch forecast data', message: error.message });
    }
});

// API endpoint to get the next 6 hours of forecast starting at the current hour
router.get('/api/hourly', async (req, res) => {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${FRANKLIN_TN.latitude}&longitude=${FRANKLIN_TN.longitude}&hourly=temperature_2m,weather_code,precipitation_probability&temperature_unit=fahrenheit&timeformat=unixtime&timezone=America/Chicago&forecast_days=2`;

        const response = await axios.get(url, { timeout: 10000 });
        const hourly = response.data.hourly;

        // Find the hour block that contains "now" (times are unix seconds, top of each hour)
        const nowSec = Math.floor(Date.now() / 1000);
        let startIdx = hourly.time.findIndex(t => t > nowSec);
        startIdx = startIdx <= 0 ? 0 : startIdx - 1;

        const hours = [];
        for (let i = startIdx; i < startIdx + 6 && i < hourly.time.length; i++) {
            const weatherInfo = getWeatherInfo(hourly.weather_code[i]);
            const label = i === startIdx
                ? 'Now'
                : new Intl.DateTimeFormat('en-US', {
                    timeZone: 'America/Chicago',
                    hour: 'numeric',
                    hour12: true
                }).format(new Date(hourly.time[i] * 1000));

            const precip = hourly.precipitation_probability ? hourly.precipitation_probability[i] : null;

            hours.push({
                label,
                temperature: Math.round(hourly.temperature_2m[i]),
                precipProbability: precip == null ? 0 : Math.round(precip),
                icon: weatherInfo.icon,
                description: weatherInfo.description,
                weatherCode: hourly.weather_code[i]
            });
        }

        res.json({ hours, location: FRANKLIN_TN.location, lastUpdated: new Date().toISOString() });
    } catch (error) {
        console.error('Hourly forecast API error:', error.message);
        res.status(500).json({ error: 'Failed to fetch hourly forecast', message: error.message });
    }
});

// Health check endpoint
router.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'weather',
        location: FRANKLIN_TN.location
    });
});

module.exports = router;