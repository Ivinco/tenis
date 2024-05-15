from datetime import datetime, timezone
import re


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


def regexp_alerts(alerts, rules):
    """
    Get list of alerts matching by 'project', 'alertName' and 'host' fields via regex rules
    :param alerts: List of alerts to check
    :param rules: Dictionary with regexp patterns for project, alertName and host to search matching alerts
    :return: List of alerts that matches, or None
    """
    matched_alerts = []
    try:
        for a in alerts:
            if (re.search(rules['project'], a['project']) and
                re.search(rules['alertName'], a['alertName']) and
                re.search(rules['host'], a['host'])):
                matched_alerts.append(a)
        return matched_alerts
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
                for attr in ['fired', 'severity', 'msg', 'responsibleUser', 'comment', 'silenced', 'customFields']:
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
        'severity': alert['severity'],
        'responsibleUser': alert['responsibleUser'],
        'fired': alert['fired'],
        'msg': alert['msg'],
        'silenced': alert['silenced'],
        'comment': alert['comment'],
        'customFields': alert['customFields']
    }

def is_resolved(alert):
    """ Return true if alert['severity'] indicates that alert is resolved """
    try:
        s = alert['severity'].lower()
        if s == 'ok' or s == 'resolved':
            return True
    except TypeError:
        pass
    return False
