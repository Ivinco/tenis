package filewriter

import (
	"os"
	"sync"
)

type FileWriter struct {
	file     *os.File
	fileName string
	mu       sync.Mutex
}

func NewFileWriter(fileName string) (*FileWriter, error) {
	file, err := os.OpenFile(fileName, os.O_WRONLY|os.O_CREATE|os.O_APPEND, 0666)

	if err != nil {
		return nil, err
	}

	return &FileWriter{
		file: file,
	}, nil
}

func (w *FileWriter) Write(object []byte) error {
	w.mu.Lock()
	defer w.mu.Unlock()

	alert := append(object, '\n')
	if _, err := w.file.Write(alert); err != nil {
		return err
	}
	return nil
}
