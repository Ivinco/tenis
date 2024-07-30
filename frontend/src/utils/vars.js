import {setGroupingMenuValue, setProjectMenuValue, setTimeZoneValue} from "../store/reducers/headerMenuReducer";
import {HISTORY_DISPLAY, MAIN_DISPLAY, SILENCED_DISPLAY, STATS_DISPLAY} from "../store/actions/DISPLAY_ACTIONS";

export const sideBarMenuItems = [
    {value: 'Normal', action: MAIN_DISPLAY},
    {value: 'Silenced', action: SILENCED_DISPLAY},
    {value: 'History', action: HISTORY_DISPLAY},
    // {value: 'Stats', action: STATS_DISPLAY}

]
export const headerMenuItems = [
    {   name: 'Project',
        buttons: ["All"],
        action: setProjectMenuValue
    },
    // {
    //     name: "TZ",
    //     buttons: ["Browser", "Data Center", "UTC"],
    //     action: setTimeZoneValue
    // }
]
export const BACKEND_SERVER = window._env_.API_SERVER || "localhost"
export const BACKEND_PORT = window._env_.BACKEND_PORT || '443'