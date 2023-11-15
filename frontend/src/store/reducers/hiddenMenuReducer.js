import {SET_ACTIVE_MENU_ITEM, SWITCH_FILTER_MENU, SWITCH_SIDE_BAR_MENU} from "../actions/HIDDEN_MENU_ACTIONS";

const defaultState = {
    isOpenedSideBar: false,
    isOpenedFilterMenu: false
}

const defaultMenuItem = {
    activeMenuItem: 'Normal'
}

export const hiddenMenuReducer = (state = defaultState, action) => {
    switch (action.type) {
        case SWITCH_SIDE_BAR_MENU:
            return {...state, isOpenedSideBar: !state.isOpenedSideBar}
        case SWITCH_FILTER_MENU:
            return {...state, isOpenedFilterMenu: !state.isOpenedFilterMenu}
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

export const switchFilterMenu = () => ({
    type: SWITCH_FILTER_MENU
})

export const switchActiveSideBarMenuItem = (item) => ({
    type: SET_ACTIVE_MENU_ITEM,
    payload: item
})
