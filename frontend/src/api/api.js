import {PORT, URL} from "../utils/vars";
import axios from "axios";

const api = axios.create({
    withCredentials: true,
    baseURL: `${URL}:${PORT}`
})

api.interceptors.request.use ((config) => {
    config.headers.Authorization = `Barear ${localStorage.getItem('token')}`
    return config
})


export default api;