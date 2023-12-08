export const hostNameGroups = (alertsArrays) => {
    const groups = []
    alertsArrays.forEach( alertsArray => {
        let severityValue = 0
        let severity = ""
        alertsArray.forEach(alert => {
            let level = 0
            switch (alert.severity){
                case "EMERGENCY":
                    level = 3
                    break
                case "CRITICAL":
                    level = 2
                    break
                case "WARNING":
                    level = 1
                    break
                default:
                    level = 0
            }
            if (level > severityValue){
                severityValue = level
            }
        })
        switch (severityValue) {
            case 3:
                severity = "EMERGENCY"
                break
            case 2:
                severity = "CRITICAL"
                break
            case 1:
                severity = 'WARNING'
                break
            default:
                severity = "INFO"
        }
        const hostGroup = {
            id: alertsArray[0].host,
            project: alertsArray[0].project,
            groupFactor: `Host: ${alertsArray[0].host}`,
            alerts: alertsArray,
            severity: severity,
            description: `${alertsArray.length} alerts on ${alertsArray[0].host}`
        }
        groups.push(hostGroup)
    })
    return groups
}

export const alertNameGroups = (alertsArrays) => {
    const groups = []
    alertsArrays.forEach( array => {
        const hostGroup = {
            id: array[0].alertName,
            project: array[0].project,
            groupFactor: `Alert Name: ${array[0].alertName}`,
            alerts: array,
            severity: array[0].severity,
            description: `${array[0].msg} on ${array.length} hosts`
        }
        groups.push(hostGroup)
    })
    return groups
}

export const alertsToGroup = (alertsGroup) => {
    const groupedAlertIds = new Set()
    alertsGroup.forEach(group => {
        group.alerts.forEach(alert => {
            groupedAlertIds.add(alert.id)
        })
    })
    return groupedAlertIds
}