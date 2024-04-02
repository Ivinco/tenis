import api from "../api/api"

export default class AlertService {
    static async ack (ackedAlerts) {
        return api.post('/ack',  {ack: ackedAlerts})
    }

    static async unack (ackedAlerts) {
        return api.post('/ack', {unack: ackedAlerts})
    }

    static async silence (payload) {
        return api.post('/silence', payload)
    }
}