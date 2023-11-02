import io from "socket.io-client"
import {PORT, URL} from "../utils/vars"

class SocketAPI {
    static socket = null;
    static createConnection() {
        this.socket = io(`${URL}:${PORT}`)
        // this.socket.on ('connect', () => {
        //     console.log('Websocket connected')
        // })
        // this.socket.on ('disconnect', (e) => {
        //     console.log('Websocket disconnected')
        // })
    }

}
export default SocketAPI