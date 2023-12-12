package configs

import "flag"

type Params struct {
	UngroupedAlerts int
	HostnameGroups  int
	AlertNameGroups int
	FilePath        string
	GroupedAlerts   int
}

var RunParams Params

func GetRunParams() {
	flag.IntVar(&RunParams.UngroupedAlerts, "a", 10, "Number of ungrouped alerts")
	flag.IntVar(&RunParams.HostnameGroups, "hg", 0, "Number of hostname groups")
	flag.IntVar(&RunParams.AlertNameGroups, "ag", 0, "Number of alert name groups")
	flag.StringVar(&RunParams.FilePath, "f", "", "Path to file")
	flag.IntVar(&RunParams.GroupedAlerts, "g", 4, "number of alerts in group")
	flag.Parse()
}

func (p *Params) NoFileMode() bool {
	return p.FilePath == ""
}
