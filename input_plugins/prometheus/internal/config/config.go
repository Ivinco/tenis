package config

import (
	"flag"
	"github.com/ilyakaznacheev/cleanenv"
	"os"
	"time"
)

type ConfFile struct {
	Env        string     `yaml:"env" env-default:"local"`
	PluginId   string     `yaml:"plugin_id" env-required:"true"`
	Server     Server     `yaml:"server" env-required:"true"`
	HttpServer HttpServer `yaml:"httpServer" env-required:"true"`
}

type Server struct {
	Address string `yaml:"address" env-required:"true"`
	Token   string `yaml:"token" env-required:"true"`
}

type HttpServer struct {
	Address        string        `yaml:"address" env-required:"true"`
	Timeout        time.Duration `yaml:"timeout" env-default:"4s"`
	ResendInterval time.Duration `yaml:"resendInterval" env-default:"1m"`
	IdleTimeout    time.Duration `yaml:"idleTimeout" env-default:"60s"`
	FilePath       string        `yaml:"filePath" env-required:"true"`
	User           string        `yaml:"user" env-required:"true"`
	Password       string        `yaml:"password" env-required:"true" env:"CLIENT_PASSWORD"`
	Project        string        `yaml:"project"`
}

func MustLoad() *ConfFile {
	var cfg ConfFile

	path := fetchConfigPath()

	if path == "" {

		panic("Path to config file is not provided")
	}
	if _, err := os.Stat(path); os.IsNotExist(err) {

		panic("Config file is not exist")
	}
	if err := cleanenv.ReadConfig(path, &cfg); err != nil {
		panic("Error during reading config file")
	}

	token := fetchToken()

	if token != "" {
		cfg.Server.Token = token
	}

	return &cfg
}

func fetchConfigPath() string {
	var path string

	flag.StringVar(&path, "config", "", "Path to config file")
	flag.Parse()

	if path == "" {
		path = os.Getenv("CONFIG_FILE")
	}

	return path
}

func fetchToken() string {
	var token string

	flag.StringVar(&token, "token", "", "Server token")
	flag.Parse()

	if token == "" {
		token = os.Getenv("TOKEN")
	}
	return token
}
