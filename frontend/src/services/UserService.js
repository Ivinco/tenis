import api from "../api/api";


export default class UserService{
    static async getUser () {
        return api.get('/whoami')
    }

    static async editUser (payload) {
        return api.post( '/user/update', payload );
    }

    static async getUsers () {
        return api.get('/users')
    }


}