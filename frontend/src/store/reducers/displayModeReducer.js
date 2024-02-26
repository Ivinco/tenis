import {MAIN_DISPLAY, HISTORY_DISPLAY, STATS_DISPLAY} from "../actions/DISPLAY_ACTIONS";

const defaultValue = {
    display: MAIN_DISPLAY
}

export const displayReducer = (state = defaultValue, action) => {
    switch (action.type) {
        case MAIN_DISPLAY:
            return {...state, display: MAIN_DISPLAY}
        case HISTORY_DISPLAY:
            return {...state, display: HISTORY_DISPLAY}
        case STATS_DISPLAY:
            return {...state, display: HISTORY_DISPLAY}
        default:
            return state
    }
}

export const switchDisplayMode = (displayMode) => ({
    type: displayMode})

