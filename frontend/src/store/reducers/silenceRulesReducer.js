import {SILENCED_RULES} from "../actions/SILENCED_RULES";

const defaultState = {
    rules : []
}

export const silenceRulesReducer = (state = defaultState, action) => {
    switch (action.type) {
        case SILENCED_RULES:
            return {...state, rules:action.payload}
        default:
            return state
    }
}

export const setSilenceRules = (rules) => ({
    type: SILENCED_RULES,
    payload: rules
})