import io from "socket.io-client"
import {BACKEND_SERVER} from "../utils/vars"

class SocketApiService {
    static socket = null;
    static createConnection(token) {
        // This is test endpoint for web socket server hosted on local host
        // this.socket = io ("localhost:8080")
        this.socket = io(`${BACKEND_SERVER}/alerts`,{
            extraHeaders:{
                'Authorization': `Bearer ${token}`
            }
        }
        )
    }
    static closeConnection() {
        if(this.socket){
            this.socket.close()
        }
    }

}

export default SocketApiService