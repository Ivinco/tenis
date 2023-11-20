import api from "../api/api";


export default class AuthService{
    static async login (email, password){
        return  api.post('/auth', {"email": email, "password": password})
    }

    static async logout () {
        return api.post('/logout')
    }


}