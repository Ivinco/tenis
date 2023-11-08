import {
    SET_GROUPING_VALUE,
    SET_PROJECT_VALUE,
    SET_TIMEZONE_VALUE,
    SWITCH_ACTIVE_HEADER_MENU_ITEM
} from "../actions/HEADER_MENU_ACTIONS";

const defaultActiveHeaderMenuItem = {
    activeHeaderMenuItem: null
}

const defaultHeaderMenuValues = {
    project: 'All',
    grouping: 'Disabled',
    tz: 'Browser'
}


export const headerMenuReducer = (state = defaultActiveHeaderMenuItem, action) => {
    switch (action.type) {
        case SWITCH_ACTIVE_HEADER_MENU_ITEM:
            return {...state, activeHeaderMenuItem: action.payload}
        default:
            return state
    }
}

export const headerMenuValuesReducer = (state = defaultHeaderMenuValues, action) => {
    switch (action.type){
        case SET_PROJECT_VALUE:
            return {...state, project: action.payload}
        case SET_GROUPING_VALUE:
            return {...state, grouping: action.payload}
        case SET_TIMEZONE_VALUE:
            return {...state, tz: action.payload}
        default:
            return state
    }
}

export const switchActiveHeaderMenuItem = (itemName) => ({
    type: SWITCH_ACTIVE_HEADER_MENU_ITEM,
    payload: itemName
})

export const setProjectMenuValue = (projectName) => ({
    type: SET_PROJECT_VALUE,
    payload: projectName
})

export const setGroupingMenuValue = (isGrouped) => ({
    type: SET_GROUPING_VALUE,
    payload: isGrouped
})

export const setTimeZoneValue = (timeZone) => ({
    type: SET_TIMEZONE_VALUE,
    payload: timeZone
})
