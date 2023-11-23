import {ALERT_DETAILS} from "../actions/MODAL_ACTIONS";
import {DETAILED_ALERT, SET_ALERTS_NUMBER} from "../actions/ALERT_ACTIONS";

const defaultdAlert = {
alert: {
    id: '',
    project: '',
    host: '',
    fired: '',
    alertName: '',
    severity: '',
    msg: '',
    responsibleUser: '',
    customField: {}
    },
    alertsNumber: 0
}

export const alertReducer = (state = defaultdAlert, action) => {
    switch (action.type) {
        case DETAILED_ALERT:
            return{...state, alert: action.payload}
        case SET_ALERTS_NUMBER:
            return {...state, alertsNumber: action.payload}
        default:
            return state
    }
}

export const setDetailedAlert = (alert) => ({
    type: DETAILED_ALERT,
    payload: alert
})

export const setAlertsNumber = (number) => ({
    type: SET_ALERTS_NUMBER,
    payload: number
})
