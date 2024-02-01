package main

import (
	"github.com/Ivinco/tenis.git/internal/config"
	"github.com/Ivinco/tenis.git/internal/handlers"
	logger2 "github.com/Ivinco/tenis.git/internal/logger"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"log/slog"
	"net/http"
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

		r.Post("/v2/alerts", handlers.AlertHandler(logger, cfg.HttpServer.FilePath, cfg.HttpServer.Project))
	})

	logger.Info("Starting server", slog.String("address", cfg.HttpServer.Address))

	srv := &http.Server{
		Addr:         cfg.HttpServer.Address,
		Handler:      router,
		ReadTimeout:  cfg.HttpServer.Timeout,
		WriteTimeout: cfg.HttpServer.Timeout,
		IdleTimeout:  cfg.HttpServer.IdleTimeout,
	}

	if err := srv.ListenAndServe(); err != nil {
		logger.Error("Failed to start server")
	}

	logger.Error("Server stopped")

}
