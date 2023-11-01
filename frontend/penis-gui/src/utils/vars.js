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