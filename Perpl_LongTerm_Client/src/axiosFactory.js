import axios from 'axios';
// require('dotenv').config();

const instance = axios.create({
    // baseURL: "INSERT_YOUR_SERVER_URL_HERE",
    baseURL: "http://127.0.0.1:5000/"
});

export default instance;