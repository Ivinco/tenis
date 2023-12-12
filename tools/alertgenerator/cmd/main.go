package main

import (
	"alertgenerator/internal/alertcreator"
	"alertgenerator/internal/configs"
	"alertgenerator/internal/filewriter"
	"encoding/json"
	"fmt"
	"log"
)

func main() {
	configs.GetRunParams()

	fmt.Printf("Starting to generate %d alerts, %d hostname groups and %d alert name groups\n",
		configs.RunParams.UngroupedAlerts,
		configs.RunParams.HostnameGroups,
		configs.RunParams.AlertNameGroups)

	alerts, er := alertcreator.CreateAlerts(&configs.RunParams)
	if er != nil {
		log.Fatal("Can't generate alerts")
	}

	fmt.Printf("Successfully generated %d alerts\n", len(alerts.Alerts))
	if !configs.RunParams.NoFileMode() {
		writer, err := filewriter.NewFileWriter(configs.RunParams.FilePath)
		if err != nil {
			log.Fatal("Can't create file writer")
		}

		if err = writer.Write(alerts); err != nil {
			log.Fatal("Error during writing to file")
		}
		fmt.Printf("Successfully saved alerts to %s\n", configs.RunParams.FilePath)
	} else {
		data, err := json.MarshalIndent(alerts, "", "\t")
		if err != nil {
			log.Fatalln("Error during marshalling alerts")
		}
		fmt.Printf("Generated alerts: \n")
		fmt.Print(string(data))
	}

}
