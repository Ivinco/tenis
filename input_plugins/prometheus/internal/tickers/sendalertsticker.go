package tickers

import (
	"encoding/json"
	"github.com/Ivinco/tenis.git/internal/helpers/alertprocessor"
	"github.com/Ivinco/tenis.git/internal/helpers/alertsender"
	"github.com/Ivinco/tenis.git/internal/helpers/filereader"
	"github.com/Ivinco/tenis.git/internal/lib/sl"
	"log/slog"
	"net/http"
	"os"
	"time"
)

type AlertReader interface {
	ReadFile(slog.Logger) ([]alertprocessor.ResolvedAlert, error)
}

func SendSavedAlerts(logger *slog.Logger, server string, token string, filePath string, interval time.Duration) {
	resendTicker := time.NewTicker(interval)

	go func() {
		for {
			select {
			case <-resendTicker.C:
				alertsToSend := alertprocessor.AlertsList{}
				newAlertReader, err := filereader.NewFileReader(*logger, filePath)
				if err != nil {
					continue
				}
				resolvedAlerts, err := newAlertReader.ReadFile(*logger)
				alertsToSend.Resolve = resolvedAlerts

				data, err := json.Marshal(alertsToSend)
				if err != nil {
					logger.Error("Error marshaling alerts", sl.Err(err))
				}

				response, err := alertsender.AlertSender(logger, data, server, token)
				if err != nil {
					logger.Error("Error to send saved alerts", sl.Err(err))
					continue
				}
				if response.StatusCode() != http.StatusOK {
					logger.Error("Error: Backend returned non OK status", slog.Int("status code", response.StatusCode()))
					continue
				}

				if err = os.Remove(filePath); err != nil {
					logger.Error("Error deleting temp file")
				}
				logger.Info("All alerts from tmp file are sent", slog.Int("status code", response.StatusCode()))
			}
		}
	}()
}
