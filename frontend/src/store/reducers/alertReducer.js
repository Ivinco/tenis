import {ALERT_DETAILS} from "../actions/MODAL_ACTIONS";
import {DETAILED_ALERT} from "../actions/ALERT_ACTIONS";

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
    }
}

export const alertReducer = (state = defaultdAlert, action) => {
    switch (action.type) {
        case DETAILED_ALERT:
            return{...state, alert: action.payload}
        default:
            return state
    }
}

export const setDetailedAlert = (alert) => ({
    type: DETAILED_ALERT,
    payload: alert
})
