import {useEffect} from "react";
import SocketApiService from "../services/SocketApiService";
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
    const token = localStorage.getItem('token');
    const connectSocket = (token) => {
        SocketApiService.createConnection(token)

        SocketApiService.socket.on('connect', () => {
            console.log("Websocket connected")
            dispatch(openWebSocket())
        })

        SocketApiService.socket.on('disconnect', () => {
            console.log("Websocket disconnected")
            dispatch(closeWebSocket())
            dispatch(resetAlerts())
        })

        SocketApiService.socket.on ('init', (data) => {
            dispatch(setAlerts(JSON.parse(data)))
        })
        SocketApiService.socket.on ('update', (data) => {
            dispatch(addAlerts(JSON.parse(data)))
        })
        SocketApiService.socket.on('resolved', (data) => {
            dispatch(removeAlerts(JSON.parse(data)))
        })
    }
    const closeSocket = () => {
        SocketApiService.closeConnection()
    }

    useEffect(() => {
        connectSocket(token)
        return () => {
            closeSocket()
        }

    }, [token]);
}