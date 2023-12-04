
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

export function processTimeStamp (unixDateString) {
    const unixTime = parseInt(unixDateString, 10)
    const dateObject = new Date(unixTime*1000)
    const year = dateObject.getFullYear()
    const month = dateObject.getMonth()
    const day = dateObject.getDay()
    const hours = dateObject.getHours()
    const minutes = dateObject.getMinutes()
    const seconds = dateObject.getSeconds()
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`
}

export function processDuration(unixDateString) {
    const unixTime = parseInt(unixDateString, 10)
    const startDate = new Date(unixTime*1000);
    const currentDate = new Date();
    const timeDelta = currentDate - startDate;

    const days = Math.floor(timeDelta / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDelta % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDelta % (1000 * 60 * 60)) / (1000 * 60));

    return `${days}d ${hours}h ${minutes}m`
}

export function processAlertComment (word, commentReplaceRules) {
    const links = []
    for (const [key, value] of Object.entries(commentReplaceRules)){
        const regex = new RegExp(key, "i")
        const match = word.match(regex)
        if (word.match(regex)){
            const link = value.replace(/\$1/g, match[0])
            return (
                <a style={{display: "contents"}} target="_blank" rel="noopener noreferrer" href={link}> {word} </a>
            )
        }
    }
    return word
}
