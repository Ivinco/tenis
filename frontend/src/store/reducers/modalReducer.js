import {CLOSE_MODAL, LOGIN_MODAL, PROFILE_MODAL} from "../actions/MODAL_ACTIONS";

const modalState = {
    isOpened: false,
    content: ""
}

export const modalReducer = (state = modalState, action) => {
    switch (action.type) {
        case CLOSE_MODAL:
            return {...state, isOpened: false, content: ""}
        case LOGIN_MODAL:
            return {...state, content: "LOGIN", isOpened: true}
        case PROFILE_MODAL:
            return {...state, content: "PROFILE", isOpened: true}
        default:
            return state
    }
}

export const closeModal = () => ({
    type: CLOSE_MODAL
})

export const switchLoginModal = () => ({
    type: LOGIN_MODAL
})

export const switchProfileModal = () => ({
    type: PROFILE_MODAL
})
