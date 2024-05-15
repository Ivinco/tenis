import {DETAILED_ALERT, SET_ALERTS_NUMBER, SET_FOUND_ALERTS} from "../actions/ALERT_ACTIONS";

const defaultdAlert = {
alert: {
    _id: '',
    project: '',
    host: '',
    fired: '',
    alertName: '',
    severity: '',
    msg: '',
    responsibleUser: '',
    comment: '',
    silenced: false,
    customField: {}
    },
    alertsNumber: 0,
    foundAlerts: null
}

export const alertReducer = (state = defaultdAlert, action) => {
    switch (action.type) {
        case DETAILED_ALERT:
            return{...state, alert: action.payload}
        case SET_ALERTS_NUMBER:
            return {...state, alertsNumber: action.payload}
        case SET_FOUND_ALERTS:
            return {...state, foundAlerts: action.payload}
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

export const setFoundAlerts = (alerts) => ({
    type: SET_FOUND_ALERTS,
    payload: alerts
})
