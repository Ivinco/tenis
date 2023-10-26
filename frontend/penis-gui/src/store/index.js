import {createStore, combineReducers} from "redux";
import {sideBarMenuItemReducer, sideBarReducer} from "./reducers/sideBarReducer";
import {composeWithDevTools} from "redux-devtools-extension"

const rootReducer = combineReducers({
    switchSideBar: sideBarReducer,
    switchSideBarMenuItem: sideBarMenuItemReducer
})

export const store = createStore(rootReducer, composeWithDevTools())