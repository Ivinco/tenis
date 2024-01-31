def load_alerts(mongo_collection):
    """ Load all alerts from the database upon startup """
    return list(mongo_collection.find({}))


def lookup_alert(alerts, alert):
    """
    Check if alert is already in the list
    :param alerts: Global list of alerts
    :param alert: New alert to check
    :return: Index of alert in global list if match or None
    """
    try:
        for i in range(len(alerts)):
            tst_alert = f"{alerts[i]['alertName']}{alerts[i]['project']}{alerts[i]['host']}"
            new_alert = f"{alert['alertName']}{alert['project']}{alert['host']}"
            if tst_alert == new_alert:
                return i
        return None
    except TypeError:
        return None
