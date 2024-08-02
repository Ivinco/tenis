import {sha256} from "js-sha256";

export function processTimeStamp (unixDateString) {
    const unixTime = parseInt(unixDateString, 10);
    const dateObject = new Date(unixTime * 1000);
    const year = dateObject.getFullYear();
    const month = (dateObject.getMonth() + 1).toString().padStart(2,'0');
    const day = dateObject.getDate().toString().padStart(2, '0');
    const hours = dateObject.getHours();
    const minutes = dateObject.getMinutes();
    return `${year}-${month}-${day} ${hours}h:${minutes}m`;
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

export function groupByField(alerts, fieldName){
    const groupedByField = alerts.reduce((acc, item) => {
        acc[item[fieldName]] = acc[item[fieldName]] || []
        acc[item[fieldName]].push(item)
        return acc
    }, {})

    return Object.values(groupedByField).filter(group => group.length > 1)
}

export function sortList (list, field, direction) {
    list.sort((a, b) => {
        if (a[field] < b[field]) {
            if (direction === 'asc'){
                return -1
            } else {
                return 1
            }
        }
        if (a[field] > b[field]) {
            if (direction === 'asc'){
                return 1
            } else {
                return -1
            }
        }
        return 0
    })
    return list
}

export function stringToDate (string) {
        const date = new Date(string);
        return isNaN(date.getTime()) ? string : date;
}

export function prepareUser (data) {
    console.log("Input data to prepareUser Function")
    console.log(data)
    const user_raw = {
        userName: data.name,
        userId: data._id,
        userEmail: data.email,
        userImage: `https://gravatar.com/avatar/${sha256(data.email)}?s=150`,
        userPhone: data.phone ? data.phone : null,
        usersCommentReplaceRules: data.commentReplaceRules ? data.commentReplaceRules : null,
        userProjects: data.projects
    }
    const user = {...user_raw, userProjects: ['All', ...user_raw.userProjects]}
    console.log("output data from prepareUser Function")
    console.log(user)
    return user
}
