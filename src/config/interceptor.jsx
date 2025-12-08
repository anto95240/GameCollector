import axios from "axios";

axios.interceptors.request.use(
    (config) => {
        const token = sessionStorage.getItem("loginToken")
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

axios.interceptors.response.use(
    (response) => {
        if (response.status === 200) {
        }
        return response
    },
    (error) => {
        console.log("response plz", error)
        if (error.response.status === 401) {
            console.log("Unauthorized")
            sessionStorage.removeItem("loginToken")
            window.location.href = "/"
        }
        return Promise.reject(error)
    }
)