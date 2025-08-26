import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: '/api',
  withCredentials: true, // This is important for sending cookies
});

export default axiosInstance;
