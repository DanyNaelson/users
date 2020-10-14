const axios = require('axios');
// TODO: Review axios configuration
module.exports = (baseURL) => {
    return axios.create({
        baseURL: baseURL,
    });
}