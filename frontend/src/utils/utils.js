
export const boardreaderProjectFunction = () => {
    console.log("Boardreader project alerts")
}

export const ivincoProjectFunction = () => {
    console.log("Ivinco project alerts")
}

export const allProjectsFunction = () => {
    console.log('All projects alerts')
}

export const groupedAlertsFunction = () => {
    console.log('Grouped alerts')
}

export const ungroupedAlertsFunction = () => {
    console.log('Ungrouped alerts')
}

export const browserTimeZone = () => {
    console.log('Browser Time Zone')
}

export const dataCenterTimeZone = () => {
    console.log('Data Center Time Zone')
}

export const utcTimeZone = () => {
    console.log('UTC Time Zone')
}

export function processTimeStamp (unixdate) {
    const dateObject = new Date(unixdate)
    const year = dateObject.getFullYear()
    const month = dateObject.getMonth()
    const day = dateObject.getDay()
    const hours = dateObject.getHours()
    const minutes = dateObject.getMinutes()
    const seconds = dateObject.getSeconds()
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`
}

export function processDuration(unixdate) {
    const startDate = new Date(unixdate);
    const currentDate = new Date();
    const timeDelta = currentDate - startDate;

    const days = Math.floor(timeDelta / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDelta % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDelta % (1000 * 60 * 60)) / (1000 * 60));

    return `${days}d ${hours}h ${minutes}m`
}
