import {
    ALERT_DETAILS, CLEAR_MODAL,
    CLOSE_MODAL,
    ERROR_MESSAGE,
    LOGIN_MODAL, OPEN_MODAL,
    PROFILE_MODAL,
    SILENCE_MODAL
} from "../actions/MODAL_ACTIONS";

const modalState = {
    isOpened: false,
    content: "",
    customMessage: ""
}

export const modalReducer = (state = modalState, action) => {
    switch (action.type) {
        case CLOSE_MODAL:
            return {...state, isOpened: false, content: ""}
        case ERROR_MESSAGE:
            return {...state, customMessage: action.payload}
        case OPEN_MODAL:
            return {...state, isOpened: true}
        default:
            return state
    }
}

export const closeModal = () => ({
    type: CLOSE_MODAL
})

export const setModalError = (message) => ({
    type: ERROR_MESSAGE,
    payload: message
})


export const openModal = () => ({
    type: OPEN_MODAL
})
