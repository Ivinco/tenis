package filereader

import (
	"bufio"
	"bytes"
	"encoding/json"
	"github.com/Ivinco/tenis.git/internal/helpers/alertprocessor"
	"github.com/Ivinco/tenis.git/internal/lib/sl"
	"log/slog"
	"os"
)

type FileReader struct {
	filename string
	scanner  *bufio.Scanner
}

type ResolvedAlerts struct {
	Resolve []alertprocessor.ResolvedAlert
}

func NewFileReader(logger slog.Logger, filename string) (*FileReader, error) {
	const op = "helpers/filereader/NewFileReader"
	logger.With(
		slog.String("op", op),
	)

	file, err := os.OpenFile(filename, os.O_RDONLY, 0666)
	if err != nil {
		if os.IsNotExist(err) {
			logger.Info("No saved alerts. Nothing to do", slog.String("file", filename))
			return nil, err
		} else {
			logger.Error("Error creating File reader", sl.Err(err))
			return nil, err
		}
	}
	defer file.Close()
	return &FileReader{
		filename: filename,
		scanner:  bufio.NewScanner(file),
	}, nil
}

func (r *FileReader) ReadFile(logger slog.Logger) ([]alertprocessor.ResolvedAlert, error) {
	const op = "helpers/filereader/Readfile"
	logger.With(
		slog.String("op", op))

	data, err := os.ReadFile(r.filename)
	if err != nil {
		logger.Error("Error reading file ", slog.String("file", r.filename))
		return nil, err
	}

	var alerts []alertprocessor.ResolvedAlert

	lines := bytes.Split(data, []byte("\n"))
	for _, line := range lines {
		if len(line) == 0 {
			continue
		}
		resolveAlerts := ResolvedAlerts{}
		if err = json.Unmarshal(line, &resolveAlerts); err != nil {
			logger.Error("Error unmarshalling alert", slog.Any("alert", string(line)))
			continue
		}
		for _, alert := range resolveAlerts.Resolve {
			alerts = append(alerts, alert)
		}
	}

	return alerts, nil
}
