package alertsender

import (
	"github.com/Ivinco/tenis.git/internal/lib/sl"
	"github.com/go-resty/resty/v2"
	"log/slog"
	"net/http"
)

func AlertSender(logger *slog.Logger, alerts []byte, server string, token string) (*resty.Response, error) {
	sender := resty.New().
		SetHeader("X-Tenis-Token", token).
		SetHeader("Content-Type", "application/json")

	resp, err := sender.R().SetBody(alerts).Post(server)

	if err != nil {
		logger.Error("Error during sending alerts to server", sl.Err(err))
		return nil, err
	}

	if resp.StatusCode() == http.StatusBadRequest {
		logger.Warn("Got 400 response status code", slog.String("response", resp.String()), slog.Int("code", resp.StatusCode()))
	}

	return resp, nil
}
