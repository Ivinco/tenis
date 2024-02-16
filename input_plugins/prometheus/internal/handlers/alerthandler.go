package handlers

import (
	"encoding/json"
	"github.com/Ivinco/tenis.git/internal/helpers/alertprocessor"
	"github.com/Ivinco/tenis.git/internal/helpers/alertsender"
	"github.com/Ivinco/tenis.git/internal/helpers/alertwriter"
	"github.com/Ivinco/tenis.git/internal/lib/sl"
	"github.com/go-chi/chi/v5/middleware"
	"io"
	"log/slog"
	"net/http"
)

func AlertHandler(logger *slog.Logger, filePath string, project string, serverUrl string, token string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		const op = "handlers.alert.AlertHandler"
		batchSize := 5000

		logger = logger.With(
			slog.String("op", op),
			slog.String("request_id", middleware.GetReqID(r.Context())),
		)

		body, err := io.ReadAll(r.Body)

		if err != nil {
			logger.Error("Can't read body")
		}

		var rawAlerts []alertprocessor.RawAlert

		if err = json.Unmarshal(body, &rawAlerts); err != nil {
			logger.Error("Error unmarshalling request data", sl.Err(err))
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}

		if len(rawAlerts) > batchSize {
			var alertChunks [][]alertprocessor.RawAlert
			for i := 0; i < len(rawAlerts); i += batchSize {
				end := i + batchSize
				if end > len(rawAlerts) {
					end = len(rawAlerts)
				}
				alertChunks = append(alertChunks, rawAlerts[i:end])
			}
			for _, chunk := range alertChunks {
				alerts, err := alertprocessor.ProcessAlert(logger, r.Context(), project, chunk)
				if err != nil {
					logger.Error("Error processing alerts chunk", sl.Err(err))
					http.Error(w, "Internal Server Error", http.StatusInternalServerError)
					return
				}
				resp, err := alertsender.AlertSender(logger, alerts, serverUrl, token)
				if err != nil {
					logger.Error("Error during sending alert to backend", sl.Err(err))
					if err = alertwriter.AlertWriter(logger, filePath, alerts); err != nil {
						logger.Error("Error writing alerts to file")
					}
					logger.Info("Saved resolved alerts to temp file", slog.String("file", filePath))
					http.Error(w, "Internal Server Error", http.StatusInternalServerError)
					return
				}
				if resp.StatusCode() != http.StatusOK && resp.StatusCode() != http.StatusBadRequest {
					logger.Info("Backend server returned non OK status, ", slog.String("status", resp.Status()))
					if err = alertwriter.AlertWriter(logger, filePath, alerts); err != nil {
						logger.Error("Error writing alerts to file")
					}
					logger.Info("Saved resolved alerts to temp file", slog.String("file", filePath))
					http.Error(w, "Internal Server Error", http.StatusInternalServerError)
					return
				}
			}
		}

		alerts, err := alertprocessor.ProcessAlert(logger, r.Context(), project, rawAlerts)

		resp, err := alertsender.AlertSender(logger, alerts, serverUrl, token)

		if err != nil {

			logger.Error("Error during sending alert to backend", sl.Err(err))
			if err = alertwriter.AlertWriter(logger, filePath, alerts); err != nil {
				logger.Error("Error writing alerts to file")
			}
			logger.Info("Saved resolved alerts to temp file", slog.String("file", filePath))
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}

		if resp.StatusCode() != http.StatusOK && resp.StatusCode() != http.StatusBadRequest {
			logger.Info("Backend server returned non OK status, ", slog.String("status", resp.Status()))
			if err = alertwriter.AlertWriter(logger, filePath, alerts); err != nil {
				logger.Error("Error writing alerts to file")
			}
			logger.Info("Saved resolved alerts to temp file", slog.String("file", filePath))
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}

		logger.Info("Alerts sent to backend", slog.String("status", resp.Status()))

		w.WriteHeader(http.StatusOK)
	}
}
