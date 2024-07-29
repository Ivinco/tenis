import io from "socket.io-client"
import {BACKEND_SERVER} from "../utils/vars"

class SocketAPI {
    static socket = null;
    static createConnection(token) {
        this.socket = io(`${BACKEND_SERVER}`, {
            extraHeaders:{
                Authorization: `Bearer ${token}`
            }
        })
    }

}
export default SocketAPI