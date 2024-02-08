package alertprocessor

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/Ivinco/tenis.git/internal/lib/sl"
	"github.com/go-chi/chi/v5/middleware"
	"log/slog"
	"strings"
	"time"
)

type AlertsList struct {
	Update  []PreparedAlert `json:"update,omitempty"`
	Resolve []ResolvedAlert `json:"resolve,omitempty"`
}

type PreparedAlert struct {
	Project      string                 `json:"project"`
	Host         string                 `json:"host"`
	Fired        int64                  `json:"fired"`
	Name         string                 `json:"alertName"`
	Severity     string                 `json:"severity"`
	Msg          string                 `json:"msg"`
	User         string                 `json:"responsibleUser"`
	Comment      string                 `json:"comment"`
	Scheduled    bool                   `json:"isScheduled"`
	CustomFields map[string]interface{} `json:"customFields"`
}

type ResolvedAlert struct {
	Project   string `json:"project"`
	Host      string `json:"host"`
	AlertName string `json:"alertName"`
}

type RawAlert struct {
	Annotations  map[string]interface{} `json:"annotations"`
	EndsAt       time.Time              `json:"endsAt"`
	StartsAt     time.Time              `json:"startsAt"`
	GeneratorURL string                 `json:"generatorURL"`
	Labels       map[string]interface{} `json:"labels"`
}

func ProcessAlert(logger *slog.Logger, ctx context.Context, filePath string, project string, alert []byte) ([]byte, error) {
	const op = "helpers/alertprocessor/PrecessAlert"
	logger.With(
		slog.String("op", op),
		slog.String("request_id", middleware.GetReqID(ctx)),
	)

	var rawAlerts []RawAlert
	var alerts []PreparedAlert
	var resolvedAlerts []ResolvedAlert

	err := json.Unmarshal(alert, &rawAlerts)
	if err != nil {
		logger.Error("Error during unmarshalling alerts", sl.Err(err))
		return nil, err
	}

	for _, item := range rawAlerts {
		if item.EndsAt.Before(time.Now().UTC()) {
			logger.Info("Resolved alert:", slog.String("alertName", item.Labels["alertname"].(string)))
			var alert ResolvedAlert
			alert.Project = project
			if instance, ok := item.Labels["instance"].(string); ok {
				alert.Host = strings.Split(instance, ":")[0]
			} else {
				alert.Host = "Undefined"
			}
			if name, ok := item.Labels["alertname"].(string); ok {
				alert.AlertName = name
			} else {
				alert.AlertName = "Undefined"
			}
			resolvedAlerts = append(resolvedAlerts, alert)
		} else {
			var alert PreparedAlert
			alert.Project = project
			if instance, ok := item.Labels["instance"].(string); ok {
				alert.Host = strings.Split(instance, ":")[0]
			} else {
				alert.Host = "Undefined"
			}
			if name, ok := item.Labels["alertname"].(string); ok {
				alert.Name = name
			} else {
				alert.Name = "Undefined"
			}
			alert.Fired = item.StartsAt.Unix()
			if severity, ok := item.Labels["severity"].(string); ok {
				alert.Severity = severity
			} else {
				alert.Severity = "UNKNOWN"
			}
			if message, ok := item.Annotations["descriptions"].(string); ok {
				alert.Msg = message
			} else {
				alert.Msg = "UNDEFINED"
			}
			alert.User = ""
			alert.Comment = ""
			alert.Scheduled = false
			alert.CustomFields = item.Labels

			alerts = append(alerts, alert)
		}

	}

	alertsToSend := AlertsList{
		Update:  alerts,
		Resolve: resolvedAlerts,
	}

	fmt.Println(alertsToSend)

	data, er := json.Marshal(&alertsToSend)
	if er != nil {
		logger.Error("Error during marshalling alerts", sl.Err(err))
		return nil, er
	}

	return data, nil
}
