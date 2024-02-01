package handlers

import (
	"github.com/Ivinco/tenis.git/internal/helpers/alertprocessor"
	"github.com/go-chi/chi/v5/middleware"
	"io"
	"log/slog"
	"net/http"
)

type Response struct {
	Status string `json:"status"`
	Error  string `json:"error,omitempty"`
}

func AlertHandler(log *slog.Logger, filePath string, project string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		const op = "handlers.alert.AlertHandler"

		log = log.With(
			slog.String("op", op),
			slog.String("request_id", middleware.GetReqID(r.Context())),
		)

		body, err := io.ReadAll(r.Body)

		if err != nil {
			log.Error("Can't read body")
		}

		err = alertprocessor.ProcessAlert(log, r.Context(), filePath, project, body)

		if err != nil {
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}

		log.Info("Request body:", slog.Any("request", string(body)))

		//var req http.Response
		//
		//err := render.DecodeJSON(r.Body, &req)
		//if err != nil {
		//	log.Error("failed to decode request body")
		//	return
		//}

		//log.Info("request body decoded", slog.Any("request", req))
		w.WriteHeader(http.StatusOK)
	}
}
