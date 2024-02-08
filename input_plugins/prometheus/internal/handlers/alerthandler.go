package handlers

import (
	"github.com/Ivinco/tenis.git/internal/helpers/alertprocessor"
	"github.com/Ivinco/tenis.git/internal/helpers/alertsender"
	"github.com/Ivinco/tenis.git/internal/helpers/alertwriter"
	"github.com/Ivinco/tenis.git/internal/lib/sl"
	"github.com/go-chi/chi/v5/middleware"
	"io"
	"log/slog"
	"net/http"
)

type Response struct {
	Status string `json:"status"`
	Error  string `json:"error,omitempty"`
}

func AlertHandler(log *slog.Logger, filePath string, project string, serverUrl string, token string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		const op = "handlers.alert.AlertHandler"

		log = log.With(
			slog.String("op", op),
			slog.String("request_id", middleware.GetReqID(r.Context())),
		)

		body, err := io.ReadAll(r.Body)

		if err != nil {
			log.Error("Can't read body")
		}

		alerts, err := alertprocessor.ProcessAlert(log, r.Context(), filePath, project, body)

		resp, err := alertsender.AlertSender(log, alerts, serverUrl, token)

		if err != nil {
			log.Error("Error during sending alert to backend", sl.Err(err))
			if err = alertwriter.AlertWriter(log, filePath, alerts); err != nil {
				log.Error("Error writing alerts to file")
			}
			log.Info("Saved resolved alerts to temp file", slog.String("file", filePath))
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}

		if resp.StatusCode() != http.StatusOK && resp.StatusCode() != http.StatusBadRequest {
			log.Info("Backend server returned non OK status, ", slog.String("status", resp.Status()))
			if err = alertwriter.AlertWriter(log, filePath, alerts); err != nil {
				log.Error("Error writing alerts to file")
			}
			log.Info("Saved resolved alerts to temp file", slog.String("file", filePath))
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}

		log.Info("Alerts sent to backend", slog.String("status", resp.Status()))
		
		w.WriteHeader(http.StatusOK)
	}
}
