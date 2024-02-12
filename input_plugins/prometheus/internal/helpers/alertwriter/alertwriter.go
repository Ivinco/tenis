package alertwriter

import (
	"encoding/json"
	"github.com/Ivinco/tenis.git/internal/helpers/alertprocessor"
	"github.com/Ivinco/tenis.git/internal/helpers/filewriter"
	"github.com/Ivinco/tenis.git/internal/lib/sl"
	"log/slog"
)

func AlertWriter(logger *slog.Logger, filePath string, data []byte) error {
	const op = "helpers/alertwriter/AlertWriter"
	logger.With(
		slog.String("op", op),
	)

	alerts := alertprocessor.AlertsList{}

	if err := json.Unmarshal(data, &alerts); err != nil {
		logger.Error("Error unmarshalling alerts", sl.Err(err))
		return err
	}

	if len(alerts.Resolve) > 0 {
		fw, err := filewriter.NewFileWriter(filePath)
		if err != nil {
			logger.Error("Error creating File writer", sl.Err(err))
			return err
		}

		for _, alert := range alerts.Resolve {
			data, err := json.Marshal(alerts)
			if err != nil {
				logger.Error("Error marshalling alerts", sl.Err(err), slog.Any("alert", alert))
				continue
			}

			if err = fw.Write(data); err != nil {
				logger.Error("Error writing alert to file", sl.Err(err), slog.Any("alert", alert))
				continue
			}
		}
	}

	return nil
}
