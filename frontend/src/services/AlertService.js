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

    static async getSileneced () {
        return api.get('/silenced')
    }

    static async unsilence (payload) {
        return api.post('/unsilence', {unsilence: payload})
    }

    static async getHistoryAlerts (datetime) {
        const config = {
            headers: {
                'Content-Type': 'application/json'
            },
            params: {
                datetime: datetime
            }
        };
        return api.get ('/history', config)
    }

    static async getAlertHistory (params) {
        const config = {
            headers: {
                'Content-Type': 'application/json'
            },
            params: params
        }
        return api.get ('/history', config)
    }
}