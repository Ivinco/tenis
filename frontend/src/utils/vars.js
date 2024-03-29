import {setGroupingMenuValue, setProjectMenuValue, setTimeZoneValue} from "../store/reducers/headerMenuReducer";
import {HISTORY_DISPLAY, MAIN_DISPLAY, STATS_DISPLAY} from "../store/actions/DISPLAY_ACTIONS";

export const sideBarMenuItems = [
    {value: 'Normal', action: MAIN_DISPLAY},
    {value: 'History', action: HISTORY_DISPLAY},
    {value: 'Stats', action: STATS_DISPLAY}

]
export const headerMenuItems = [
    {   name: 'Project',
        buttons: ["All"],
        action: setProjectMenuValue
    },
    {
        name: "Grouping",
        buttons: ["Disabled", "Enabled"],
        action: setGroupingMenuValue
    },
    {
        name: "TZ",
        buttons: ["Browser", "Data Center", "UTC"],
        action: setTimeZoneValue
    }
]
export const BACKEND_SERVER = process.env.REACT_APP_SERVER || "https://api.tenis-dev-2.k8s-test.ivinco.com"
export const PORT = process.env.REACT_APP_PORT || '443'