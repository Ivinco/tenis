import api from "../api/api";


export default class UserService{
    static async getUser () {
        return api.get('/whoami')
    }

    static async ackAlerts (alerts) {
        return api.post ('/in', {"update": alerts})
    }


}