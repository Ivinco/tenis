import {LOADED, LOADING} from "../actions/LOADING_ACTIONS";


const defaultState = {
    isLoading: false
}

export const loadingReducer = (state = defaultState, action) => {
    switch (action.type) {
        case LOADING:
            return {...state, isLoading: true}
        case LOADED:
            return {...state, isLoading: false}
        default:
            return state
    }
}

export const startLoadAction = () => ({
    type: LOADING
})

export const stopLoadAction = () => ({
    type: LOADED
})