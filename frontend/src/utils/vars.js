import {setGroupingMenuValue, setProjectMenuValue, setTimeZoneValue} from "../store/reducers/headerMenuReducer";

export const sideBarMenuItems = [{value: 'Normal'}, {value: 'History'}, {value: 'Stats'}]
export const headerMenuItems = [
    {   name: 'Project',
        buttons: ["All","Boardreader", "Ivinco"],
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
export const BACKEND_SERVER = process.env.REACT_APP_SERVER || "https://api.tenis-dev.k8s-test.ivinco.com"
// export const BACKEND_SERVER = process.env.SERVER
export const PORT = process.env.REACT_APP_PORT || '443'