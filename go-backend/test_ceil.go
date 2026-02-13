package main

import (
	"fmt"
	"math"
)

func main() {
	hours := 5.0
	hoursRounded := math.Ceil(hours)
	fmt.Printf("hours=%.6f, hoursRounded=%.6f\n", hours, hoursRounded)
}
