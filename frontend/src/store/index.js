import {createStore, combineReducers} from "redux";
import {sideBarMenuItemReducer, hiddenMenuReducer} from "./reducers/hiddenMenuReducer";
import {composeWithDevTools} from "redux-devtools-extension"
import {headerMenuReducer, headerMenuValuesReducer} from "./reducers/headerMenuReducer";
import {webSocketReducer} from "./reducers/webSocketReducer";
import {authReducer} from "./reducers/authReducer";
import {modalReducer} from "./reducers/modalReducer";

const rootReducer = combineReducers({
    hiddenMenu: hiddenMenuReducer,
    switchSideBarMenuItem: sideBarMenuItemReducer,
    switchHeaderMenuItem: headerMenuReducer,
    setHeaderMenuItemValue: headerMenuValuesReducer,
    webSocket: webSocketReducer,
    authReducer: authReducer,
    switchModal: modalReducer
})

export const store = createStore(rootReducer, composeWithDevTools())