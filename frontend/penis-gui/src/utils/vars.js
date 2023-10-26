import {
    boardreaderProjectFunction, browserTimeZone, dataCenterTimeZone,
    groupedAlertsFunction,
    ivincoProjectFunction,
    ungroupedAlertsFunction, utcTimeZone
} from "./utils";

export const sideBarMenuItems = [{value: 'Normal'}, {value: 'History'}, {value: 'Stats'}]
export const headerMenuItems = [
    {   name: 'Project',
        buttons: [
            {
                name: "Boardreader",
                onClickFunction: boardreaderProjectFunction
            },
            {
                name: "Ivinco",
                onClickFunction: ivincoProjectFunction
            }
        ]
    },
    {
        name: "Grouping",
        buttons: [
            {
                name: "Grouped",
                onClickFunction: groupedAlertsFunction
            },
            {
                name: "Ungrouped",
                onClickFunction: ungroupedAlertsFunction
            }
        ]
    },
    {
        name: "Time Zone",
        buttons: [
            {
                name: 'UTC',
                onClickFunction: utcTimeZone
            },
            {
                name: 'Data Center',
                onClickFunction: dataCenterTimeZone
            },
            {
                name: 'Browser',
                onClickFunction: browserTimeZone
            }
        ]
    }
]