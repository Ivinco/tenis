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

def update_alerts(alerts, alert):
    """ Look for alert in the global list that matches the given one
        and update the details """
    try:
        for a in alerts:
            if (a['project'] == alert['project'] and
                a['alertName'] == alert['alertName'] and
                a['host'] == alert['host']):
                for attr in ['fired', 'severity', 'msg', 'responsibleUser', 'comment', 'isScheduled', 'customFields']:
                    a[attr] = alert[attr]
    except TypeError:
        pass
    return
            

def make_history_entry(alert):
    """ Return history entry for the given alert.
        This is effectively just a part of alert's data needed for the history collection. """
    return {
        'alert_id': alert['_id'],
        'logged': datetime.now(timezone.utc),
        'project': alert['project'],
        'host': alert['host'],
        'alertName': alert['alertName'],
        'severity': alert['severity']
    }
