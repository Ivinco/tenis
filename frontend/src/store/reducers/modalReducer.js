import {ALERT_DETAILS, CLOSE_MODAL, ERROR_MESSAGE, LOGIN_MODAL, PROFILE_MODAL} from "../actions/MODAL_ACTIONS";

const modalState = {
    isOpened: false,
    content: "",
    customMessage: ""
}

export const modalReducer = (state = modalState, action) => {
    switch (action.type) {
        case CLOSE_MODAL:
            return {...state, isOpened: false, content: ""}
        case LOGIN_MODAL:
            return {...state, isOpened: true, content: LOGIN_MODAL}
        case PROFILE_MODAL:
            return {...state, isOpened: true, content: PROFILE_MODAL}
        case ERROR_MESSAGE:
            return {...state,isOpened: true, content: ERROR_MESSAGE, customMessage: action.payload}
        case ALERT_DETAILS:
            return {...state, isOpened: true, content: ALERT_DETAILS}
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

export const switchErrorMessageModal = (message) => ({
    type: ERROR_MESSAGE,
    payload: message
})

export const switchAlertDetailsModal = () => ({
    type: ALERT_DETAILS
})
