import numpy as np
import matplotlib.pyplot as plt
from collections import defaultdict
from datamanip import get_piecewise_constants_per_year

START_YEAR = 2001
event_rates = get_piecewise_constants_per_year()

plt.figure(figsize=(10, 6))

# Iterate through each event (str key) and its corresponding rates (list[np.float64])
for event_name, rates in event_rates.items():
    print(f"event name: {event_name} | rates: {rates}")
    
    # Generate X-axis coordinates: time starts at 2001, incrementing for each rate point
    years = [START_YEAR + i for i in range(len(rates))]
    
    # Plot the scatter for the current event
    plt.scatter(years, rates, label=event_name)

# Customize the plot for clarity
plt.xlabel("Time (Years)")
plt.ylabel("Rate (events/year)")
plt.title("KMC Dynamic Rates Over Time (Focused View)")

# Set strict Y-axis boundaries to filter out outliers
plt.ylim(0, 0.00035)

# Place the legend cleanly outside so it doesn't overlap data points
plt.legend(title="Events", bbox_to_anchor=(1.02, 1), loc='upper left')

plt.grid(True, linestyle='--', alpha=0.6)

# Save the final figure (bbox_inches='tight' prevents the legend from getting cut off)
plt.savefig("../data/outputs/rate_vs_time_non_ag.png", bbox_inches='tight')
