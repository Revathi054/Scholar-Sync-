const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_MATCH_URL || 'http://localhost:8001';

const getMatchesForUser = async (userId, top_k = 10, token) => {
  try {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const resp = await axios.post(`${ML_SERVICE_URL}/match`, { userId, top_k }, { headers });
    return resp.data;
  } catch (err) {
    console.error('Match service error', err?.response?.data || err.message);
    throw err;
  }
};

module.exports = { getMatchesForUser };
