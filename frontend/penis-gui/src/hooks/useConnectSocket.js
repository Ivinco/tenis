import {useEffect} from "react";
import SocketAPI from "../api/alertApi";
import {useDispatch, useSelector} from "react-redux";
import {
    addAlerts,
    closeWebSocket,
    openWebSocket,
    removeAlerts,
    resetAlerts,
    setAlerts
} from "../store/reducers/webSocketReducer";


export const useConnectSocket = () => {
    const dispatch = useDispatch()
    const alerts = useSelector(state => state.webSocket.alerts)
    const connectSocket = () => {
        SocketAPI.createConnection()

        SocketAPI.socket.on('connect', () => {
            console.log("Websocket connected")
            dispatch(openWebSocket())
        })

        SocketAPI.socket.on('disconnect', () => {
            console.log("Websocket disconnected")
            dispatch(closeWebSocket())
            dispatch(resetAlerts())
        })

        SocketAPI.socket.on ('alerts', (data) => {
            dispatch(setAlerts(JSON.parse(data)))
        })
        SocketAPI.socket.on ('new alerts', (data) => {
            dispatch(addAlerts(JSON.parse(data)))
        })
        SocketAPI.socket.on('resolved alerts', (data) => {
            dispatch(removeAlerts(JSON.parse(data)))
        })
    }

    useEffect(() => {
        connectSocket()

    }, []);

    return alerts
}