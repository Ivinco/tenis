import {SET_ACTIVE_MENU_ITEM, SWITCH_SIDE_BAR_MENU} from "../actions/SIDEBAR_ACTIONS";

const defaultState = {
    isOpenedSideBar: false
}

const defaultMenuItem = {
    activeMenuItem: 'Normal'
}

export const sideBarReducer = (state = defaultState, action) => {
    switch (action.type) {
        case SWITCH_SIDE_BAR_MENU:
            return {...state, isOpenedSideBar: !state.isOpenedSideBar}
        default:
            return state
    }
}

export const sideBarMenuItemReducer = (state = defaultMenuItem, action) => {
    switch (action.type) {
        case SET_ACTIVE_MENU_ITEM:
            return {...state, activeMenuItem: action.payload}
        default:
            return state
    }
}

export const switchSideBarState = () => ({
    type: SWITCH_SIDE_BAR_MENU
})

export const switchActiveSideBarMenuItem = (item) => ({
    type: SET_ACTIVE_MENU_ITEM,
    payload: item
})
