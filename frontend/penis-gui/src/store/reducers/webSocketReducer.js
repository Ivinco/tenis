import {
    ADD_ALERTS,
    CHANGE_ALERTS,
    CLOSE_SOCKET,
    OPEN_SOCKET,
    REMOVE_ALERTS, RESET_ALERTS,
    SET_ALERTS
} from "../actions/WEBSOCKET_ACTIONS";


const defaultState = {
    isOpened: false,
    alerts: []

}

export const webSocketReducer = (state = defaultState, action) => {
    switch (action.type) {
        case OPEN_SOCKET:
            return {...state, isOpened: true}
        case CLOSE_SOCKET:
            return {...state, isOpened: false}
        case SET_ALERTS:
            return {...state, alerts: action.payload}
        case ADD_ALERTS:
            return { ...state, alerts: [...state.alerts, ...action.payload] };
        case REMOVE_ALERTS:
            const idsToRemove = action.payload.map((alert) => alert.id);
            return {
                ...state,
                alerts: state.alerts.filter((alert) => !idsToRemove.includes(alert.id)),
            };
        case CHANGE_ALERTS:
            const newAlerts = state.alerts.map((alert) => {
                const changedAlert = action.payload.find((newAlert) => newAlert.id === alert.id)
                return changedAlert ? changedAlert : alert
        })
            return {...state, alerts: newAlerts};
        case RESET_ALERTS:
            return {...state, alerts: []}
        default:
            return state
    }
}

export const openWebSocket = () => ({
    type: OPEN_SOCKET
})
export const closeWebSocket = () => ({
    type: CLOSE_SOCKET
})
export const setAlerts = (alerts) => ({
    type: SET_ALERTS,
    payload: alerts
})
export const addAlerts = (alerts) => ({
    type: ADD_ALERTS,
    payload: alerts
})
export const removeAlerts = (alerts) => ({
    type: REMOVE_ALERTS,
    payload: alerts
})
export const resetAlerts = () => ({
    type: RESET_ALERTS
})
