import {LOGIN, LOGOUT} from "../actions/AUTH_ACTIONS";


const defaultAuth =  {
    isLogged: false,
    user : {
        userId: null,
        userName: null,
        userImage: null,
        userEmail: null,
        commentReplaceRules:{}
    }

}

export const authReducer = (state = defaultAuth, action) => {
    switch (action.type) {
        case LOGIN:
            return {...state, isLogged: true, user: action.payload}
        case LOGOUT:
            return {...state, isLogged: false, user: {}}
        default:
            return state
    }
}


export const loginAction = (user) => ({
    type: LOGIN,
    payload: user
})

export const logoutAction = () => ({
    type: LOGOUT
})