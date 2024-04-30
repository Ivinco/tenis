import React, {useState} from 'react';
import Timeline from "react-timelines/lib/components/Timeline";

const TimeLine = () => {
    const currentDate = Date.now()
    const startDate = new Date(currentDate - (3 * 24 *60 * 60 * 1000));
    const endDate = new Date(currentDate);
    const [open, setOpen] = useState(false);
    const [zoom, setZoom] = useState(2);
    const minZoom = 2
    const maxZoom = 20

    const buildDayCells = () => {
        const v = [];
        let day = new Date(startDate);

        while (day <= currentDate) {
            const nextDay = new Date(day);
            nextDay.setDate(nextDay.getDate() + 1);

            let start;
            let end;

            if (day.getDate() === startDate.getDate()) {
                start = new Date(day);
            } else {
                start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0);
            }

            if (day < currentDate) {
                end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59);
            } else {
                end = endDate
            }

            v.push({
                id: `${day.getDate()}-${day.getMonth()}-${day.getFullYear()}`,
                title: `${day.getDate()}-${day.getMonth()}-${day.getFullYear()}`,
                start: start,
                end: end
            });

            day = nextDay;
        }

        return v;
    };


    const days = buildDayCells();
    console.log(days)


    const buildHourCells = (days) => {
        const v = [];

        return v;
    };

    // const buildTimebar = () => [
    //     {
    //         id: "quarters",
    //         title: "Quarters",
    //         cells: buildQuarterCells(),
    //         style: {}
    //     },
    //     {
    //         id: "months",
    //         title: "Months",
    //         cells: buildMonthCells(),
    //         useAsGrid: true,
    //         style: {}
    //     }
    // ];

    const toggleOpen = () => {
        setOpen(!open);
    }

    const handleZoomIn = () => {
        setZoom(Math.min(zoom + 1, maxZoom));
    }

    const handleZoomOut = () => {
        setZoom(Math.max(zoom - 1, minZoom));
    }

    return (
        <div>
            Time Line Component
            {startDate.toString()}
            {/*<Timeline*/}
            {/*scale={{*/}
            {/*    startDate: startDate,*/}
            {/*    endDate: endDate,*/}
            {/*    zoom: 2,*/}
            {/*    zoomMin: 2,*/}
            {/*    zoomMax: 20,*/}
            {/*}}*/}
            {/*isOpen = {open}*/}
            {/*toggleOpen={toggleOpen}*/}
            {/*zoomIn={handleZoomIn}*/}
            {/*zoomOut={handleZoomOut}*/}
            {/*/>*/}
        </div>
    );
};

export default TimeLine;