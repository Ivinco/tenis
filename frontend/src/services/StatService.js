import api from '../api/api';

export default class StatService {
    static async getStats(user, startDate, endDate) {
        const params = {
            ...(user && { user }),
            ...(startDate && { startDate }),
            ...(endDate && { endDate }),
        }
        const config = {
            headers: {
                'Content-Type': 'application/json',
            },
            params: params
        }
        return api.get (`/stats`, config)
    }
}