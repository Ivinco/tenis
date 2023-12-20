def load_alerts(mongo_collection):
    """ Load all alerts from the database upon startup """
    return list(mongo_collection.find({}))

def lookup_alert(alerts, alert):
    try:
        for a in alerts:
            if (a['project'] == alert['project'] and
                a['alertName'] == alert['alertName'] and
                a['host'] == alert['host']):
                return a
        return None
    except TypeError:
        return None
