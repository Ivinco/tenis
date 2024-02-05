package alertprocessor

import (
	"context"
	"encoding/json"
	"github.com/Ivinco/tenis.git/internal/helpers/filewriter"
	"github.com/Ivinco/tenis.git/internal/lib/sl"
	"github.com/go-chi/chi/v5/middleware"
	"log/slog"
	"strings"
	"time"
)

type AlertsList struct {
	Update []PreparedAlert `json:"update"`
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

	err := json.Unmarshal(alert, &rawAlerts)
	if err != nil {
		logger.Error("Error during unmarshalling alerts", sl.Err(err))
		return nil, err
	}

	for _, item := range rawAlerts {
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

	alertsToSend := AlertsList{
		Update: alerts,
	}

	data, err := json.MarshalIndent(&alertsToSend, "", "    ")

	fw, err := filewriter.NewFileWriter(filePath)
	if err != nil {
		logger.Error("Error during creating file writer", sl.Err(err))
		return nil, err
	}

	//if err = fw.Write(alert); err != nil {
	//	logger.Error("Can't write alert to file")
	//}

	if err = fw.Write(data); err != nil {
		logger.Error("Can't write alerts to file")
	}
	//for _, alert := range rawAlerts {
	//	result, err := json.MarshalIndent(alert, "", "    ")
	//	if err != nil {
	//		logger.Warn("Can't marshal alert", slog.String("alert", alert.FingerPrint))
	//	} else {
	//		if err := fw.Write(result); err != nil {
	//			logger.Error("Can't write alert to file", slog.String("alert", alert.FingerPrint))
	//		}
	//	}
	//}
	return data, nil
}
