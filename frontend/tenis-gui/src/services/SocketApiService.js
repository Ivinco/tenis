import io from "socket.io-client"
import {PORT, URL} from "../utils/vars"

class SocketApiService {
    static socket = null;
    static createConnection() {
        this.socket = io(`${URL}:${PORT}`)
    }

}

export default SocketApiService