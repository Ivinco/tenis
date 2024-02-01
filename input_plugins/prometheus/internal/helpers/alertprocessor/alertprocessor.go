package alertprocessor

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/Ivinco/tenis.git/internal/lib/sl"
	"github.com/go-chi/chi/v5/middleware"
	"log/slog"
	"time"
)

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

func ProcessAlert(logger *slog.Logger, ctx context.Context, filePath string, project string, alert []byte) error {
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
		return err
	}

	for _, item := range rawAlerts {
		var alert PreparedAlert
		alert.Project = project
		if item.Labels.instance {
			alert.Host = item.Labels.instance
		} else {
			alert.Host = "Undefined"
		}
		if item.Labels.alertname {
			alert.Name = item.Labels.alertname
		} else {
			alert.Name = "Undefined"
		}
		alert.Fired = item.StartsAt.Unix()
		if item.Labels.severity {
			alert.Severity = item.Labels.severity
		} else {
			alert.Severity = "UNKNOWN"
		}
		if item.Annotations.description {
			alert.Msg = item.Annotations.description
		} else {
			alert.Msg = "UNDEFINED"
		}
		alert.User = ""
		alert.Comment = ""
		alert.Scheduled = false
		alert.CustomFields = item.Labels

		alerts = append(alerts, alert)
	}

	fmt.Println(alerts)

	//fw, err := filewriter.NewFileWriter(filePath)
	//if err != nil {
	//	logger.Error("Error during creating file writer", sl.Err(err))
	//	return err
	//}
	//
	//if err := fw.Write(alert); err != nil {
	//	logger.Error("Can't write alert to file")
	//}
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
	return nil
}
