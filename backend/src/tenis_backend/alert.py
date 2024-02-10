from datetime import datetime, timezone

def load_alerts(mongo_collection):
    """ Load all alerts from the database upon startup """
    return list(mongo_collection.find({}))


def lookup_alert(alerts, alert):
    """
    Check if alert is already in the list
    :param alerts: Global list of alerts
    :param alert: New alert to check
    :return: First element in the alerts list that matches, or None
    """
    try:
        for a in alerts:
            if (a['project'] == alert['project'] and
                a['alertName'] == alert['alertName'] and
                a['host'] == alert['host']):
                return a
        return None
    except TypeError:
        return None


def make_history_entry(alert):
    """ Return history entry for the given alert """
    return {
        'alert_id': alert['_id'],
        'logged': datetime.now(timezone.utc),
        'project': alert['project'],
        'host': alert['host'],
        'alertName': alert['alertName'],
        'severity': alert['severity']
    }
