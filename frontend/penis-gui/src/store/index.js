import {createStore, combineReducers} from "redux";
import {sideBarMenuItemReducer, sideBarReducer} from "./reducers/sideBarReducer";
import {composeWithDevTools} from "redux-devtools-extension"
import {headerMenuReducer, headerMenuValuesReducer} from "./reducers/headerMenuReducer";
import {webSocketReducer} from "./reducers/webSocketReducer";

const rootReducer = combineReducers({
    switchSideBar: sideBarReducer,
    switchSideBarMenuItem: sideBarMenuItemReducer,
    switchHeaderMenuItem: headerMenuReducer,
    setHeaderMenuItemValue: headerMenuValuesReducer,
    webSocket: webSocketReducer
})

export const store = createStore(rootReducer, composeWithDevTools())