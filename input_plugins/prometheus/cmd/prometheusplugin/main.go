package main

import (
	"github.com/Ivinco/tenis.git/internal/config"
	logger2 "github.com/Ivinco/tenis.git/internal/logger"
	"log/slog"
)

func main() {
	cfg := config.MustLoad()
	logger := logger2.NewLogger(cfg.Env)

	logger.Info("Starting Prometheus Input Plugin", slog.String("env", cfg.Env))

	//TODO: init router

	//TODO: create endpoint

}
