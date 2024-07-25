import {
    DETAILED_ALERT,
    RECHECK_ALL_ALERTS,
    SET_TOTAL_ALERTS_NUMBER,
    SET_FOUND_ALERTS,
    SET_CRITICAL_ALERTS_NUMBER, SET_WARNING_ALERTS_NUMBER, SET_OTHER_ALERTS_NUMBER, SET_EMERGENCY_ALERTS_NUMBER
} from "../actions/ALERT_ACTIONS";
import {REMOVE_ALERTS} from "../actions/WEBSOCKET_ACTIONS";
import {type} from "@testing-library/user-event/dist/type";

const defaultdAlert = {
alert: {
    alert_id: '',
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
    totalAlertsNumber: 0,
    emergencyAlertsNumber: 0,
    criticalAlertsNumber: 0,
    warningAlertsNumber: 0,
    otherAlertsNumber: 0,
    foundAlerts: null,
    recheckAllAlerts: false,
}

export const alertReducer = (state = defaultdAlert, action) => {
    switch (action.type) {
        case DETAILED_ALERT:
            return{...state, alert: action.payload}
        case SET_TOTAL_ALERTS_NUMBER:
            return {...state, totalAlertsNumber: action.payload}
        case SET_EMERGENCY_ALERTS_NUMBER:
            return {...state, emergencyAlertsNumber: action.payload}
        case SET_CRITICAL_ALERTS_NUMBER:
            return {...state, criticalAlertsNumber: action.payload}
        case SET_WARNING_ALERTS_NUMBER:
            return {...state, warningAlertsNumber: action.payload}
        case SET_OTHER_ALERTS_NUMBER:
            return {...state, otherAlertsNumber: action.payload}
        case SET_FOUND_ALERTS:
            return {...state, foundAlerts: action.payload}
        case RECHECK_ALL_ALERTS:
            return {...state, recheckAllAlerts: action.payload}
        default:
            return state
    }
}

export const setDetailedAlert = (alert) => ({
    type: DETAILED_ALERT,
    payload: alert
})

export const setTotalAlertsNumber = (number) => ({
    type: SET_TOTAL_ALERTS_NUMBER,
    payload: number
})

export const setWarningAlertsNumber = (number) => ({
    type: SET_WARNING_ALERTS_NUMBER,
    payload: number
})

export const setEmergencyAlertsNumber = (number) => ({
    type: SET_EMERGENCY_ALERTS_NUMBER,
    payload: number
})

export const setCriticalAlertsNumber = (number) => ({
    type: SET_CRITICAL_ALERTS_NUMBER,
    payload: number
})

export const setOtherAlertsNumber = (number) => ({
    type: SET_OTHER_ALERTS_NUMBER,
    payload: number
})

export const setFoundAlerts = (alerts) => ({
    type: SET_FOUND_ALERTS,
    payload: alerts
})

export const recheckAllAlerts = (state) => ({
    type: RECHECK_ALL_ALERTS,
    payload: state
})
