import {CLOSE_MODAL, LOGIN_MODAL, OPEN_MODAL} from "../actions/MODAL_ACTIONS";

const modalState = {
    isOpened: true,
    content: "LOGIN"
}

export const modalReducer = (state = modalState, action) => {
    switch (action.type) {
        case OPEN_MODAL:
            return {...state, isOpened: true}
        case CLOSE_MODAL:
            return {...state, isOpened: false}
        case LOGIN_MODAL:
            return {...state, content: "LOGIN"}
        default:
            return state
    }
}

export const openModal = () => ({
    type: OPEN_MODAL
})

export const closeModal = () => ({
    type: CLOSE_MODAL
})

export const switchLoginModal = () => ({
    type: LOGIN_MODAL
})