package main

import (
	"github.com/Ivinco/tenis.git/internal/config"
	"github.com/Ivinco/tenis.git/internal/handlers"
	logger2 "github.com/Ivinco/tenis.git/internal/logger"
	"github.com/Ivinco/tenis.git/internal/tickers"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"log"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
)

func main() {
	cfg := config.MustLoad()
	logger := logger2.NewLogger(cfg.Env)

	logger.Info("Starting Prometheus Input Plugin", slog.String("env", cfg.Env))

	router := chi.NewRouter()

	router.Use(middleware.RequestID)
	router.Use(middleware.Recoverer)

	router.Route("/api", func(r chi.Router) {
		r.Use(middleware.BasicAuth("prometheusplugin", map[string]string{
			cfg.HttpServer.User: cfg.HttpServer.Password,
		}))

		r.Post("/v2/alerts", handlers.AlertHandler(logger, cfg.HttpServer.FilePath, cfg.HttpServer.Project, cfg.Server.Address, cfg.Server.Token))
	})

	logger.Info("Starting server", slog.String("address", cfg.HttpServer.Address))

	srv := &http.Server{
		Addr:         cfg.HttpServer.Address,
		Handler:      router,
		ReadTimeout:  cfg.HttpServer.Timeout,
		WriteTimeout: cfg.HttpServer.Timeout,
		IdleTimeout:  cfg.HttpServer.IdleTimeout,
	}

	tickers.SendSavedAlerts(logger, cfg.Server.Address, cfg.Server.Token, cfg.HttpServer.FilePath, cfg.HttpServer.ResendInterval)

	shtdwnSig := make(chan os.Signal, 1)

	signal.Notify(shtdwnSig, os.Interrupt, syscall.SIGTERM)

	go func() {
		if err := srv.ListenAndServe(); err != nil {
			log.Fatalln("Failed to start server")
		}
	}()

	<-shtdwnSig

	logger.Info("Server stopped")

}
