import {BACKEND_SERVER, PORT} from "../utils/vars";
import axios from "axios";

const api = axios.create({
    withCredentials: true,
    baseURL: BACKEND_SERVER
})

api.interceptors.request.use ((config) => {
    config.headers.Authorization = `Bearear ${localStorage.getItem('token')}`
    return config
})

api.interceptors.response.use((config) => {
    return config
}, async (error) => {
    const request = error.config
    if(error.response.status === 401 && error.config && !error.config._Retry){
        request._Retry = true
        try {
            const refresh = await axios.get(`${BACKEND_SERVER}/refresh`, {withCredentials: true})
            localStorage.setItem('token', refresh.data.access_token)
            return api.request(request)
        } catch (e) {
            console.log(e)
        }

    }
    throw error
    }
)

export default api;