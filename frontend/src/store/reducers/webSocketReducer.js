import {
    ADD_ALERTS,
    UPDATE_ALERTS,
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
            return {
                ...state,
                alerts: state.alerts.filter((alert) => !action.payload.includes(alert._id)),
            };
        case UPDATE_ALERTS:
            const newAlerts = [...state.alerts]
            action.payload.map((alert) => {
                const index = newAlerts.findIndex((item) => item._id === alert._id)
                if (index !== -1) {
                    newAlerts[index] = alert
                } else {
                    newAlerts.push(alert)
                }
            })
            return {...state, alerts: newAlerts}
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

export const updateAlerts = (alerts) => ({
    type: UPDATE_ALERTS,
    payload: alerts
})
export const resetAlerts = () => ({
    type: RESET_ALERTS
})
