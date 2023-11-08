import {LOGIN, LOGOUT} from "../actions/AUTH_ACTIONS";


const defaultAuth =  {
    isLogged: false,
    userId: null
}

export const authReducer = (state = defaultAuth, action) => {
    switch (action.type) {
        case LOGIN:
            return {...state, isLogged: true, userId: action.payload}
        case LOGOUT:
            return {...state, isLogged: false, userId: null}
        default:
            return state
    }
}


export const loginAction = (id) => ({
    type: LOGIN,
    payload: id
})

export const logoutAction = () => ({
    type: LOGOUT
})