package alertsender

import (
	"github.com/Ivinco/tenis.git/internal/lib/sl"
	"github.com/go-resty/resty/v2"
	"log/slog"
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

	return resp, nil
}
