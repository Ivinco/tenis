import {createStore, combineReducers} from "redux";
import {sideBarMenuItemReducer, sideBarReducer} from "./reducers/sideBarReducer";
import {composeWithDevTools} from "redux-devtools-extension"
import {headerMenuReducer, headerMenuValuesReducer} from "./reducers/headerMenuReducer";

const rootReducer = combineReducers({
    switchSideBar: sideBarReducer,
    switchSideBarMenuItem: sideBarMenuItemReducer,
    switchHeaderMenuItem: headerMenuReducer,
    setHeaderMenuItemValue: headerMenuValuesReducer
})

export const store = createStore(rootReducer, composeWithDevTools())