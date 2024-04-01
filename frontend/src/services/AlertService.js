import api from "../api/api"

export default class AlertService {
    static async ack (ackedAlerts) {
        return api.post('/ack',  {ack: ackedAlerts})
    }

    static async unack (ackedAlerts) {
        return api.post('/ack', {unack: ackedAlerts})
    }

    static async silence (silenceRule) {
        return api.post('/silence', {silenceRule: silenceRule})
    }
}