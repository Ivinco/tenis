import {createStore, combineReducers} from "redux";
import {sideBarMenuItemReducer, hiddenMenuReducer} from "./reducers/hiddenMenuReducer";
import {composeWithDevTools} from "redux-devtools-extension"
import {headerMenuReducer, headerMenuValuesReducer} from "./reducers/headerMenuReducer";
import {webSocketReducer} from "./reducers/webSocketReducer";
import {authReducer} from "./reducers/authReducer";
import {modalReducer} from "./reducers/modalReducer";
import {loadingReducer} from "./reducers/loadingReducer";

const rootReducer = combineReducers({
    hiddenMenu: hiddenMenuReducer,
    switchSideBarMenuItem: sideBarMenuItemReducer,
    switchHeaderMenuItem: headerMenuReducer,
    setHeaderMenuItemValue: headerMenuValuesReducer,
    webSocket: webSocketReducer,
    authReducer: authReducer,
    switchModal: modalReducer,
    switchLoadingWindow: loadingReducer
})

export const store = createStore(rootReducer, composeWithDevTools())