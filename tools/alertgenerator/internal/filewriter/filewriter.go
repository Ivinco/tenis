package filewriter

import (
	"encoding/json"
	"github.com/Ivinco/tenis.git/internal/alertcreator"
	"os"
)

type FileWriter struct {
	filename string
}

func NewFileWriter(filename string) (*FileWriter, error) {
	file, err := os.OpenFile(filename, os.O_WRONLY|os.O_CREATE, 0666)
	if err != nil {
		return nil, err
	}
	defer file.Close()
	return &FileWriter{
		filename: filename,
	}, nil
}

func (w *FileWriter) Write(alerts alertcreator.AlertList) error {
	data, err := json.MarshalIndent(alerts, " ", "    ")
	if err != nil {
		return err
	}
	if err = os.WriteFile(w.filename, data, 0666); err != nil {
		return err
	}
	return nil
}
