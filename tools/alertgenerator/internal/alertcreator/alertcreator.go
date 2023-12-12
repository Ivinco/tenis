package alertcreator

import (
	"fmt"
	"github.com/Ivinco/tenis.git/internal/configs"
	"math/rand"
	"time"
)

type Alert struct {
	Project      string            `json:"project"`
	Host         string            `json:"host"`
	Fired        int64             `json:"fired"`
	Name         string            `json:"alertName"`
	Severity     string            `json:"severity"`
	Msg          string            `json:"msg"`
	User         string            `json:"responsibleUser"`
	Comment      string            `json:"comment"`
	Scheduled    bool              `json:"isScheduled"`
	CustomFields map[string]string `json:"customFields"`
}

type AlertList struct {
	Alerts []Alert `json:"alerts"`
}

var projects = []string{"Boardreader", "Ivinco"}
var severityLevels = []string{"EMERGENCY", "CRITICAL", "WARNING", "INFO"}

func CreateAlerts(configs *configs.Params) (AlertList, error) {
	alerts := configs.UngroupedAlerts
	hngroups := configs.HostnameGroups
	angroups := configs.AlertNameGroups
	groupedAlerts := configs.GroupedAlerts

	alertList := AlertList{}
	if alerts < 1 || hngroups < 0 || angroups < 0 || groupedAlerts < 0 {
		return alertList, fmt.Errorf("The number of alerts and groups should be positive number")
	}
	for i := 1; i <= alerts; i++ {
		alert := Alert{
			Project:   projects[rand.Intn(len(projects))],
			Host:      fmt.Sprintf("Worker-%d", i),
			Name:      fmt.Sprintf("Random alert-%d on Worker-%d", i, i),
			Fired:     time.Now().Unix(),
			Severity:  severityLevels[rand.Intn(len(severityLevels))],
			Msg:       "kubelet on crawl-farm-vm-worker02.sgdctroy.net(192.168.5.102) got more than 100 errors per 5min",
			User:      "",
			Comment:   "",
			Scheduled: false,
			CustomFields: map[string]string{
				"Fix Instructions": "https://wiki.ivinco.com/prj/intranet#mnu",
				"Labels":           "Label1, Label2, Label3",
				"Grafana Link":     "https://grafana.sgdctroy.net/d/vYIh9K9Mzss/redis?orgId=1&refresh=30s",
			},
		}
		alertList.Alerts = append(alertList.Alerts, alert)
	}

	if hngroups > 0 {
		for h := 1; h <= hngroups; h++ {
			for a := 1; a <= groupedAlerts; a++ {
				alert := Alert{
					Project:   projects[rand.Intn(len(projects))],
					Host:      fmt.Sprintf("Sick Tenis-%d", h),
					Name:      fmt.Sprintf("Found %d tenis  on Host-%d-%d", a, h, a),
					Fired:     time.Now().Unix(),
					Severity:  severityLevels[rand.Intn(len(severityLevels))],
					Msg:       "kubelet on crawl-farm-vm-worker02.sgdctroy.net(192.168.5.102) got more than 100 errors per 5min",
					User:      "",
					Comment:   "",
					Scheduled: false,
					CustomFields: map[string]string{
						"Fix Instructions": "https://wiki.ivinco.com/prj/intranet#mnu",
						"Labels":           "Label1, Label2, Label3",
						"Grafana Link":     "https://grafana.sgdctroy.net/d/vYIh9K9Mzss/redis?orgId=1&refresh=30s",
					},
				}
				alertList.Alerts = append(alertList.Alerts, alert)
			}

		}
	}

	if angroups > 0 {
		for a := 1; a <= angroups; a++ {
			for i := 1; i <= groupedAlerts; i++ {
				severityLevel := severityLevels[rand.Intn(len(severityLevels))]
				alert := Alert{
					Project:   projects[rand.Intn(len(projects))],
					Host:      fmt.Sprintf("Weak Tenis-%d-%d", a, i),
					Name:      fmt.Sprintf("Your Tenis-%d is not strong enough", a),
					Fired:     time.Now().Unix(),
					Severity:  severityLevel,
					Msg:       "kubelet on crawl-farm-vm-worker02.sgdctroy.net(192.168.5.102) got more than 100 errors per 5min",
					User:      "",
					Comment:   "",
					Scheduled: false,
					CustomFields: map[string]string{
						"Fix Instructions": "https://wiki.ivinco.com/prj/intranet#mnu",
						"Labels":           "Label1, Label2, Label3",
						"Grafana Link":     "https://grafana.sgdctroy.net/d/vYIh9K9Mzss/redis?orgId=1&refresh=30s",
					},
				}
				alertList.Alerts = append(alertList.Alerts, alert)
			}
		}
	}
	return alertList, nil
}
